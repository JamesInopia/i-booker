import { DAY_SHORT, dayOfMonth, monthGrid, monthKey } from "./dates";
import { MARK_OPTIONS, MARK_STYLE, showsLabelOnCalendar, type DayMark } from "./day-marks";

export const TODAY_FILL = "bg-blue-50";
export const TODAY_STYLE = `border-accent-1/50 ${TODAY_FILL}`;
export const SELECTED_STYLE = "border-neutral-400 bg-accent-6";

export type DayState = {
  isToday: boolean;
  isSelected: boolean;
  inMonth: boolean;
  disabled: boolean;
  mark: DayMark | null;
};

export function dayCellClass({ isToday, isSelected, inMonth, disabled, mark }: DayState) {
  const base = "@container relative block h-24 w-full overflow-hidden rounded border p-1.5 text-left text-sm";
  const interactive = "hover:border-accent-1 hover:shadow";
  const fade = inMonth ? "" : "opacity-60";
  if (disabled) {
    if (mark) return `${base} cursor-not-allowed ${MARK_STYLE[mark.kind].cell} ${fade}`;
    return `${base} cursor-not-allowed border-neutral-200 bg-slate-50 text-neutral-300`;
  }
  if (isSelected) return `${base} ${interactive} ${SELECTED_STYLE}`;
  if (mark) return `${base} ${interactive} ${MARK_STYLE[mark.kind].cell} ${fade} ${isToday ? "ring-2 ring-accent-1/60" : ""}`;
  if (isToday) return `${base} ${interactive} ${TODAY_STYLE}`;
  if (!inMonth) return `${base} ${interactive} border-neutral-200 bg-slate-100 text-neutral-400`;
  return `${base} ${interactive} border-neutral-200 bg-container`;
}

export function MonthGrid({
  month,
  today,
  selected,
  isDisabled,
  getMark,
  renderDay,
}: {
  month: string; 
  today: string;
  selected?: string;
  isDisabled?: (day: string) => boolean;
  getMark?: (day: string) => DayMark | null;
  renderDay: (day: string, className: string, state: DayState) => React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-7 gap-2 p-3">
      {DAY_SHORT.map((d) => (
        <div key={d} className="rounded bg-blue-100 py-1 text-center text-sm font-semibold">
          {d}
        </div>
      ))}
      {monthGrid(month).map((day) => {
        const state: DayState = {
          isToday: day === today,
          isSelected: day === selected,
          inMonth: monthKey(day) === monthKey(month),
          disabled: isDisabled?.(day) ?? false,
          mark: getMark?.(day) ?? null,
        };
        return <div key={day}>{renderDay(day, dayCellClass(state), state)}</div>;
      })}
    </div>
  );
}

export function DayContent({ day, mark }: { day: string; mark: DayMark | null }) {
  const showLabel = mark && !mark.implicit && showsLabelOnCalendar(mark.kind);
  return (
    <>
      <span className="block">{dayOfMonth(day)}</span>
      {showLabel && (
        <span
          title={mark.label}
          className="absolute inset-0 flex items-center justify-center px-6 text-center text-[11px] font-semibold leading-tight @[9rem]:text-xs @[12rem]:text-sm"
        >
          <span className="line-clamp-3 [overflow-wrap:anywhere]">{mark.label}</span>
        </span>
      )}
    </>
  );
}

export function Legend({ compact = false }: { compact?: boolean }) {
  if (compact) {
    // One slim row, so it doesn't take a column away from the page it sits above.
    return (
      <aside aria-label="Legend" className="flex flex-wrap items-center gap-x-5 gap-y-1 rounded-lg bg-container px-4 py-2 text-sm shadow-sm">
        <h3 className="font-bold">Legend</h3>
        {MARK_OPTIONS.map((o) => (
          <span key={o.kind} className="flex items-center gap-2">
            <span aria-hidden className={`h-3 w-3 shrink-0 rounded-full ${MARK_STYLE[o.kind].dot}`} />
            {o.label}
          </span>
        ))}
      </aside>
    );
  }

  return (
    <aside aria-label="Legend" className="w-full rounded-lg bg-container p-4 shadow-sm lg:w-64 lg:shrink-0">
      <h3 className="text-lg font-bold">Legend</h3>
      <ul className="mt-3 space-y-2 text-sm">
        {MARK_OPTIONS.map((o) => (
          <li key={o.kind} className="flex items-center gap-2">
            <span aria-hidden className={`h-3 w-3 shrink-0 rounded-full ${MARK_STYLE[o.kind].dot}`} />
            {o.label}
          </li>
        ))}
      </ul>
    </aside>
  );
}
