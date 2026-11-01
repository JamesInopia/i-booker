import Link from "next/link";
import type { RoomListing } from "../booking/rules";
import { DayNumber, MonthGrid, TODAY_FILL } from "../calendar/calendar-parts";
import {
  DAY_NAMES,
  addDays,
  addMonths,
  monthKey,
  shortMonthDay,
  startOfWeek,
  todayISO,
  weekDays,
  weekOfMonth,
  weekRangeLabel,
} from "../calendar/dates";
import { MonthPicker } from "../calendar/month-picker";

const TIME_SLOTS = ["730 - 1100", "1100 - 1430", "1430 - 1800", "1800 - 2130"] as const;

const href = (query: Record<string, string>) => ({ pathname: "/admin-dashboard", query: { tab: "timeline", ...query } });

const navLink = "px-2 py-1 hover:underline";

export function CalendarView({ month }: { month: string }) {
  const today = todayISO();

  return (
    <div className="overflow-hidden rounded-lg bg-container shadow-sm">
      <div className="flex items-center justify-between bg-accent-1 px-3 py-2 text-white">
        <Link href={href({ view: "a", month: monthKey(addMonths(month, -1)) })} aria-label="Previous month" className={navLink}>
          ‹
        </Link>
        <MonthPicker month={month} linkTo={{ pathname: "/admin-dashboard", query: { tab: "timeline", view: "a" } }} />
        <Link href={href({ view: "a", month: monthKey(addMonths(month, 1)) })} aria-label="Next month" className={navLink}>
          ›
        </Link>
      </div>
      <MonthGrid
        month={month}
        today={today}
        renderDay={(day, className, { isToday }) => (
          <Link
            href={href({ view: "b", week: startOfWeek(day) })}
            aria-label={`Open week of ${day}`}
            aria-current={isToday ? "date" : undefined}
            className={className}
          >
            <DayNumber day={day} />
          </Link>
        )}
      />
    </div>
  );
}

export function TimetableView({ sunday, rooms }: { sunday: string; rooms: RoomListing[] }) {
  const today = todayISO();
  const days = weekDays(sunday);
  const midWeek = addDays(sunday, 3);

  return (
    <div className="overflow-hidden rounded-lg bg-container shadow-sm">
      <div className="flex items-center justify-between bg-accent-1 px-3 py-2 text-sm font-semibold text-white">
        <Link href={href({ view: "a", month: monthKey(midWeek) })} className={navLink}>
          ‹ Calendar
        </Link>
        <div className="flex items-center gap-2">
          <Link href={href({ view: "b", week: addDays(sunday, -7) })} aria-label="Previous week" className={navLink}>
            ‹
          </Link>
          <span>
            {weekRangeLabel(sunday)} | Week {weekOfMonth(sunday)}
          </span>
          <Link href={href({ view: "b", week: addDays(sunday, 7) })} aria-label="Next week" className={navLink}>
            ›
          </Link>
        </div>
        <span aria-hidden className="w-16" />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[56rem] table-fixed border-collapse text-center text-xs">
          <thead>
            <tr className="bg-blue-100">
              <th className="w-28 border border-neutral-300 p-1">ROOM</th>
              <th className="w-24 border border-neutral-300 p-1">TIME</th>
              {days.map((day, i) => (
                <th
                  key={day}
                  className={`border border-neutral-300 p-1 ${day === today ? TODAY_FILL : ""}`}
                  aria-current={day === today ? "date" : undefined}
                >
                  <div>{shortMonthDay(day)}</div>
                  <div className="font-normal">{DAY_NAMES[i].toUpperCase()}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rooms.length === 0 && (
              <tr>
                <td colSpan={9} className="border border-neutral-300 p-4 text-neutral-500">
                  No rooms yet.
                </td>
              </tr>
            )}
            {rooms.map((room) =>
              TIME_SLOTS.map((slot, i) => (
                <tr key={`${room.roomId}-${slot}`}>
                  {i === 0 && (
                    <th rowSpan={TIME_SLOTS.length} scope="rowgroup" className="border border-neutral-300 p-1 font-bold uppercase">
                      {room.name}
                    </th>
                  )}
                  <th scope="row" className="border border-neutral-300 p-1 font-normal">
                    {slot}
                  </th>
                  {days.map((day) => (
                    <td key={day} className="h-10 border border-neutral-300" />
                  ))}
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
