import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { addDays } from "./dates";
import { kindFromRow, MARK_LABEL, type DayMarks } from "./day-marks";
import { fixedHolidayName } from "./fixed-holidays";

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

  // Fixed yearly holidays always show as a holiday. An admin-set holiday keeps its own name;
  // any other mark on that date is replaced.
  for (let day = from; day <= to; day = addDays(day, 1)) {
    const name = fixedHolidayName(day);
    if (name && marks[day]?.kind !== "holiday") marks[day] = { kind: "holiday", label: name, note: name };
  }
  return marks;
}
