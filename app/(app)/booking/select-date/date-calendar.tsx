"use client";

import { useState } from "react";
import { DayContent, MonthGrid } from "../../calendar/calendar-parts";
import type { DayMarks } from "../../calendar/day-marks";
import type { DaySymbols } from "../../calendar/day-symbols";
import {
  AVAILABILITY_LABEL,
  type DayAvailabilities,
} from "../../calendar/day-availability";
import { addMonths, monthKey } from "../../calendar/dates";
import { MonthPicker } from "../../calendar/month-picker";

export function DateCalendar({
  selected,
  onSelect,
  busy = false,
  today,
  max,
  closed,
  daySymbols,
  availability,
  initialMonth,
}: {
  selected: string;
  onSelect: (date: string) => void;
  busy?: boolean;
  today: string;
  max: string;
  closed: DayMarks;
  daySymbols: DaySymbols;
  availability: DayAvailabilities;
  initialMonth: string; // YYYY-MM-01
}) {
  const [month, setMonth] = useState(initialMonth);

  const minKey = monthKey(today);
  const maxKey = monthKey(max);
  const prev = addMonths(month, -1);
  const next = addMonths(month, 1);
  const arrow =
    "px-2 py-1 hover:underline disabled:cursor-not-allowed disabled:opacity-30 disabled:no-underline";

  return (
    <div className="overflow-hidden rounded-lg bg-container shadow-sm">
      <div className="flex items-center justify-between bg-accent-1 px-3 py-1.5 text-white">
        <button
          type="button"
          onClick={() => setMonth(prev)}
          disabled={monthKey(prev) < minKey}
          aria-label="Previous month"
          className={arrow}
        >
          ‹
        </button>
        <MonthPicker
          month={month}
          minMonth={minKey}
          maxMonth={maxKey}
          onSelect={setMonth}
        />
        <button
          type="button"
          onClick={() => setMonth(next)}
          disabled={monthKey(next) > maxKey}
          aria-label="Next month"
          className={arrow}
        >
          ›
        </button>
      </div>

      <MonthGrid
        month={month}
        today={today}
        selected={selected}
        isDisabled={(day) => day < today || day > max || Boolean(closed[day])}
        getMark={(day) => closed[day] ?? null}
        renderDay={(
          day,
          className,
          { isToday, isSelected, disabled, mark },
        ) => (
          <button
            type="button"
            disabled={disabled || busy}
            onClick={() => onSelect(day)}
            aria-pressed={isSelected}
            aria-current={isToday ? "date" : undefined}
            aria-label={[
              day,
              mark?.label,
              availability[day] && AVAILABILITY_LABEL[availability[day]],
            ]
              .filter(Boolean)
              .join(": ")}
            title={
              mark
                ? `${mark.label} (bookings closed)`
                : availability[day]
                  ? AVAILABILITY_LABEL[availability[day]]
                  : undefined
            }
            className={`${className} !h-[64px] !min-h-0 !p-2 ${busy && !disabled ? "cursor-progress" : ""}`}
          >
            <DayContent
              day={day}
              mark={mark}
              symbols={daySymbols[day]}
              availability={availability[day] ?? null}
            />
          </button>
        )}
      />
    </div>
  );
}
