"use client";

import { useState } from "react";
import { DayContent, MonthGrid } from "../../calendar/calendar-parts";
import type { DayMarks } from "../../calendar/day-marks";
import { addMonths, monthKey } from "../../calendar/dates";
import { MonthPicker } from "../../calendar/month-picker";

export function DateCalendar({
  selected,
  onSelect,
  today,
  max,
  closed,
  initialMonth,
}: {
  selected: string;
  onSelect: (date: string) => void;
  today: string;
  max: string;
  closed: DayMarks;
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
            disabled={disabled}
            onClick={() => onSelect(day)}
            aria-pressed={isSelected}
            aria-current={isToday ? "date" : undefined}
            aria-label={mark ? `${day}: ${mark.label}` : day}
            title={mark ? `${mark.label} (bookings closed)` : undefined}
            className={`${className} !h-[64px] !min-h-0 !p-2`}
          >
            <DayContent day={day} mark={mark} />
          </button>
        )}
      />
    </div>
  );
}
