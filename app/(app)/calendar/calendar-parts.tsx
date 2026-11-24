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
  dense = false,
}: {
  /** Tighter gaps and smaller weekday headers below sm, for calendars that must fit a phone. */
  dense?: boolean;
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
    <div className={`grid grid-cols-7 ${dense ? "gap-1 p-2 sm:gap-2 sm:p-3" : "gap-2 p-3"}`}>
      {DAY_SHORT.map((d) => (
        <div
          key={d}
          className={`rounded bg-blue-100 py-1 text-center font-semibold ${dense ? "text-xs sm:text-sm" : "text-sm"}`}
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
    <span className="absolute inset-x-0 bottom-0.5 flex max-w-full flex-wrap justify-center gap-0.5 @[3.5rem]:inset-x-auto @[3.5rem]:bottom-auto @[3.5rem]:right-1 @[3.5rem]:top-1 @[3.5rem]:justify-end @[3.5rem]:gap-1" title={title}>
      {availability && (
        <span
          role="img"
          aria-label={AVAILABILITY_LABEL[availability]}
          className={`h-3 w-3 rounded-full ring-1 ring-white @[3.5rem]:h-5 @[3.5rem]:w-5 @[9rem]:h-6 @[9rem]:w-6 ${AVAILABILITY_DOT[availability]}`}
        />
      )}
      {shown.map((s) =>
        s.icon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={`${s.id}-${s.icon}`} src={s.icon} alt="" aria-hidden className="h-3 w-3 rounded-full @[3.5rem]:h-5 @[3.5rem]:w-5 @[9rem]:h-6 @[9rem]:w-6" />
        ) : (
          <span key={s.id} aria-hidden className="h-3 w-3 rounded-full ring-1 ring-white @[3.5rem]:h-5 @[3.5rem]:w-5 @[9rem]:h-6 @[9rem]:w-6" style={{ backgroundColor: s.color }} />
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
          className="absolute inset-0 flex items-end justify-center px-0.5 pb-0.5 text-center text-[8px] font-semibold leading-tight @[4.5rem]:items-center @[4.5rem]:px-6 @[4.5rem]:pb-0 @[4.5rem]:text-[11px] @[9rem]:text-xs @[12rem]:text-sm"
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
function AvailabilityItems({
  dotBox = false,
  wrap = false,
  phoneWrap = false,
}: {
  dotBox?: boolean;
  wrap?: boolean;
  /** Lets the text wrap below sm (for the two-column legend on phones) but keeps it on one line from sm up. */
  phoneWrap?: boolean;
}) {
  return (
    <>
      {(Object.keys(AVAILABILITY_LABEL) as DayAvailability[]).map((k) => {
        const dot = <span aria-hidden className={`h-3 w-3 shrink-0 rounded-full ${AVAILABILITY_DOT[k]}`} />;
        return (
          <li key={k} className={`flex items-center gap-2 ${wrap ? "" : phoneWrap ? "sm:whitespace-nowrap" : "whitespace-nowrap"}`}>
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
      {/* Horizontal: one wrapping strip from sm up. On phones it becomes a tidy two-column grid. */}
      <div
        className={
          horizontal
            ? "sm:flex sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-3"
            : ""
        }
      >
        <h3
          className={
            horizontal
              ? "shrink-0 text-base font-bold sm:text-lg"
              : "text-lg font-bold"
          }
        >
          Legend
        </h3>

        <ul
          className={
            horizontal
              ? "mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-sm sm:mt-0 sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-6"
              : "mt-3 space-y-2 text-sm"
          }
        >
          {MARK_OPTIONS.map((o) => (
            <li
              key={o.kind}
              className={`flex items-center gap-2 ${horizontal ? "sm:whitespace-nowrap" : ""}`}
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
          {showAvailability && <AvailabilityItems wrap={!horizontal} phoneWrap={horizontal} />}
        </ul>

        <ul
          aria-label="Approved bookings"
          className={
            horizontal
              ? "mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-neutral-200 pt-3 text-sm sm:mt-0 sm:flex sm:flex-wrap sm:items-center sm:gap-x-6 sm:border-0 sm:pt-0"
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
