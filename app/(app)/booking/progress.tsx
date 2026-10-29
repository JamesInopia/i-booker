"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { finishBooking, saveAndGo } from "./actions";
import { STEP_FORM_ID } from "./rules";
import { STEPS } from "./steps";

const FINISH_AFTER_MS = 2800;

const ProgressContext = createContext<{ complete: (edited?: boolean) => void }>(
  { complete: () => {} },
);
export const useBookingProgress = () => useContext(ProgressContext);

function Check({ draw }: { draw?: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      aria-hidden="true"
    >
      <path
        d="m4 10.5 4 4 8-9"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={draw ? "booking-draw" : undefined}
        strokeDasharray={draw ? 20 : undefined}
        strokeDashoffset={draw ? 20 : undefined}
      />
    </svg>
  );
}

function Stepper({
  current,
  done,
  maxStep,
}: {
  current: number;
  done: boolean;
  maxStep: number;
}) {
  const level = done ? STEPS.length : current;
  const fill = ((level - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="relative">
      <div className="absolute left-[12.5%] right-[12.5%] top-5 h-1 -translate-y-1/2 rounded-full bg-accent-6">
        <div
          className="h-full rounded-full bg-accent-1 transition-[width] duration-700 ease-in-out motion-reduce:transition-none"
          style={{ width: `${fill}%` }}
        />
      </div>

      <ol aria-label="Booking progress" className="relative flex items-start">
        {STEPS.map((s) => {
          const completed = done || s.n < current;
          const active = !done && s.n === current;
          const reached = s.n <= level;
          const finalDone = done && s.n === STEPS.length;
          const clickable = !done && !active && s.n <= maxStep;

          const body = (
            <>
              <span
                style={{
                  transitionDelay: reached && !clickable ? "450ms" : "0ms",
                }}
                className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 bg-container text-lg font-semibold transition-colors duration-300 motion-reduce:transition-none ${
                  reached
                    ? "border-accent-1 text-accent-1"
                    : "border-accent-3/40 text-accent-3/60"
                } ${clickable ? "group-hover:border-accent-1 group-hover:bg-accent-1 group-hover:text-white" : ""} ${finalDone ? "booking-pop" : ""}`}
              >
                {finalDone && (
                  <span className="booking-ring absolute inset-0 rounded-full border-2 border-accent-1" />
                )}
                {completed ? <Check draw={finalDone} /> : s.n}
              </span>
              <span
                className={`text-xs transition-colors duration-300 sm:text-sm ${
                  reached ? "font-semibold text-accent-1" : "text-accent-3/60"
                }`}
              >
                {s.title}
              </span>
            </>
          );

          return (
            <li
              key={s.n}
              aria-current={active ? "step" : undefined}
              className="relative flex flex-1 justify-center text-center"
            >
              {clickable ? (
                <button
                  type="submit"
                  form={STEP_FORM_ID}
                  formAction={saveAndGo.bind(null, s.path)}
                  formNoValidate
                  className="group flex flex-col items-center gap-1"
                >
                  {body}
                </button>
              ) : (
                <div className="flex flex-col items-center gap-1">{body}</div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function BookingShell({
  children,
  maxStep,
}: {
  children: React.ReactNode;
  maxStep: number;
}) {
  const pathname = usePathname();
  const current = STEPS.findIndex((s) => s.path === pathname) + 1;
  const [done, setDone] = useState(false);
  const [edited, setEdited] = useState(false);
  const complete = useCallback((wasEdit = false) => {
    setEdited(wasEdit);
    setDone(true);
  }, []);

  useEffect(() => {
    if (!done) return;
    const timer = setTimeout(() => {
      startTransition(async () => {
        await finishBooking();
      });
    }, FINISH_AFTER_MS);
    return () => clearTimeout(timer);
  }, [done]);

  return (
    <ProgressContext.Provider value={{ complete }}>
      {(current > 0 || done) && (
        <div className="sticky top-16 z-20 bg-[#f0f3f8] px-16 pb-2 pt-2">
          <Stepper
            current={current || STEPS.length}
            done={done}
            maxStep={maxStep}
          />
        </div>
      )}
      {children}

      {done && (
        <div
          role="status"
          className="booking-fade fixed inset-0 z-50 flex items-center justify-center bg-accent-3/40 px-6"
        >
          <div className="flex w-full max-w-sm flex-col items-center rounded-2xl bg-container px-8 py-10 text-center shadow-xl">
            <svg
              viewBox="0 0 52 52"
              className="h-20 w-20 text-accent-1"
              fill="none"
              aria-hidden="true"
            >
              <circle
                cx="26"
                cy="26"
                r="24"
                stroke="currentColor"
                strokeWidth="3"
                className="booking-circle"
              />
              <path
                d="m15 27 8 8 15-17"
                stroke="currentColor"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="booking-tick"
              />
            </svg>
            <h2 className="mt-5 text-2xl font-bold">
              {edited ? "Request Edited!" : "Request Submitted!"}
            </h2>
            <p className="mt-1 text-sm text-accent-3">
              Taking you to Booking Status…
            </p>
          </div>
        </div>
      )}
    </ProgressContext.Provider>
  );
}
