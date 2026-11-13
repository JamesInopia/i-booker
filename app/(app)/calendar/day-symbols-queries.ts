import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { iconForActivity, type DaySymbols } from "./day-symbols";

/**
 * Distinct activity-type symbols per date: classes (weekly, inside a term, skipping days
 * where classes are cancelled) plus approved bookings. Approved bookings whose activity type has a
 * booking symbol carry its icon (one per icon per day); everything else keeps its coloured dot.
 */
export async function getDaySymbols(from: string, to: string): Promise<DaySymbols> {
  const res = await db.execute<{ date: string; id: number; name: string; color: string | null; activity: string | null }>(sql`
    with days as (
      select d::date as day from generate_series(${from}::date, ${to}::date, interval '1 day') d
    ),
    hits as (
      select days.day, act.symbol_id, null::text as activity
      from days
      join term t on days.day between t.start_date and t.end_date
      join class_schedule cs on cs.term_id = t.term_id and cs.day_of_week = extract(isodow from days.day)
      join activity_type act on act.activity_type_id = cs.activity_type_id
      where not exists (
        select 1 from calendar_day cd join day_type dt on dt.day_type_id = cd.day_type_id
        where cd.calendar_date = days.day and dt.is_class_day = false)
      union
      select rs.date_of_activity, act.symbol_id, act.name as activity
      from reservation_slot rs
      join reservation_request rr on rr.request_id = rs.request_id and rr.status = 'approved'
      join activity_type act on act.activity_type_id = rr.activity_type_id
      where rs.date_of_activity between ${from}::date and ${to}::date
    )
    select to_char(h.day, 'YYYY-MM-DD') as date, s.symbol_id as id, s.name, s.color, h.activity
    from hits h join symbol s on s.symbol_id = h.symbol_id
    order by h.day, s.symbol_id, h.activity`);

  const out: DaySymbols = {};
  const seen = new Set<string>();
  for (const r of res.rows) {
    const icon = iconForActivity(r.activity);
    const key = `${r.date}|${icon ?? `dot-${r.id}`}`;
    if (seen.has(key)) continue;
    seen.add(key);
    (out[r.date] ??= []).push({
      id: r.id,
      name: icon && r.activity ? r.activity : r.name,
      color: r.color ?? "#9ca3af",
      icon,
    });
  }
  return out;
}
