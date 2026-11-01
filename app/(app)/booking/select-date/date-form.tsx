"use client";

import { useState } from "react";
import { Legend } from "../../calendar/calendar-parts";
import { longDateLabel } from "../../calendar/dates";
import { saveDate } from "../actions";
import { ERROR_TEXT, StepForm } from "../step-form";
import { validateDate } from "../rules";
import { DateCalendar } from "./date-calendar";

const SAME_DAY_WARNING = "Same day applications may not be accepted. Are you sure you want to continue?";

export function DateForm({ initialDate, min, max }: { initialDate: string; min: string; max: string }) {
  const [date, setDate] = useState(initialDate >= min && initialDate <= max ? initialDate : "");
  const error = validateDate(date);
  const isToday = date === min;

  return (
    <StepForm
      action={saveDate}
      backHref="/booking"
      canConfirm={!error}
      confirmWarning={isToday ? SAME_DAY_WARNING : undefined}
    >
      <input type="hidden" name="date" value={date} />

      <div className="mt-6 flex flex-col gap-4 lg:flex-row">
        <div className="min-w-0 flex-1">
          <DateCalendar
            selected={date}
            onSelect={setDate}
            today={min}
            max={max}
            initialMonth={`${(date || min).slice(0, 7)}-01`}
          />
          <p className="mt-3 text-sm">
            {date ? (
              <>
                Selected date: <strong>{longDateLabel(date)}</strong>
              </>
            ) : (
              "Select a date from the calendar."
            )}
          </p>
          {date && error && (
            <p role="alert" className={ERROR_TEXT}>
              {error}
            </p>
          )}
        </div>
        <Legend />
      </div>
    </StepForm>
  );
}
