import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { kindFromRow, MARK_LABEL, type DayMarks } from "./day-marks";

export async function getDayMarks(from: string, to: string): Promise<DayMarks> {
  const res = await db.execute<{
    date: string;
    remarks: string | null;
    description: string;
    is_class_day: boolean;
    allow_booking: boolean;
  }>(sql`
    select to_char(cd.calendar_date, 'YYYY-MM-DD') as date, cd.remarks, dt.description, dt.is_class_day, dt.allow_booking
    from calendar_day cd join day_type dt on dt.day_type_id = cd.day_type_id
    where cd.calendar_date between ${from}::date and ${to}::date`);

  const marks: DayMarks = {};
  for (const r of res.rows) {
    const note = r.remarks?.trim() || null;
    const kind = kindFromRow(r.description, r.is_class_day, r.allow_booking);
    const fixedLabel = kind === "no_classes" || kind === "no_booking";
    marks[r.date] = { kind, label: fixedLabel ? MARK_LABEL[kind] : (note ?? r.description), note: fixedLabel ? null : note };
  }
  return marks;
}
