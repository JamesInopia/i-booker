import "server-only";
import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { classSchedules, terms } from "@/db/schema";
import { addDays } from "../../calendar/dates";
import type { ClassRow, TermRow, WeekClass } from "./types";

/**
 * Classes that actually occur in the week starting on `sunday`, resolved to calendar dates.
 * A class row repeats weekly (day_of_week, ISO 1=Mon..7=Sun) for every date inside its term.
 */
export async function listWeekClasses(sunday: string): Promise<WeekClass[]> {
  const saturday = addDays(sunday, 6);
  const rows = await db
    .select({
      id: classSchedules.classId,
      roomId: classSchedules.roomId,
      dayOfWeek: classSchedules.dayOfWeek,
      start: classSchedules.startTime,
      end: classSchedules.endTime,
      title: classSchedules.courseTitle,
      adviser: classSchedules.courseAdviser,
      termStart: terms.startDate,
      termEnd: terms.endDate,
    })
    .from(classSchedules)
    .innerJoin(terms, eq(terms.termId, classSchedules.termId))
    .where(and(lte(terms.startDate, saturday), gte(terms.endDate, sunday)))
    .orderBy(asc(classSchedules.startTime));

  const out: WeekClass[] = [];
  for (const r of rows) {
    const date = addDays(sunday, r.dayOfWeek % 7); // ISO 7 (Sunday) -> offset 0
    if (date < r.termStart || date > r.termEnd) continue;
    out.push({
      id: r.id,
      roomId: String(r.roomId),
      date,
      start: r.start.slice(0, 5),
      end: r.end.slice(0, 5),
      title: r.title ?? "",
      adviser: r.adviser ?? "",
    });
  }
  return out;
}

export async function listTerms(): Promise<TermRow[]> {
  const rows = await db
    .select({ id: terms.termId, name: terms.name, startDate: terms.startDate, endDate: terms.endDate })
    .from(terms)
    .orderBy(desc(terms.startDate), desc(terms.termId));
  return rows;
}

export async function listClasses(termId: number): Promise<ClassRow[]> {
  const rows = await db
    .select()
    .from(classSchedules)
    .where(eq(classSchedules.termId, termId))
    .orderBy(asc(classSchedules.dayOfWeek), asc(classSchedules.startTime));
  return rows.map((r) => ({
    id: r.classId,
    termId: r.termId,
    roomId: String(r.roomId),
    dayOfWeek: r.dayOfWeek,
    start: r.startTime.slice(0, 5),
    end: r.endTime.slice(0, 5),
    title: r.courseTitle ?? "",
    adviser: r.courseAdviser ?? "",
  }));
}
