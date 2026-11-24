"use client";

import { saveAndGo } from "./actions";
import { useActionState, useEffect, useState } from "react";
import { FormPendingSignal } from "../../components/loading-provider";
import { EMPTY_FORM_STATE, STEP_FORM_ID, type FormState } from "./rules";

export const LABEL = "block text-sm font-semibold";
export const FIELD =
  "mt-1 block h-10 w-full rounded-md border border-accent-6 bg-container px-3 font-normal outline-none focus:border-accent-1 read-only:bg-accent-5 read-only:text-accent-3";
export const ERROR_TEXT = "mt-1 text-xs text-accent-2";

/**
 * Phones split step 1 into two screens: the calendar, then the time list. This swaps the action buttons to
 * match ("Back" + "Select Time", then "Change Date" + "Confirm"). From md up both halves share one screen
 * and the normal Back / Confirm buttons are used, so none of this shows.
 */
export type PhoneFlow = {
  stage: "date" | "time";
  canAdvance: boolean;
  onAdvance: () => void;
  onRetreat: () => void;
};

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  backHref: string;
  canConfirm: boolean;
  confirmLabel?: string;
  confirmWarning?: string;
  onSubmitted?: () => void;
  children?: React.ReactNode;
  buttonsLayout?: "default" | "under-calendar";
  phone?: PhoneFlow;
};

// On phones and small tablets the actions are a bar pinned to the bottom of the screen (it bleeds out to the card's
// edges); from md up it is an ordinary row in the page again.
const ACTION_BAR =
  "sticky bottom-0 z-10 -mx-4 -mb-4 mt-6 flex items-center gap-3 rounded-b-xl bg-container px-4 pb-3 pt-3 shadow-[0_-6px_8px_-6px_rgba(0,0,0,0.15)] sm:-mx-5 sm:-mb-5 sm:px-5 md:static md:z-auto md:mx-0 md:mb-0 md:rounded-none md:bg-transparent md:p-0 md:shadow-none";
const BTN = "flex-1 rounded-lg px-4 py-2.5 font-semibold text-white hover:brightness-110 md:flex-none md:px-12 md:py-2";

export function StepForm({
  action,
  backHref,
  canConfirm,
  confirmLabel = "Confirm",
  confirmWarning,
  onSubmitted,
  children,
  buttonsLayout = "default",
  phone,
}: Props) {
  const [state, formAction, pending] = useActionState(action, EMPTY_FORM_STATE);
  const submitted = Boolean(state.submitted);
  const [warnFor, setWarnFor] = useState<FormState | null>(null);
  const warnOpen = Boolean(confirmWarning) && warnFor === state;

  useEffect(() => {
    if (submitted) onSubmitted?.();
  }, [submitted, onSubmitted]);

  return (
    <form id={STEP_FORM_ID} action={formAction} noValidate>
      <FormPendingSignal />
      {children}

      {state.error && (
        <p
          role="alert"
          className="mt-6 rounded-md bg-accent-2/10 px-4 py-2 text-sm text-accent-2"
        >
          {state.error}
        </p>
      )}

      <div
        data-tour="step-actions"
        className={`${ACTION_BAR} ${
          buttonsLayout === "under-calendar"
            ? "md:mt-3 md:w-[69%] md:justify-between md:gap-4"
            : "md:mt-10 md:justify-center md:gap-32"
        }`}
      >
        <button
          type="submit"
          disabled={!canConfirm || pending || submitted}
          onClick={(e) => {
            if (confirmWarning && !warnOpen) {
              e.preventDefault();
              setWarnFor(state);
            }
          }}
          className={`${BTN} order-2 bg-accent-1 disabled:cursor-not-allowed disabled:bg-accent-6 disabled:text-accent-3/50 disabled:hover:brightness-100 ${
            phone?.stage === "date" ? "max-md:hidden" : ""
          }`}
        >
          {submitted ? "Submitted" : pending ? "Please wait" : confirmLabel}
        </button>
        <button
          type="submit"
          formAction={saveAndGo.bind(null, backHref)}
          formNoValidate
          disabled={pending || submitted}
          className={`${BTN} order-1 bg-accent-2 ${phone?.stage === "time" ? "max-md:hidden" : ""}`}
        >
          Back
        </button>

        {/* Phone-only stand-ins for the two buttons above (plain buttons: they only move between the two screens). */}
        {phone?.stage === "date" && (
          <button
            type="button"
            disabled={!phone.canAdvance}
            onClick={phone.onAdvance}
            className={`${BTN} order-2 bg-accent-1 disabled:cursor-not-allowed disabled:bg-accent-6 disabled:text-accent-3/50 disabled:hover:brightness-100 md:hidden`}
          >
            Select Time
          </button>
        )}
        {phone?.stage === "time" && (
          <button
            type="button"
            onClick={phone.onRetreat}
            className={`${BTN} order-1 bg-accent-2 md:hidden`}
          >
            Change Date
          </button>
        )}
      </div>

      {warnOpen && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-warning-title"
          // Stays mounted while the action runs (so the submit isn't cancelled) but is hidden:
          // the loading screen only covers the content area, so a visible backdrop would keep
          // the sidebar and header dimmed.
          className={`fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 ${
            pending || submitted ? "invisible" : ""
          }`}
        >
          <div className="w-full max-w-sm rounded-xl bg-container p-6 shadow-lg">
            <h2 id="confirm-warning-title" className="text-lg font-bold">
              Are you sure?
            </h2>
            <p className="mt-2 text-sm">{confirmWarning}</p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setWarnFor(null)}
                disabled={pending}
                className="rounded-lg border border-accent-6 px-5 py-2 text-sm font-semibold hover:bg-accent-5"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending || submitted}
                className="rounded-lg bg-accent-1 px-5 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pending ? "Please wait" : "Yes, continue"}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
