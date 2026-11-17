import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { isId, manilaNow } from "../booking/rules";
import { fixedHolidayName } from "./fixed-holidays";
import { classifyDay, type DayAvailabilities, type DayAvailability } from "./day-availability";

/**
 * Availability for every date in [from, to]. Weekly classes (inside a term, skipping days where
 * classes are cancelled) and approved bookings count as busy; each day is classified by which of
 * the four booking blocks are still free.
 *
 * With a roomId it is that room (booking step). Without one it is every bookable room together
 * (admin calendar): a day is "available" if any room has a free daytime block, and "evening" if
 * the only free blocks across all rooms are 6:00 PM – 9:30 PM.
 */
export async function getDayAvailability(from: string, to: string, roomId?: string): Promise<DayAvailabilities> {
  if (roomId !== undefined && !isId(roomId)) return {};
  const only = roomId === undefined ? null : Number(roomId);

  const [roomRes, busyRes] = await Promise.all([
    db.execute<{ room_id: number }>(sql`
      select room_id from room where status = 'available' and (${only}::int is null or room_id = ${only}::int)`),
    db.execute<{ date: string; room_id: number; start: string; end: string; is_class: boolean }>(sql`
      with days as (
        select d::date as day from generate_series(${from}::date, ${to}::date, interval '1 day') d
      )
      select to_char(days.day, 'YYYY-MM-DD') as date, cs.room_id, cs.start_time as start, cs.end_time as "end", true as is_class
      from days
      join term t on days.day between t.start_date and t.end_date
      join class_schedule cs on cs.term_id = t.term_id and cs.day_of_week = extract(isodow from days.day)
      where (${only}::int is null or cs.room_id = ${only}::int)
        and not exists (
          select 1 from calendar_day cd join day_type dt on dt.day_type_id = cd.day_type_id
          where cd.calendar_date = days.day and dt.is_class_day = false)
      union all
      select to_char(rs.date_of_activity, 'YYYY-MM-DD'), rsr.room_id, rs.start_time, rs.end_time, false
      from reservation_slot rs
      join reservation_request rr on rr.request_id = rs.request_id and rr.status = 'approved'
      join reservation_slot_room rsr on rsr.slot_id = rs.slot_id
      where rs.date_of_activity between ${from}::date and ${to}::date
        and (${only}::int is null or rsr.room_id = ${only}::int)`),
  ]);

  const busy = new Map<string, { start: string; end: string }[]>(); // key: date|room
  for (const r of busyRes.rows) {
    if (r.is_class && fixedHolidayName(r.date)) continue; // no classes on fixed holidays
    const key = `${r.date}|${r.room_id}`;
    const list = busy.get(key) ?? [];
    list.push({ start: r.start.slice(0, 5), end: r.end.slice(0, 5) });
    busy.set(key, list);
  }

  const now = manilaNow();
  const out: DayAvailabilities = {};
  for (let d = new Date(`${from}T00:00:00Z`); d <= new Date(`${to}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1)) {
    const date = d.toISOString().slice(0, 10);
    if (date < now.date) continue; // nothing to book in the past
    let best: DayAvailability | null = null;
    for (const room of roomRes.rows) {
      const status = classifyDay(busy.get(`${date}|${room.room_id}`) ?? [], now, date);
      if (status === "available") {
        best = "available";
        break;
      }
      if (status === "evening") best = "evening";
    }
    if (best) out[date] = best;
  }
  return out;
}
