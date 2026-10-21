"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { EMPTY_FORM_STATE, type FormState } from "./rules";

export const LABEL = "block text-sm font-semibold";
export const FIELD =
  "mt-1 block h-10 w-full rounded-md border border-accent-6 bg-container px-3 font-normal outline-none focus:border-accent-1 read-only:bg-accent-5 read-only:text-accent-3";
export const ERROR_TEXT = "mt-1 text-xs text-accent-2";

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  backHref: string;
  canConfirm: boolean;
  confirmLabel?: string;
  onSubmitted?: () => void;
  children?: React.ReactNode;
};

export function StepForm({ action, backHref, canConfirm, confirmLabel = "Confirm", onSubmitted, children }: Props) {
  const [state, formAction, pending] = useActionState(action, EMPTY_FORM_STATE);
  const submitted = Boolean(state.submitted);

  useEffect(() => {
    if (submitted) onSubmitted?.();
  }, [submitted, onSubmitted]);

  return (
    <form action={formAction} noValidate>
      {children}

      {state.error && (
        <p role="alert" className="mt-6 rounded-md bg-accent-2/10 px-4 py-2 text-sm text-accent-2">
          {state.error}
        </p>
      )}

      <div className="mt-10 flex justify-center gap-6 sm:gap-32">
        <Link href={backHref} className="rounded-lg bg-accent-2 px-12 py-2 font-semibold text-white hover:brightness-110">
          Back
        </Link>
        <button
          type="submit"
          disabled={!canConfirm || pending || submitted}
          className="rounded-lg bg-accent-1 px-12 py-2 font-semibold text-white hover:brightness-110 disabled:cursor-not-allowed disabled:bg-accent-6 disabled:text-accent-3/50 disabled:hover:brightness-100"
        >
          {submitted ? "Submitted" : pending ? "Please wait" : confirmLabel}
        </button>
      </div>
    </form>
  );
}