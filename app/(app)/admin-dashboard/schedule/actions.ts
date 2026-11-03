"use server";

import { and, asc, eq, gt, gte, ilike, lt, lte, ne, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { activityTypes, classSchedules, rooms, terms } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { ADMIN_ROLES } from "@/lib/session";
import { formatTime } from "../../booking/rules";
import { validateClassFields, validateTermFields, type ClassInput, type ScheduleResult } from "./types";

const fail = (error: string): ScheduleResult => ({ ok: false, error });
const isId = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v > 0 && v < 2_147_483_647;
const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

const DAY_LABEL = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

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

export async function updateTermDates(rawId: unknown, rawStart: unknown, rawEnd: unknown): Promise<ScheduleResult> {
  await requireRole(...ADMIN_ROLES);
  if (!isId(rawId)) return fail("Invalid term.");
  const startDate = str(rawStart, 10);
  const endDate = str(rawEnd, 10);

  const [current] = await db.select({ name: terms.name }).from(terms).where(eq(terms.termId, rawId)).limit(1);
  if (!current) return fail("This term no longer exists. Refresh the page.");

  const problem = validateTermFields(current.name || "term", startDate, endDate);
  if (problem) return fail(problem);

  const clash = await termsOverlapping(startDate, endDate, rawId);
  if (clash) return fail(`These dates overlap with "${clash.name}". Terms can't overlap.`);

  await db.update(terms).set({ startDate, endDate }).where(eq(terms.termId, rawId));
  revalidatePath("/admin-dashboard");
  return { ok: true };
}

export async function deleteTerm(rawId: unknown): Promise<ScheduleResult> {
  await requireRole(...ADMIN_ROLES);
  if (!isId(rawId)) return fail("Invalid term.");
  await db.delete(terms).where(eq(terms.termId, rawId)); // class schedules cascade
  revalidatePath("/admin-dashboard");
  return { ok: true };
}

export async function saveClass(raw: ClassInput): Promise<ScheduleResult> {
  await requireRole(...ADMIN_ROLES);

  const input = {
    id: raw?.id,
    termId: raw?.termId,
    roomId: str(raw?.roomId, 9),
    days: Array.isArray(raw?.days) ? [...new Set(raw.days)] : [],
    start: str(raw?.start, 5),
    end: str(raw?.end, 5),
    title: str(raw?.title, 200).trim(),
    adviser: str(raw?.adviser, 200).trim(),
  };

  if (!isId(input.termId)) return fail("Invalid term.");
  if (input.id !== undefined && !isId(input.id)) return fail("Invalid class.");
  const problem = validateClassFields(input);
  if (problem) return fail(problem);

  const roomId = Number(input.roomId);
  if (!/^[1-9]\d{0,8}$/.test(input.roomId)) return fail("Choose a valid room.");

  const [term] = await db.select({ id: terms.termId }).from(terms).where(eq(terms.termId, input.termId)).limit(1);
  if (!term) return fail("This term no longer exists. Refresh the page.");
  const [room] = await db.select({ id: rooms.roomId }).from(rooms).where(eq(rooms.roomId, roomId)).limit(1);
  if (!room) return fail("That room no longer exists. Refresh the page.");

  if (input.id !== undefined && input.days.length !== 1) return fail("Edit one day at a time.");

  const activityTypeId = input.id === undefined ? await classActivityTypeId() : null;
  if (input.id === undefined && activityTypeId === null) return fail("No activity types exist yet. Add one in the database first.");

  try {
    await db.transaction(async (tx) => {
      for (const day of input.days) {
        const [clash] = await tx
          .select({ title: classSchedules.courseTitle, start: classSchedules.startTime, end: classSchedules.endTime })
          .from(classSchedules)
          .where(
            and(
              eq(classSchedules.termId, input.termId),
              eq(classSchedules.roomId, roomId),
              eq(classSchedules.dayOfWeek, day),
              lt(classSchedules.startTime, input.end),
              gt(classSchedules.endTime, input.start),
              input.id !== undefined ? ne(classSchedules.classId, input.id) : undefined,
            ),
          )
          .limit(1);
        if (clash) {
          throw new ClashError(
            `${DAY_LABEL[day]} ${formatTime(clash.start.slice(0, 5))} – ${formatTime(clash.end.slice(0, 5))} is already taken by ${clash.title ?? "another class"} in this room.`,
          );
        }
      }

      if (input.id !== undefined) {
        const updated = await tx
          .update(classSchedules)
          .set({
            roomId,
            dayOfWeek: input.days[0],
            startTime: input.start,
            endTime: input.end,
            courseTitle: input.title,
            courseAdviser: input.adviser,
          })
          .where(and(eq(classSchedules.classId, input.id), eq(classSchedules.termId, input.termId)))
          .returning({ id: classSchedules.classId });
        if (updated.length === 0) throw new ClashError("This class no longer exists. Refresh the page.");
      } else {
        await tx.insert(classSchedules).values(
          input.days.map((day) => ({
            termId: input.termId,
            roomId,
            activityTypeId: activityTypeId!,
            dayOfWeek: day,
            startTime: input.start,
            endTime: input.end,
            courseTitle: input.title,
            courseAdviser: input.adviser,
          })),
        );
      }
    });
  } catch (err) {
    if (err instanceof ClashError) return fail(err.message);
    throw err;
  }

  revalidatePath("/admin-dashboard");
  return { ok: true };
}

class ClashError extends Error {}

export async function deleteClass(rawId: unknown): Promise<ScheduleResult> {
  await requireRole(...ADMIN_ROLES);
  if (!isId(rawId)) return fail("Invalid class.");
  await db.delete(classSchedules).where(eq(classSchedules.classId, rawId));
  revalidatePath("/admin-dashboard");
  return { ok: true };
}
