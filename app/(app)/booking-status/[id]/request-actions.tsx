"use client";

import { useState, useTransition } from "react";
import { usePendingScreen } from "../../../components/loading-provider";
import { startEdit } from "../../booking/actions";
import { cancelRequest } from "../actions";

/**
 * Edit / Cancel for a request that is still open. These used to live in the "..." menu of the
 * Booking Status table; now that a row opens its details directly, they live here.
 * Only a pending request can be edited; a pending or reviewed one can be cancelled.
 */
export default function RequestActions({ id, status }: { id: number; status: "pending" | "reviewed" }) {
  const [pending, startTransition] = useTransition();
  usePendingScreen(pending);
  const [showCancel, setShowCancel] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  function openCancel() {
    setReason("");
    setError("");
    setShowCancel(true);
  }

  function submitCancel() {
    if (reason.trim().length < 3) {
      setError("Please enter a reason.");
      return;
    }
    startTransition(async () => {
      const res = await cancelRequest(id, reason);
      if (res?.error) {
        setError(res.error);
        return;
      }
      setShowCancel(false);
    });
  }

  function onEdit() {
    startTransition(async () => {
      await startEdit(id);
    });
  }

  return (
    <>
      <div className="sticky bottom-0 z-20 -mx-6 -mb-6 mt-6 flex flex-wrap items-center justify-end gap-3 rounded-b-xl border-t border-accent-6 bg-container px-6 py-4 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] md:-mx-8 md:-mb-8 md:px-8">
        {status === "pending" && (
          <button
            type="button"
            onClick={onEdit}
            disabled={pending}
            className="rounded-md bg-accent-1 px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            Edit Request
          </button>
        )}
        <button
          type="button"
          onClick={openCancel}
          disabled={pending}
          className="rounded-md bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
        >
          Cancel Request
        </button>
      </div>

      {showCancel && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !pending && setShowCancel(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-title"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-white p-6 text-left shadow-xl"
          >
            <h2 id="cancel-title" className="text-xl font-bold">
              Cancel this request?
            </h2>
            <p className="mt-1 text-sm text-gray-600">Please tell us why you&apos;re cancelling.</p>

            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              rows={4}
              autoFocus
              className="mt-4 w-full rounded-md border border-gray-300 p-3 text-sm outline-none focus:border-blue-900"
              placeholder="Reason for cancellation"
            />
            {error && (
              <p className="mt-2 text-sm text-red-600" role="alert">
                {error}
              </p>
            )}

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCancel(false)}
                disabled={pending}
                className="rounded-full px-5 py-2 font-semibold hover:bg-gray-100 disabled:opacity-50"
              >
                Keep request
              </button>
              <button
                type="button"
                onClick={submitCancel}
                disabled={pending}
                className="rounded-full bg-red-600 px-5 py-2 font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {pending ? "Cancelling..." : "Confirm cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
