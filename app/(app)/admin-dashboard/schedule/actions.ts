"use server";

import { and, asc, eq, gte, ilike, inArray, lte, ne, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { activityTypes, classSchedules, rooms, terms } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { ADMIN_ROLES } from "@/lib/session";
import { formatTime } from "../../booking/rules";
import {
  WEEK_COLUMNS,
  findClash,
  validateClassFields,
  validateTermFields,
  type ClassPayload,
  type ScheduleResult,
  type TermChanges,
} from "./types";

const fail = (error: string): ScheduleResult => ({ ok: false, error });
const isId = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v > 0 && v < 2_147_483_647;
const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

const dayLabel = (iso: number) => WEEK_COLUMNS.find((d) => d.iso === iso)?.label ?? "That day";
const MAX_CLASSES_PER_SAVE = 500;

async function classActivityTypeId(): Promise<number | null> {
  const [preferred] = await db
    .select({ id: activityTypes.activityTypeId })
    .from(activityTypes)
    .where(or(ilike(activityTypes.name, "academic%"), ilike(activityTypes.name, "%class%")))
    .orderBy(asc(activityTypes.activityTypeId))
    .limit(1);
  if (preferred) return preferred.id;
  const [any] = await db.select({ id: activityTypes.activityTypeId }).from(activityTypes).orderBy(asc(activityTypes.activityTypeId)).limit(1);
  return any?.id ?? null;
}

async function termsOverlapping(startDate: string, endDate: string, exceptId?: number) {
  const rows = await db
    .select({ id: terms.termId, name: terms.name })
    .from(terms)
    .where(
      and(
        lte(terms.startDate, endDate),
        gte(terms.endDate, startDate),
        exceptId ? ne(terms.termId, exceptId) : undefined,
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function createTerm(rawName: unknown, rawStart: unknown, rawEnd: unknown): Promise<ScheduleResult> {
  await requireRole(...ADMIN_ROLES);
  const name = str(rawName, 200).trim();
  const startDate = str(rawStart, 10);
  const endDate = str(rawEnd, 10);

  const problem = validateTermFields(name, startDate, endDate);
  if (problem) return fail(problem);

  const clash = await termsOverlapping(startDate, endDate);
  if (clash) return fail(`These dates overlap with "${clash.name}". Terms can't overlap.`);

  const [row] = await db.insert(terms).values({ name, startDate, endDate }).returning({ id: terms.termId });
  revalidatePath("/admin-dashboard");
  return { ok: true, id: row.id };
}

export async function deleteTerm(rawId: unknown): Promise<ScheduleResult> {
  await requireRole(...ADMIN_ROLES);
  if (!isId(rawId)) return fail("Invalid term.");
  await db.delete(terms).where(eq(terms.termId, rawId)); // class schedules cascade
  revalidatePath("/admin-dashboard");
  return { ok: true };
}

class SaveError extends Error {}

export async function saveTermChanges(raw: TermChanges): Promise<ScheduleResult> {
  await requireRole(...ADMIN_ROLES);

  if (!isId(raw?.termId)) return fail("Invalid term.");
  const termId = raw.termId;
  const name = str(raw.name, 200).trim();
  const startDate = str(raw.startDate, 10);
  const endDate = str(raw.endDate, 10);

  const termProblem = validateTermFields(name, startDate, endDate);
  if (termProblem) return fail(termProblem);

  const deletedIds = Array.isArray(raw.deletedIds) ? [...new Set(raw.deletedIds)] : [];
  if (!deletedIds.every(isId)) return fail("Invalid class.");

  const rawClasses: unknown[] = Array.isArray(raw.classes) ? raw.classes : [];
  if (rawClasses.length + deletedIds.length > MAX_CLASSES_PER_SAVE) return fail("Too many changes at once. Save in smaller batches.");

  const incoming: (Omit<ClassPayload, "id"> & { id: number; isNew: boolean })[] = [];
  for (const [i, item] of (rawClasses as Partial<ClassPayload>[]).entries()) {
    if (item?.id !== undefined && !isId(item.id)) return fail("Invalid class.");
    const c = {
      roomId: str(item?.roomId, 9),
      dayOfWeek: typeof item?.dayOfWeek === "number" ? item.dayOfWeek : NaN,
      start: str(item?.start, 5),
      end: str(item?.end, 5),
      title: str(item?.title, 200).trim(),
      adviser: str(item?.adviser, 200).trim(),
    };
    const problem = validateClassFields({ ...c, days: [c.dayOfWeek] });
    if (problem) return fail(problem);
    if (!/^[1-9]\d{0,8}$/.test(c.roomId)) return fail("Choose a valid room.");
    // New classes get a unique negative id so they can be told apart in the clash check.
    incoming.push({ ...c, id: item?.id ?? -(i + 1), isNew: item?.id === undefined });
  }

  const [term] = await db.select({ id: terms.termId }).from(terms).where(eq(terms.termId, termId)).limit(1);
  if (!term) return fail("This term no longer exists. Refresh the page.");

  const termClash = await termsOverlapping(startDate, endDate, termId);
  if (termClash) return fail(`These dates overlap with "${termClash.name}". Terms can't overlap.`);

  const roomIds = [...new Set(incoming.map((c) => Number(c.roomId)))];
  const roomRows = roomIds.length
    ? await db.select({ id: rooms.roomId, name: rooms.name }).from(rooms).where(inArray(rooms.roomId, roomIds))
    : [];
  if (roomRows.length !== roomIds.length) return fail("A room used in these changes no longer exists. Refresh the page.");
  const roomName = new Map(roomRows.map((r) => [String(r.id), r.name]));

  const needsActivityType = incoming.some((c) => c.isNew);
  const activityTypeId = needsActivityType ? await classActivityTypeId() : null;
  if (needsActivityType && activityTypeId === null) return fail("No activity types exist yet. Add one in the database first.");

  try {
    await db.transaction(async (tx) => {
      const existing = await tx
        .select({
          id: classSchedules.classId,
          roomId: classSchedules.roomId,
          dayOfWeek: classSchedules.dayOfWeek,
          start: classSchedules.startTime,
          end: classSchedules.endTime,
          title: classSchedules.courseTitle,
        })
        .from(classSchedules)
        .where(eq(classSchedules.termId, termId));
      const existingIds = new Set(existing.map((r) => r.id));

      const edited = incoming.filter((c) => !c.isNew);
      if (edited.some((c) => !existingIds.has(c.id))) {
        throw new SaveError("A class you edited no longer exists. Refresh the page.");
      }

      const gone = new Set([...deletedIds, ...edited.map((c) => c.id)]);
      const final = [
        ...existing
          .filter((r) => !gone.has(r.id))
          .map((r) => ({
            id: r.id,
            roomId: String(r.roomId),
            dayOfWeek: r.dayOfWeek,
            start: r.start.slice(0, 5),
            end: r.end.slice(0, 5),
            title: r.title ?? "",
          })),
        ...incoming,
      ];
      for (const [i, c] of final.entries()) {
        const clash = findClash(final.slice(0, i), c);
        if (clash) {
          throw new SaveError(
            `${dayLabel(c.dayOfWeek)} ${formatTime(c.start)} – ${formatTime(c.end)} in ${roomName.get(c.roomId) ?? "this room"} overlaps with ${clash.title || "another class"}.`,
          );
        }
      }

      await tx.update(terms).set({ name, startDate, endDate }).where(eq(terms.termId, termId));

      if (deletedIds.length) {
        await tx.delete(classSchedules).where(and(eq(classSchedules.termId, termId), inArray(classSchedules.classId, deletedIds)));
      }

      for (const c of edited) {
        await tx
          .update(classSchedules)
          .set({
            roomId: Number(c.roomId),
            dayOfWeek: c.dayOfWeek,
            startTime: c.start,
            endTime: c.end,
            courseTitle: c.title,
            courseAdviser: c.adviser,
          })
          .where(and(eq(classSchedules.classId, c.id), eq(classSchedules.termId, termId)));
      }

      const added = incoming.filter((c) => c.isNew);
      if (added.length) {
        await tx.insert(classSchedules).values(
          added.map((c) => ({
            termId,
            roomId: Number(c.roomId),
            activityTypeId: activityTypeId!,
            dayOfWeek: c.dayOfWeek,
            startTime: c.start,
            endTime: c.end,
            courseTitle: c.title,
            courseAdviser: c.adviser,
          })),
        );
      }
    });
  } catch (err) {
    if (err instanceof SaveError) return fail(err.message);
    throw err;
  }

  revalidatePath("/admin-dashboard");
  return { ok: true };
}
