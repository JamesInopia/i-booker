"use client";

import { useEffect, useId, useState } from "react";
import type { ActionResult } from "../review/types";
import { suspendUser } from "./actions";
import { MAX_SUSPENSION_DAYS, type AccountRow } from "./types";

const TONE = {
  danger: "bg-red-600 hover:bg-red-700",
  primary: "bg-accent-1 hover:opacity-90",
} as const;

const PRESET_DAYS = [1, 3, 7, 14, 30];

function Shell({
  title,
  description,
  pending,
  onClose,
  children,
}: {
  title: string;
  description?: string;
  pending: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const titleId = useId();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pending) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, pending]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={() => !pending && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-container p-6 text-left shadow-xl"
      >
        <h2 id={titleId} className="text-xl font-bold">
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-sm text-gray-600">{description}</p>
        )}
        {children}
      </div>
    </div>
  );
}

function Buttons({
  pending,
  onClose,
  onConfirm,
  confirmLabel,
  pendingLabel,
  tone,
}: {
  pending: boolean;
  onClose: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  pendingLabel: string;
  tone: keyof typeof TONE;
}) {
  return (
    <div className="mt-5 flex justify-end gap-3">
      <button
        type="button"
        onClick={onClose}
        disabled={pending}
        className="rounded-full px-5 py-2 font-semibold hover:bg-gray-100 disabled:opacity-50"
      >
        Go back
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={pending}
        className={`rounded-full px-5 py-2 font-semibold text-white disabled:opacity-50 ${TONE[tone]}`}
      >
        {pending ? pendingLabel : confirmLabel}
      </button>
    </div>
  );
}

function useRun(onClose: () => void) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function run(action: () => Promise<ActionResult>) {
    setPending(true);
    setError("");
    try {
      const res = await action();
      if (res.ok) onClose();
      else setError(res.error);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return { pending, error, setError, run };
}

const ErrorText = ({ message }: { message: string }) =>
  message ? (
    <p className="mt-3 text-sm text-red-600" role="alert">
      {message}
    </p>
  ) : null;

export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  pendingLabel,
  tone,
  onClose,
  onConfirm,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  pendingLabel: string;
  tone: keyof typeof TONE;
  onClose: () => void;
  onConfirm: () => Promise<ActionResult>;
}) {
  const { pending, error, run } = useRun(onClose);
  return (
    <Shell
      title={title}
      description={description}
      pending={pending}
      onClose={onClose}
    >
      <ErrorText message={error} />
      <Buttons
        pending={pending}
        onClose={onClose}
        onConfirm={() => run(onConfirm)}
        confirmLabel={confirmLabel}
        pendingLabel={pendingLabel}
        tone={tone}
      />
    </Shell>
  );
}

export function SuspendDialog({
  account,
  onClose,
}: {
  account: AccountRow;
  onClose: () => void;
}) {
  const { pending, error, setError, run } = useRun(onClose);
  const [days, setDays] = useState("7");
  const [indefinite, setIndefinite] = useState(false);
  const [reason, setReason] = useState("");
  const daysId = useId();
  const reasonId = useId();

  function submit() {
    const n = Number(days);
    if (
      !indefinite &&
      (!Number.isInteger(n) || n < 1 || n > MAX_SUSPENSION_DAYS)
    ) {
      setError(
        `Enter a whole number of days between 1 and ${MAX_SUSPENSION_DAYS}.`,
      );
      return;
    }
    if (reason.trim().length < 3) {
      setError("Please enter a reason.");
      return;
    }
    run(() => suspendUser(account.email, indefinite ? null : n, reason));
  }

  return (
    <Shell
      title={`Suspend ${account.name}?`}
      description="They''ll be signed out and won't be able to sign in while suspended. Existing requests aren't affected."
      pending={pending}
      onClose={onClose}
    >
      <label className="mt-4 block text-sm font-semibold" htmlFor={daysId}>
        Number of days
      </label>
      <input
        id={daysId}
        type="number"
        min={1}
        max={MAX_SUSPENSION_DAYS}
        step={1}
        inputMode="numeric"
        value={days}
        disabled={indefinite}
        onChange={(e) => setDays(e.target.value)}
        className="mt-1 w-32 rounded-md border border-gray-300 p-2 text-sm outline-none focus:border-accent-1 disabled:bg-gray-100 disabled:text-gray-400"
      />
      <div className="mt-2 flex flex-wrap gap-2">
        {PRESET_DAYS.map((d) => (
          <button
            key={d}
            type="button"
            disabled={indefinite}
            onClick={() => setDays(String(d))}
            className={`rounded-full border px-3 py-1 text-xs font-semibold disabled:opacity-40 ${
              !indefinite && days === String(d)
                ? "border-accent-1 bg-accent-1 text-white"
                : "border-gray-300 hover:bg-gray-100"
            }`}
          >
            {d} {d === 1 ? "day" : "days"}
          </button>
        ))}
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={indefinite}
          onChange={(e) => setIndefinite(e.target.checked)}
        />
        Suspend indefinitely (until lifted manually)
      </label>

      <label className="mt-4 block text-sm font-semibold" htmlFor={reasonId}>
        Reason for suspension
      </label>
      <textarea
        id={reasonId}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        maxLength={500}
        rows={3}
        placeholder="Reason for suspension"
        className="mt-1 w-full rounded-md border border-gray-300 p-3 text-sm outline-none focus:border-accent-1"
      />

      <ErrorText message={error} />
      <Buttons
        pending={pending}
        onClose={onClose}
        onConfirm={submit}
        confirmLabel="Confirm suspend"
        pendingLabel="Suspending..."
        tone="danger"
      />
    </Shell>
  );
}
