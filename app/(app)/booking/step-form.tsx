"use client";

import { saveAndGo } from "./actions";
import { useActionState, useEffect, useState } from "react";
import { EMPTY_FORM_STATE, STEP_FORM_ID, type FormState } from "./rules";

export const LABEL = "block text-sm font-semibold";
export const FIELD =
  "mt-1 block h-10 w-full rounded-md border border-accent-6 bg-container px-3 font-normal outline-none focus:border-accent-1 read-only:bg-accent-5 read-only:text-accent-3";
export const ERROR_TEXT = "mt-1 text-xs text-accent-2";

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  backHref: string;
  canConfirm: boolean;
  confirmLabel?: string;
  confirmWarning?: string;
  onSubmitted?: () => void;
  children?: React.ReactNode;
};

export function StepForm({
  action,
  backHref,
  canConfirm,
  confirmLabel = "Confirm",
  confirmWarning,
  onSubmitted,
  children,
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
      {children}

      {state.error && (
        <p
          role="alert"
          className="mt-6 rounded-md bg-accent-2/10 px-4 py-2 text-sm text-accent-2"
        >
          {state.error}
        </p>
      )}

      <div className="mt-10 flex justify-center gap-6 sm:gap-32">
        <button
          type="submit"
          disabled={!canConfirm || pending || submitted}
          onClick={(e) => {
            if (confirmWarning && !warnOpen) {
              e.preventDefault();
              setWarnFor(state);
            }
          }}
          className="order-2 rounded-lg bg-accent-1 px-12 py-2 font-semibold text-white hover:brightness-110 disabled:cursor-not-allowed disabled:bg-accent-6 disabled:text-accent-3/50 disabled:hover:brightness-100"
        >
          {submitted ? "Submitted" : pending ? "Please wait" : confirmLabel}
        </button>
        <button
          type="submit"
          formAction={saveAndGo.bind(null, backHref)}
          formNoValidate
          disabled={pending || submitted}
          className="order-1 rounded-lg bg-accent-2 px-12 py-2 font-semibold text-white hover:brightness-110"
        >
          Back
        </button>
      </div>

      {warnOpen && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-warning-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
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
