import Link from "next/link";
import { formatTime, toMinutes, type RoomListing } from "../booking/rules";
import { DayContent, MonthGrid, TODAY_FILL } from "../calendar/calendar-parts";
import { MARK_STYLE, cancelsClasses, markFor, type DayMarks } from "../calendar/day-marks";
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
import { DayMenu } from "./day-menu";
import type { WeekClass } from "./schedule/types";

// Bounds are minutes from midnight. The last slot runs to closing time (22:00) so a class
// ending after 21:30 still lands in a row.
const TIME_SLOTS = [
  { label: "7:30 AM - 11:00 AM", from: 7 * 60 + 30, to: 11 * 60 },
  { label: "11:00 AM - 2:30 PM", from: 11 * 60, to: 14 * 60 + 30 },
  { label: "2:30 PM - 6:00 PM", from: 14 * 60 + 30, to: 18 * 60 },
  { label: "6:00 PM - 9:30 PM", from: 18 * 60, to: 22 * 60 },
] as const;

const href = (query: Record<string, string>) => ({ pathname: "/admin-dashboard", query: { tab: "timeline", ...query } });

const navLink = "px-2 py-1 hover:underline";


export function CalendarView({ month, marks }: { month: string; marks: DayMarks }) {
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
        getMark={(day) => markFor(day, marks)}
        renderDay={(day, className, { isToday, mark }) => (
          <DayMenu
            date={day}
            mark={mark}
            weekHref={`/admin-dashboard?tab=timeline&view=b&week=${startOfWeek(day)}`}
            className={className}
          >
            <span aria-current={isToday ? "date" : undefined}>
              <DayContent day={day} mark={mark} />
            </span>
          </DayMenu>
        )}
      />
    </div>
  );
}


export function TimetableView({
  sunday,
  rooms,
  marks,
  classes,
}: {
  sunday: string;
  rooms: RoomListing[];
  marks: DayMarks;
  classes: WeekClass[];
}) {
  const today = todayISO();
  const days = weekDays(sunday);
  const midWeek = addDays(sunday, 3);

  // Classes don't run on holidays / cancelled / no-class days, so they're left off those columns.
  const runningDays = new Set(days.filter((day) => !cancelsClasses(markFor(day, marks))));
  const byCell = new Map<string, WeekClass[]>();
  for (const c of classes) {
    if (!runningDays.has(c.date)) continue;
    const key = `${c.roomId}|${c.date}`;
    byCell.set(key, [...(byCell.get(key) ?? []), c]);
  }

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
          <thead className="select-none">
            <tr className="bg-blue-100">
              <th className="w-28 border border-neutral-300 p-1">ROOM</th>
              <th className="w-36 border border-neutral-300 p-1">TIME</th>
              {days.map((day, i) => {
                const mark = markFor(day, marks);
                const fill = mark ? MARK_STYLE[mark.kind].fill : day === today ? TODAY_FILL : "";
                return (
                  <th key={day} className={`border border-neutral-300 ${fill}`} aria-current={day === today ? "date" : undefined}>
                    {/* Clicking a day header opens the same menu as the calendar (minus "View week"). */}
                    <DayMenu date={day} mark={mark} className="block w-full cursor-pointer select-none p-1 hover:brightness-95">
                      <div>{shortMonthDay(day)}</div>
                      <div className="font-normal">{DAY_NAMES[i].toUpperCase()}</div>
                      {mark && <div className="mt-0.5 truncate text-[10px] font-medium">{mark.label}</div>}
                    </DayMenu>
                  </th>
                );
              })}
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
                <tr key={`${room.roomId}-${slot.label}`}>
                  {i === 0 && (
                    <th rowSpan={TIME_SLOTS.length} scope="rowgroup" className="border border-neutral-300 p-1 font-bold uppercase">
                      {room.name}
                    </th>
                  )}
                  <th scope="row" className="border border-neutral-300 p-1 font-normal">
                    {slot.label}
                  </th>
                  {days.map((day) => {
                    const mark = markFor(day, marks);
                    const inSlot = (byCell.get(`${room.roomId}|${day}`) ?? []).filter(
                      (c) => toMinutes(c.start) < slot.to && toMinutes(c.end) > slot.from,
                    );
                    return (
                      <td key={day} className={`h-10 border border-neutral-300 p-0.5 align-top ${mark ? MARK_STYLE[mark.kind].tint : ""}`}>
                        {inSlot.map((c) => (
                          <div
                            key={c.id}
                            title={`${c.title}${c.adviser ? ` — ${c.adviser}` : ""}\n${formatTime(c.start)} – ${formatTime(c.end)}`}
                            className="mb-0.5 rounded bg-blue-100 px-1 py-0.5 text-[10px] leading-tight text-blue-950 last:mb-0"
                          >
                            <div className="truncate font-semibold">{c.title}</div>
                            {c.adviser && <div className="truncate">{c.adviser}</div>}
                          </div>
                        ))}
                      </td>
                    );
                  })}
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
