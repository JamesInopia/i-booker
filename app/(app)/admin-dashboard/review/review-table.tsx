"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cancelApprovedRequests } from "./actions";
import { DownloadDialog, printRequests } from "@/app/components/export-dialogs";
import { reviewHref, type ReviewQuery } from "./filters";
import { ReasonDialog } from "./reason-dialog";
import {
  roomSummary,
  scheduleSummary,
  STATUS_LABEL,
  STATUS_TEXT,
  type ReviewBooking,
} from "./types";

const th = "px-3 py-3 text-left text-sm font-bold";
const td = "px-3 py-3 text-sm";

const buttonPrimary =
  "rounded-md bg-accent-1 px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40";
const buttonDanger =
  "rounded-md bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40";
const buttonOutline =
  "rounded-md border border-accent-1 bg-container px-4 py-1.5 text-sm font-semibold text-accent-1 hover:bg-accent-4";

export function ReviewTable({
  bookings,
  query,
}: {
  bookings: ReviewBooking[];
  query: ReviewQuery;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [cancelIds, setCancelIds] = useState<number[] | null>(null);
  const [downloadIds, setDownloadIds] = useState<number[] | null>(null);
  const allRef = useRef<HTMLInputElement>(null);

  const chosen = useMemo(
    () => bookings.filter((b) => selected.has(b.id)),
    [bookings, selected],
  );
  const approvedChosen = chosen.filter((b) => b.status === "approved");
  const allApproved =
    chosen.length > 0 && approvedChosen.length === chosen.length;
  const allSelected = bookings.length > 0 && chosen.length === bookings.length;
  const someSelected = chosen.length > 0 && !allSelected;

  useEffect(() => {
    if (allRef.current) allRef.current.indeterminate = someSelected;
  }, [someSelected]);

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(bookings.map((b) => b.id)));

  return (
    <section className="rounded-lg bg-container p-4 shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="border-b border-black">
              <th scope="col" className="w-10 px-3 py-3">
                <input
                  ref={allRef}
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  disabled={bookings.length === 0}
                  aria-label="Select all requests"
                />
              </th>
              <th scope="col" className={th}>
                Booking Status
              </th>
              <th scope="col" className={th}>
                Requester Name
              </th>
              <th scope="col" className={th}>
                Purpose of Booking
              </th>
              <th scope="col" className={th}>
                Room Name
              </th>
              <th scope="col" className={th}>
                Date of Request
              </th>
              <th scope="col" className={th}>
                Scheduled Date
              </th>
            </tr>
          </thead>
          <tbody>
            {bookings.length === 0 && (
              <tr>
                <td colSpan={7} className="py-10 text-center text-gray-500">
                  No requests match your filters.
                </td>
              </tr>
            )}
            {bookings.map((b) => {
              const isSelected = selected.has(b.id);
              const open = () => router.push(reviewHref(query, b.id));
              return (
                <tr
                  key={b.id}
                  tabIndex={0}
                  onClick={open}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.target === e.currentTarget)
                      open();
                  }}
                  aria-label={`Open request from ${b.requestor}`}
                  className={`cursor-pointer border-b border-accent-6 hover:bg-accent-4 focus-visible:bg-accent-4 focus-visible:outline-none ${isSelected ? "bg-accent-5" : ""}`}
                >
                  <td
                    className="px-3 py-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggle(b.id)}
                      aria-label={`Select request ${b.id} from ${b.requestor}`}
                    />
                  </td>
                  <td
                    className={`${td} font-semibold ${STATUS_TEXT[b.status]}`}
                  >
                    {STATUS_LABEL[b.status]}
                  </td>
                  <td className={td}>{b.requestor}</td>
                  <td className={td}>{b.purpose}</td>
                  <td className={td}>{roomSummary(b)}</td>
                  <td className={td}>{b.requestDate}</td>
                  <td className={td}>{scheduleSummary(b)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {chosen.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-end gap-3 border-t border-accent-6 pt-4">
          <p className="mr-auto text-sm" aria-live="polite">
            <strong>{chosen.length}</strong> selected
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className={`ml-3 ${buttonOutline}`}
            >
              Clear
            </button>
          </p>
          <button
            type="button"
            className={buttonPrimary}
            disabled={approvedChosen.length === 0}
            title={
              approvedChosen.length === 0
                ? "Only approved requests can be printed"
                : undefined
            }
            onClick={() => printRequests(approvedChosen.map((b) => b.id))}
          >
            Print Details
            {approvedChosen.length > 0 &&
            approvedChosen.length !== chosen.length
              ? ` (${approvedChosen.length})`
              : ""}
          </button>
          <button
            type="button"
            className={buttonPrimary}
            disabled={approvedChosen.length === 0}
            title={
              approvedChosen.length === 0
                ? "Only approved requests can be downloaded"
                : undefined
            }
            onClick={() => setDownloadIds(approvedChosen.map((b) => b.id))}
          >
            Download Details
            {approvedChosen.length > 0 &&
            approvedChosen.length !== chosen.length
              ? ` (${approvedChosen.length})`
              : ""}
          </button>
          <button
            type="button"
            className={buttonDanger}
            disabled={!allApproved}
            title={
              !allApproved
                ? "Every selected request must be approved"
                : undefined
            }
            onClick={() => setCancelIds(chosen.map((b) => b.id))}
          >
            Cancel Requests
          </button>
        </div>
      )}

      {downloadIds && (
        <DownloadDialog
          ids={downloadIds}
          onClose={() => setDownloadIds(null)}
        />
      )}

      {cancelIds && (
        <ReasonDialog
          title={
            cancelIds.length === 1
              ? "Cancel this request?"
              : `Cancel ${cancelIds.length} requests?`
          }
          description="The booking will be permanently deleted. This can't be undone."
          label="Reason for cancellation"
          placeholder="Reason for cancellation"
          confirmLabel="Confirm cancel"
          pendingLabel="Cancelling..."
          required
          tone="danger"
          onClose={() => setCancelIds(null)}
          onConfirm={async (reason) => {
            const res = await cancelApprovedRequests(cancelIds, reason);
            if (res.ok) setSelected(new Set());
            return res;
          }}
        />
      )}
    </section>
  );
}
