"use client";

import { useState } from "react";
import { DayNumber, MonthGrid } from "../../calendar/calendar-parts";
import { addMonths, monthKey } from "../../calendar/dates";
import { MonthPicker } from "../../calendar/month-picker";

export function DateCalendar({
  selected,
  onSelect,
  today,
  max,
  initialMonth,
}: {
  selected: string;
  onSelect: (date: string) => void;
  today: string;
  max: string;
  initialMonth: string;
}) {
  const [month, setMonth] = useState(initialMonth);

  const minKey = monthKey(today);
  const maxKey = monthKey(max);
  const prev = addMonths(month, -1);
  const next = addMonths(month, 1);
  const arrow = "px-2 py-1 hover:underline disabled:cursor-not-allowed disabled:opacity-30 disabled:no-underline";

  return (
    <div className="overflow-hidden rounded-lg bg-container shadow-sm">
      <div className="flex items-center justify-between bg-accent-1 px-3 py-2 text-white">
        <button type="button" onClick={() => setMonth(prev)} disabled={monthKey(prev) < minKey} aria-label="Previous month" className={arrow}>
          ‹
        </button>
        <MonthPicker month={month} minMonth={minKey} maxMonth={maxKey} onSelect={setMonth} />
        <button type="button" onClick={() => setMonth(next)} disabled={monthKey(next) > maxKey} aria-label="Next month" className={arrow}>
          ›
        </button>
      </div>

      <MonthGrid
        month={month}
        today={today}
        selected={selected}
        isDisabled={(day) => day < today || day > max}
        renderDay={(day, className, { isToday, isSelected, disabled }) => (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onSelect(day)}
            aria-pressed={isSelected}
            aria-current={isToday ? "date" : undefined}
            aria-label={day}
            className={className}
          >
            <DayNumber day={day} />
          </button>
        )}
      />
    </div>
  );
}
