import { DAY_SHORT, dayOfMonth, monthGrid, monthKey } from "./dates";
import { BOOKING_SYMBOLS, type DaySymbol } from "./day-symbols";
import { AVAILABILITY_DOT, AVAILABILITY_LABEL, type DayAvailability } from "./day-availability";
import {
  MARK_OPTIONS,
  MARK_STYLE,
  showsLabelOnCalendar,
  type DayMark,
} from "./day-marks";

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

export function dayCellClass({
  isToday,
  isSelected,
  inMonth,
  disabled,
  mark,
}: DayState) {
  const base =
    "@container relative block h-24 w-full overflow-hidden rounded border p-1.5 text-left text-sm";
  const interactive = "hover:border-accent-1 hover:shadow";
  const fade = inMonth ? "" : "opacity-60";
  if (disabled) {
    if (mark)
      return `${base} cursor-not-allowed ${MARK_STYLE[mark.kind].cell} ${fade}`;
    return `${base} cursor-not-allowed border-neutral-200 bg-slate-50 text-neutral-300`;
  }
  if (isSelected) return `${base} ${interactive} ${SELECTED_STYLE}`;
  if (mark)
    return `${base} ${interactive} ${MARK_STYLE[mark.kind].cell} ${fade} ${isToday ? "ring-2 ring-accent-1/60" : ""}`;
  if (isToday) return `${base} ${interactive} ${TODAY_STYLE}`;
  if (!inMonth)
    return `${base} ${interactive} border-neutral-200 bg-slate-100 text-neutral-400`;
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
  renderDay: (
    day: string,
    className: string,
    state: DayState,
  ) => React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-7 gap-2 p-3">
      {DAY_SHORT.map((d) => (
        <div
          key={d}
          className="rounded bg-blue-100 py-1 text-center text-sm font-semibold"
        >
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
        return (
          <div key={day}>{renderDay(day, dayCellClass(state), state)}</div>
        );
      })}
    </div>
  );
}

const MAX_DOTS = 3;

export function SymbolDots({
  symbols,
  availability,
}: {
  symbols?: DaySymbol[];
  /** When given (even as null), availability replaces the plain class-schedule dot. */
  availability?: DayAvailability | null;
}) {
  const withAvailability = availability !== undefined;
  const list = (withAvailability ? symbols?.filter((s) => s.source !== "class") : symbols) ?? [];
  if (!list.length && !availability) return null;
  const shown = list.slice(0, MAX_DOTS);
  const extra = list.length - shown.length;
  const title = [availability && AVAILABILITY_LABEL[availability], ...list.map((s) => s.name)]
    .filter(Boolean)
    .join(", ");
  return (
    <span className="absolute right-1 top-1 flex max-w-full flex-wrap justify-end gap-1" title={title}>
      {availability && (
        <span
          role="img"
          aria-label={AVAILABILITY_LABEL[availability]}
          className={`h-5 w-5 rounded-full ring-1 ring-white @[9rem]:h-6 @[9rem]:w-6 ${AVAILABILITY_DOT[availability]}`}
        />
      )}
      {shown.map((s) =>
        s.icon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={`${s.id}-${s.icon}`} src={s.icon} alt="" aria-hidden className="h-5 w-5 rounded-full @[9rem]:h-6 @[9rem]:w-6" />
        ) : (
          <span key={s.id} aria-hidden className="h-5 w-5 rounded-full ring-1 ring-white @[9rem]:h-6 @[9rem]:w-6" style={{ backgroundColor: s.color }} />
        ),
      )}
      {extra > 0 && (
        <span aria-hidden className="grid h-5 min-w-5 place-items-center rounded-full bg-neutral-500 px-0.5 text-[10px] font-bold leading-none text-white @[9rem]:h-6 @[9rem]:min-w-6">
          +{extra}
        </span>
      )}
    </span>
  );
}

export function DayContent({
  day,
  mark,
  symbols,
  availability,
}: {
  day: string;
  mark: DayMark | null;
  symbols?: DaySymbol[];
  /** Pass on calendars that show availability; null means "nothing free" and still hides class dots. */
  availability?: DayAvailability | null;
}) {
  const showLabel = mark && !mark.implicit && showsLabelOnCalendar(mark.kind);
  return (
    <>
      <span className="block">{dayOfMonth(day)}</span>
      <SymbolDots symbols={symbols} availability={availability} />
      {showLabel && (
        <span
          title={mark.label}
          className="absolute inset-0 flex items-center justify-center px-6 text-center text-[11px] font-semibold leading-tight @[9rem]:text-xs @[12rem]:text-sm"
        >
          <span className="line-clamp-3 [overflow-wrap:anywhere]">
            {mark.label}
          </span>
        </span>
      )}
    </>
  );
}

function BookingSymbolIcon({ src }: { src: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" aria-hidden className="h-4 w-4 shrink-0 rounded-full" />;
}

/** Availability entries, rendered as extra items in the first legend list (after "No Booking"). */
function AvailabilityItems({ dotBox = false, wrap = false }: { dotBox?: boolean; wrap?: boolean }) {
  return (
    <>
      {(Object.keys(AVAILABILITY_LABEL) as DayAvailability[]).map((k) => {
        const dot = <span aria-hidden className={`h-3 w-3 shrink-0 rounded-full ${AVAILABILITY_DOT[k]}`} />;
        return (
          <li key={k} className={`flex items-center gap-2 ${wrap ? "" : "whitespace-nowrap"}`}>
            {dotBox ? <span className="grid h-4 w-4 shrink-0 place-items-center">{dot}</span> : dot}
            {AVAILABILITY_LABEL[k]}
          </li>
        );
      })}
    </>
  );
}

export function Legend({
  compact = false,
  horizontal = false,
  showAvailability = false,
}: {
  compact?: boolean;
  horizontal?: boolean;
  /** Adds the room-availability entries (booking calendar only). */
  showAvailability?: boolean;
}) {
  if (compact) {
    return (
      <aside
        aria-label="Legend"
        className="flex flex-col gap-2 rounded-lg bg-container px-5 py-3 text-sm leading-5 shadow-sm sm:flex-row sm:items-start sm:gap-6"
      >
        <h3 className="shrink-0 font-bold">Legend</h3>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <ul className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {MARK_OPTIONS.map((o) => (
              <li key={o.kind} className="flex items-center gap-2 whitespace-nowrap">
                <span className="grid h-4 w-4 shrink-0 place-items-center">
                  <span aria-hidden className={`h-3 w-3 rounded-full ${MARK_STYLE[o.kind].dot}`} />
                </span>
                {o.label}
              </li>
            ))}
            {showAvailability && <AvailabilityItems dotBox />}
          </ul>

          <ul
            aria-label="Approved bookings"
            className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-neutral-200 pt-2"
          >
            {BOOKING_SYMBOLS.map((g) => (
              <li
                key={g.key}
                className="flex items-center gap-2 whitespace-nowrap"
                title={g.activities.join(", ")}
              >
                <BookingSymbolIcon src={g.icon} />
                {g.label}
              </li>
            ))}
          </ul>
        </div>
      </aside>
    );
  }

  return (
    <aside
      aria-label="Legend"
      className={
        horizontal
          ? "w-full rounded-lg bg-container px-5 py-3 shadow-sm"
          : "w-full rounded-lg bg-container p-4 shadow-sm lg:w-64 lg:shrink-0"
      }
    >
      <div
        className={
          horizontal ? "flex flex-wrap items-center gap-x-6 gap-y-3" : ""
        }
      >
        <h3
          className={
            horizontal ? "shrink-0 text-lg font-bold" : "text-lg font-bold"
          }
        >
          Legend
        </h3>

        <ul
          className={
            horizontal
              ? "flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-sm"
              : "mt-3 space-y-2 text-sm"
          }
        >
          {MARK_OPTIONS.map((o) => (
            <li
              key={o.kind}
              className={`flex items-center gap-2 ${horizontal ? "whitespace-nowrap" : ""}`}
            >
              <span
                aria-hidden
                className={`h-3 w-3 shrink-0 rounded-full ${
                  MARK_STYLE[o.kind].dot
                }`}
              />
              {o.label}
            </li>
          ))}
          {showAvailability && <AvailabilityItems wrap={!horizontal} />}
        </ul>

        <ul
          aria-label="Approved bookings"
          className={
            horizontal
              ? "flex flex-wrap items-center gap-x-6 gap-y-2 text-sm"
              : "mt-4 space-y-2 border-t border-neutral-200 pt-4 text-sm"
          }
        >
          {BOOKING_SYMBOLS.map((g) => (
            <li key={g.key} className="flex items-center gap-2" title={g.activities.join(", ")}>
              <BookingSymbolIcon src={g.icon} />
              {g.label}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
