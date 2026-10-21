"use client";

import { useState } from "react";
import { saveDate } from "../actions";
import { ERROR_TEXT, FIELD, LABEL, StepForm } from "../step-form";
import { validateDate } from "../rules";

export function DateForm({ initialDate, min, max }: { initialDate: string; min: string; max: string }) {
  const [date, setDate] = useState(initialDate);
  const error = validateDate(date);

  return (
    <StepForm action={saveDate} backHref="/booking" canConfirm={!error}>
      <label className={`${LABEL} mt-6 block max-w-xs`}>
        Date <span aria-hidden="true">*</span>
        <input
          type="date"
          name="date"
          min={min}
          max={max}
          value={date}
          required
          onChange={(e) => setDate(e.target.value)}
          className={FIELD}
        />
      </label>
      {date && error && (
        <p role="alert" className={ERROR_TEXT}>
          {error}
        </p>
      )}
    </StepForm>
  );
}
