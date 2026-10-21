"use client";

import { useState } from "react";
import { saveTime } from "../actions";
import {
  findOverlap,
  formatTime,
  overlapMessage,
  timeOptions,
  validateTime,
  type Slot,
} from "../rules";
import { ERROR_TEXT, FIELD, LABEL, StepForm } from "../step-form";

const OPTIONS = timeOptions();

export function TimeForm({
  date,
  initialStart,
  initialEnd,
  booked,
}: {
  date: string;
  initialStart: string;
  initialEnd: string;
  booked: Slot[];
}) {
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);

  const clash = start && end ? findOverlap(booked, start, end) : null;
  const error = validateTime(date, start, end) ?? (clash ? overlapMessage(clash) : null);

  const startOptions = OPTIONS.slice(0, -1);
  const endOptions = OPTIONS.filter((o) => !start || o.value > start).filter((o) => o.value !== OPTIONS[0].value);

  return (
    <StepForm action={saveTime} backHref="/booking/select-date" canConfirm={!error}>
      <div className="mt-6 grid max-w-xl gap-6 sm:grid-cols-2">
        <label className={LABEL}>
          Start time <span aria-hidden="true">*</span>
          <select
            name="startTime"
            value={start}
            required
            onChange={(e) => {
              setStart(e.target.value);
              if (end && end <= e.target.value) setEnd("");
            }}
            className={FIELD}
          >
            <option value="" disabled>
              Select a start time
            </option>
            {startOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className={LABEL}>
          End time <span aria-hidden="true">*</span>
          <select name="endTime" value={end} required onChange={(e) => setEnd(e.target.value)} className={FIELD}>
            <option value="" disabled>
              Select an end time
            </option>
            {endOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {start && end && error && (
        <p role="alert" className={ERROR_TEXT}>
          {error}
        </p>
      )}

      <div className="mt-6 max-w-xl rounded-md border border-accent-6 p-4 text-sm">
        <h2 className="font-semibold">Already booked on this date</h2>
        {booked.length === 0 ? (
          <p className="mt-1 text-accent-3">No approved bookings yet.</p>
        ) : (
          <ul className="mt-1 list-disc pl-5">
            {booked.map((s) => (
              <li key={`${s.start}-${s.end}`}>
                {formatTime(s.start)} – {formatTime(s.end)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </StepForm>
  );
}
