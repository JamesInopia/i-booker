import { DAY_SHORT, dayOfMonth, monthGrid, monthKey } from "./dates";

export const TODAY_FILL = "bg-blue-50";
export const TODAY_STYLE = `border-accent-1/50 ${TODAY_FILL}`;
export const SELECTED_STYLE = "border-neutral-400 bg-accent-6";

export type DayState = { isToday: boolean; isSelected: boolean; inMonth: boolean; disabled: boolean };

export function dayCellClass({ isToday, isSelected, inMonth, disabled }: DayState) {
  const base = "block h-24 w-full rounded border p-1.5 text-left text-sm";
  if (disabled) return `${base} cursor-not-allowed border-neutral-200 bg-slate-50 text-neutral-300`;
  const interactive = "hover:border-accent-1 hover:shadow";
  if (isSelected) return `${base} ${interactive} ${SELECTED_STYLE}`;
  if (isToday) return `${base} ${interactive} ${TODAY_STYLE}`;
  if (!inMonth) return `${base} ${interactive} border-neutral-200 bg-slate-100 text-neutral-400`;
  return `${base} ${interactive} border-neutral-200 bg-container`;
}

export function MonthGrid({
  month,
  today,
  selected,
  isDisabled,
  renderDay,
}: {
  month: string;
  today: string;
  selected?: string;
  isDisabled?: (day: string) => boolean;
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
        };
        return <div key={day}>{renderDay(day, dayCellClass(state), state)}</div>;
      })}
    </div>
  );
}

export const DayNumber = ({ day }: { day: string }) => <>{dayOfMonth(day)}</>;

export function Legend() {
  return (
    <aside aria-label="Legend" className="w-full rounded-lg bg-container p-4 shadow-sm lg:w-64 lg:shrink-0">
      <h3 className="text-lg font-bold">Legend</h3>
    </aside>
  );
}
