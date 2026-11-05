"use client";

import { useEffect, useState } from "react";

import { Legend } from "../../calendar/calendar-parts";
import { longDateLabel } from "../../calendar/dates";
import type { DayMarks } from "../../calendar/day-marks";

import { getDateAvailability, saveDateTime } from "../actions";

import {
  findOverlap,
  formatDuration,
  formatTime,
  manilaNow,
  overlapMessage,
  TIME_BLOCKS,
  validateDate,
  validateTime,
  type Slot,
} from "../rules";

import { ERROR_TEXT, StepForm } from "../step-form";
import { DateCalendar } from "./date-calendar";

const SAME_DAY_WARNING =
  "Same day applications may not be accepted. Are you sure you want to continue?";

type Availability = {
  date: string;
  booked: Slot[];
  error: string | null;
};

type DateFormProps = {
  initialDate: string;
  initialStart: string;
  initialEnd: string;
  initialBooked: Slot[];
  min: string;
  max: string;
  closed: DayMarks;
};

export function DateForm({
  initialDate,
  initialStart,
  initialEnd,
  initialBooked,
  min,
  max,
  closed,
}: DateFormProps) {
  const validInitialDate =
    initialDate >= min && initialDate <= max && !closed[initialDate];

  const [date, setDate] = useState(validInitialDate ? initialDate : "");

  const [start, setStart] = useState(validInitialDate ? initialStart : "");

  const [end, setEnd] = useState(validInitialDate ? initialEnd : "");

  const [availability, setAvailability] = useState<Availability | null>(
    validInitialDate
      ? {
          date: initialDate,
          booked: initialBooked,
          error: null,
        }
      : null,
  );

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!date || availability?.date === date) return;

    let active = true;

    getDateAvailability(date)
      .then((result) => {
        if (!active) return;

        setAvailability({
          date,
          booked: result.booked,
          error: result.error,
        });
      })
      .catch(() => {
        if (!active) return;

        setAvailability({
          date,
          booked: [],
          error: "Unable to load room availability.",
        });
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [date, availability?.date]);

  function chooseDate(nextDate: string) {
    if (nextDate === date) return;

    setDate(nextDate);
    setStart("");
    setEnd("");
    setAvailability(null);
    setLoading(true);
  }

  const ready =
    Boolean(date) &&
    !loading &&
    availability?.date === date &&
    !availability.error;

  const booked = ready ? availability!.booked : [];
  const now = manilaNow();

  function occupants(slot: { start: string; end: string }) {
    return booked.filter((b) => slot.start < b.end && slot.end > b.start);
  }

  function isPast(slot: { start: string }) {
    return date === now.date && slot.start <= now.time;
  }

  function isUnavailable(slot: { start: string; end: string }) {
    return occupants(slot).length > 0 || isPast(slot);
  }

  function selectSlot(slot: { start: string; end: string }) {
    if (!ready || isUnavailable(slot)) return;

    // 1. Deselect if the first selected slot is clicked again.
    if (start === slot.start) {
      setStart("");
      setEnd("");
      return;
    }

    // 2. Select a new starting slot.
    if (!start || !end || slot.start < start) {
      setStart(slot.start);
      setEnd(slot.end);
      return;
    }

    // 3. Check if extending the selection causes a conflict.
    const conflict = findOverlap(booked, start, slot.end);

    // 4. If the range crosses an occupied period,
    // restart selection at the clicked slot.
    if (conflict) {
      setStart(slot.start);
      setEnd(slot.end);
      return;
    }

    // 5. Extend the selected booking period.
    setEnd(slot.end);
  }

  // G. Validate the selected date and time
  const dateError = validateDate(date);

  const timeError = start && end ? validateTime(date, start, end) : null;

  const clash = ready && start && end ? findOverlap(booked, start, end) : null;

  const error =
    dateError ??
    timeError ??
    (clash ? overlapMessage(clash) : null) ??
    (availability?.date === date ? availability.error : null);

  const canConfirm = Boolean(ready && start && end && !error);

  // H. Render the complete booking interface
  return (
    <StepForm
      action={saveDateTime}
      backHref="/booking"
      canConfirm={canConfirm}
      confirmWarning={date === min ? SAME_DAY_WARNING : undefined}
      buttonsLayout="under-calendar"
    >
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="startTime" value={start} />
      <input type="hidden" name="endTime" value={end} />

      {/* LEGEND: Above calendar and time panel */}
      <div className="mt-2 w-full">
        <Legend horizontal />
      </div>

      {/* MAIN: Wide calendar + narrow time panel */}
      <div className="mt-2 grid items-start gap-3 lg:grid-cols-[minmax(0,7fr)_minmax(260px,3fr)]">
        {/* LEFT: Existing calendar */}
        <section className="min-w-0">
          <DateCalendar
            selected={date}
            onSelect={chooseDate}
            today={min}
            max={max}
            closed={closed}
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
        </section>

        {/* RIGHT: Interactive timetable */}
        <section
          aria-label="Time selection"
          className="min-w-0 rounded-lg border border-accent-6 bg-container p-3 shadow-sm"
        >
          <h2 className="text-center text-lg font-bold">Select a Time</h2>

          <p className="mt-1 text-center text-xs text-accent-3">
            Select a slot, then a later slot to extend your booking.
          </p>

          {!date ? (
            <p className="mt-6 text-center text-sm">
              Please select a date first.
            </p>
          ) : !ready ? (
            <p role="status" className="mt-6 text-center text-sm">
              {loading || availability?.date !== date
                ? "Loading available times..."
                : availability?.error}
            </p>
          ) : (
            <>
              <div className="mt-3 overflow-hidden rounded-md border border-accent-6">
                <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] border-b border-accent-6 bg-accent-5 px-2 py-2 text-xs font-bold">
                  <span>Time</span>
                  <span className="text-center">Status</span>
                </div>

                {TIME_BLOCKS.map((slot) => {
                  const taken = occupants(slot);
                  const unavailable = taken.length > 0 || isPast(slot);

                  const selected = Boolean(
                    start && end && slot.start >= start && slot.end <= end,
                  );

                  return (
                    <button
                      key={slot.start}
                      type="button"
                      disabled={unavailable}
                      aria-pressed={selected}
                      onClick={() => selectSlot(slot)}
                      className={`grid min-h-14 w-full grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] items-center gap-2 border-t border-accent-6 px-2 py-2 text-left text-xs transition-colors first:border-t-0 ${
                        unavailable
                          ? "cursor-not-allowed bg-accent-5 text-accent-3/60"
                          : selected
                            ? "bg-accent-1 font-semibold text-white"
                            : "bg-container hover:bg-accent-5"
                      }`}
                    >
                      <span>
                        {formatTime(slot.start)} – {formatTime(slot.end)}
                      </span>

                      <span className="text-center [overflow-wrap:anywhere]">
                        {taken.length > 0 ? (
                          <span className="font-semibold">
                            {taken.map((t) => t.label ?? "Taken").join(" · ")}
                          </span>
                        ) : unavailable ? (
                          "Already passed"
                        ) : selected ? (
                          "Selected"
                        ) : (
                          "Available"
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div
                aria-live="polite"
                className="mt-4 rounded-md border border-accent-6 bg-accent-5/30 p-3 text-sm"
              >
                {start && end ? (
                  <>
                    <p className="font-semibold">
                      {formatTime(start)} – {formatTime(end)}
                    </p>
                    <p className="mt-1 text-accent-3">
                      Duration: {formatDuration(start, end)}
                    </p>
                  </>
                ) : (
                  "No time selected yet."
                )}
              </div>
            </>
          )}

          {date && error && (
            <p role="alert" className={ERROR_TEXT}>
              {error}
            </p>
          )}
        </section>
      </div>
    </StepForm>
  );
}
