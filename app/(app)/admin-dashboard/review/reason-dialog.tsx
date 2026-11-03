"use client";

import { useEffect, useState } from "react";
import type { ActionResult } from "./types";

const CONFIRM_TONE = {
  danger: "bg-red-600 hover:bg-red-700",
  success: "bg-green-600 hover:bg-green-700",
  primary: "bg-accent-1 hover:opacity-90",
} as const;

export function ReasonDialog({
  title,
  description,
  warning,
  label,
  placeholder,
  confirmLabel,
  pendingLabel,
  required,
  tone,
  onClose,
  onConfirm,
}: {
  title: string;
  description?: string;
  warning?: string;
  label: string;
  placeholder?: string;
  confirmLabel: string;
  pendingLabel: string;
  required: boolean;
  tone: keyof typeof CONFIRM_TONE;
  onClose: () => void;
  onConfirm: (text: string) => Promise<ActionResult>;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pending) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, pending]);

  async function submit() {
    if (required && text.trim().length < 3) {
      setError("Please enter a reason.");
      return;
    }
    setPending(true);
    setError("");
    try {
      const res = await onConfirm(text);
      if (res.ok) onClose();
      else setError(res.error);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={() => !pending && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-dialog-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-container p-6 text-left shadow-xl"
      >
        <h2 id="review-dialog-title" className="text-xl font-bold">
          {title}
        </h2>
        {description && <p className="mt-1 text-sm text-gray-600">{description}</p>}
        {warning && (
          <p role="alert" className="mt-3 rounded-md border border-orange-300 bg-orange-50 p-3 text-sm text-orange-800">
            <strong>Warning:</strong> {warning}
          </p>
        )}

        <label className="mt-4 block text-sm font-semibold" htmlFor="review-dialog-text">
          {label}
          {!required && <span className="font-normal text-gray-500"> (optional)</span>}
        </label>
        <textarea
          id="review-dialog-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={500}
          rows={4}
          autoFocus
          placeholder={placeholder}
          className="mt-1 w-full rounded-md border border-gray-300 p-3 text-sm outline-none focus:border-accent-1"
        />
        {error && (
          <p className="mt-2 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

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
            onClick={submit}
            disabled={pending}
            className={`rounded-full px-5 py-2 font-semibold text-white disabled:opacity-50 ${CONFIRM_TONE[tone]}`}
          >
            {pending ? pendingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
