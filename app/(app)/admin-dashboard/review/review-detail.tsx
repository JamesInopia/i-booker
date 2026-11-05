"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  approveRequest,
  cancelApprovedRequests,
  rejectRequest,
  sendForApproval,
} from "./actions";
import { DownloadDialog, printRequests } from "@/app/components/export-dialogs";
import { ReasonDialog } from "./reason-dialog";
import { isOpen, STATUS_LABEL, STATUS_TEXT, type ReviewBooking } from "./types";
import type { Role } from "@/lib/session";

export type ScrollerOption = { id: number; label: string; href: string };

type DialogKind = "send" | "approve" | "reject" | "cancel";

const btn = "rounded-md px-6 py-2 text-sm font-semibold disabled:opacity-50";
const btnPrimary = `${btn} bg-accent-1 text-white hover:opacity-90`;
const btnOutline = `${btn} border border-accent-1 bg-container text-accent-1 hover:bg-accent-4`;
const btnSuccess = `${btn} bg-green-600 text-white hover:bg-green-700`;
const btnDanger = `${btn} bg-red-600 text-white hover:bg-red-700`;
const btnDangerOutline = `${btn} border border-red-600 bg-container text-red-600 hover:bg-red-50`;

export function ReviewDetail({
  booking: b,
  role,
  backHref,
  options,
}: {
  booking: ReviewBooking;
  role: Role;
  backHref: string;
  options: ScrollerOption[];
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<DialogKind | null>(null);
  const [showDownload, setShowDownload] = useState(false);

  const approved = b.status === "approved";
  const canSend = role === "admin_liaison" && b.status === "pending";
  const canApprove = role === "admin_supervisor" && isOpen(b.status);
  const canReject = isOpen(b.status);
  const unreviewed = b.status === "pending";

  let waitingNote = "";
  if (role === "admin_liaison" && b.status === "reviewed")
    waitingNote = "Sent to the Admin Supervisor for approval.";

  const closeDialog = () => setDialog(null);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={backHref}
          className="flex items-center gap-2 text-xl hover:text-accent-1"
        >
          <span aria-hidden="true" className="text-3xl leading-none">
            ←
          </span>
          Back to all Bookings
        </Link>
        <RequestScroller currentId={b.id} options={options} />
      </div>

      <section className="flex min-h-112 flex-col rounded-lg bg-container p-6 shadow-sm">
        <h2 className={`text-3xl font-bold ${STATUS_TEXT[b.status]}`}>
          {STATUS_LABEL[b.status]}
        </h2>

        <div className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2">
          <Field label="Requestor's Name" value={b.requestor} />
          <Field label="Requestor's Email" value={b.email} />

          {b.slots.map((s, i) => (
            <SlotFields key={i} index={i} total={b.slots.length} slot={s} />
          ))}

          <Field label="Booking Purpose" value={b.purpose} />
          <Field label="Contact No." value={b.contact} />
          {b.program && <Field label="Program" value={b.program} />}
        </div>

        <div className="mt-4">
          <p className="text-xs font-semibold">Booking Description</p>
          <div className="mt-1 min-h-28 whitespace-pre-wrap rounded-md border border-accent-6 bg-container p-3 text-base">
            {b.slots.length === 1
              ? b.slots[0].details || "—"
              : b.slots
                  .map((s, i) => `Schedule ${i + 1}: ${s.details || "—"}`)
                  .join("\n")}
          </div>
        </div>

        {(b.liaisonRemarks || b.supervisorRemarks || b.cancelReason) && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {b.liaisonRemarks && (
              <Field label="Liaison Remarks" value={b.liaisonRemarks} />
            )}
            {b.supervisorRemarks && (
              <Field label="Supervisor Remarks" value={b.supervisorRemarks} />
            )}
            {b.cancelReason && (
              <Field label="Cancellation Reason" value={b.cancelReason} />
            )}
          </div>
        )}

        <div className="mt-auto flex flex-wrap items-center justify-end gap-3 pt-6">
          {waitingNote && (
            <p className="mr-auto text-sm text-gray-600">{waitingNote}</p>
          )}

          {approved && (
            <>
              <button
                type="button"
                className={btnPrimary}
                onClick={() => printRequests([b.id])}
              >
                Print Details
              </button>
              <button
                type="button"
                className={btnPrimary}
                onClick={() => setShowDownload(true)}
              >
                Download Details
              </button>
              <button
                type="button"
                className={btnDanger}
                onClick={() => setDialog("cancel")}
              >
                Cancel Request
              </button>
            </>
          )}

          {canSend && (
            <button
              type="button"
              className={btnPrimary}
              onClick={() => setDialog("send")}
            >
              Send for Approval
            </button>
          )}
          {canApprove && (
            <button
              type="button"
              className={btnSuccess}
              onClick={() => setDialog("approve")}
            >
              Approve Request
            </button>
          )}
          {canReject && (
            <button
              type="button"
              className={btnDangerOutline}
              onClick={() => setDialog("reject")}
            >
              Reject Request
            </button>
          )}
        </div>
      </section>

      {showDownload && (
        <DownloadDialog ids={[b.id]} onClose={() => setShowDownload(false)} />
      )}

      {dialog === "send" && (
        <ReasonDialog
          title="Send for approval?"
          description="This forwards the request to the Admin Supervisor."
          label="Remarks for the supervisor"
          confirmLabel="Send for approval"
          pendingLabel="Sending..."
          required={false}
          tone="primary"
          onClose={closeDialog}
          onConfirm={(text) => sendForApproval(b.id, text)}
        />
      )}
      {dialog === "approve" && (
        <ReasonDialog
          title={
            unreviewed ? "Approve without review?" : "Approve this request?"
          }
          description="The room will be reserved for the requester."
          warning={
            unreviewed
              ? "This request hasn't been reviewed by the Admin Liaison yet. Approving it now skips that review."
              : undefined
          }
          label="Remarks"
          confirmLabel={unreviewed ? "Approve anyway" : "Approve"}
          pendingLabel="Approving..."
          required={false}
          tone="success"
          onClose={closeDialog}
          onConfirm={(text) => approveRequest(b.id, text)}
        />
      )}
      {dialog === "reject" && (
        <ReasonDialog
          title="Reject this request?"
          description="The request will be permanently deleted. This can't be undone."
          label="Reason for rejection"
          placeholder="Reason for rejection"
          confirmLabel="Reject"
          pendingLabel="Rejecting..."
          required
          tone="danger"
          onClose={closeDialog}
          onConfirm={async (text) => {
            const res = await rejectRequest(b.id, text);
            if (res.ok) router.push(backHref);
            return res;
          }}
        />
      )}
      {dialog === "cancel" && (
        <ReasonDialog
          title="Cancel this request?"
          description="The booking will be permanently deleted. This can't be undone."
          label="Reason for cancellation"
          placeholder="Reason for cancellation"
          confirmLabel="Confirm cancel"
          pendingLabel="Cancelling..."
          required
          tone="danger"
          onClose={closeDialog}
          onConfirm={async (text) => {
            const res = await cancelApprovedRequests([b.id], text);
            if (res.ok) router.push(backHref);
            return res;
          }}
        />
      )}
    </div>
  );
}

function RequestScroller({
  currentId,
  options,
}: {
  currentId: number;
  options: ScrollerOption[];
}) {
  const router = useRouter();
  const index = options.findIndex((o) => o.id === currentId);
  const prev = index > 0 ? options[index - 1] : null;
  const next =
    index >= 0 && index < options.length - 1 ? options[index + 1] : null;

  const arrow =
    "flex h-8 w-8 items-center justify-center rounded-full border border-accent-6 bg-container text-sm";

  return (
    <div
      className="flex items-center gap-2"
      role="group"
      aria-label="Browse requests"
    >
      <select
        value={currentId}
        aria-label="Jump to request"
        onChange={(e) => {
          const target = options.find((o) => o.id === Number(e.target.value));
          if (target) router.push(target.href);
        }}
        className="h-8 w-64 max-w-[60vw] rounded-md border border-accent-6 bg-container px-2 text-xs outline-none focus:border-accent-1"
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>

      {prev ? (
        <Link
          href={prev.href}
          aria-label="Previous request"
          className={`${arrow} hover:bg-accent-4`}
        >
          ‹
        </Link>
      ) : (
        <span aria-disabled="true" className={`${arrow} opacity-40`}>
          ‹
        </span>
      )}

      {next ? (
        <Link
          href={next.href}
          aria-label="Next request"
          className={`${arrow} hover:bg-accent-4`}
        >
          ›
        </Link>
      ) : (
        <span aria-disabled="true" className={`${arrow} opacity-40`}>
          ›
        </span>
      )}

      <span className="ml-1 text-xs text-gray-600">
        {index + 1} of {options.length}
      </span>
    </div>
  );
}

function SlotFields({
  index,
  total,
  slot,
}: {
  index: number;
  total: number;
  slot: ReviewBooking["slots"][number];
}) {
  return (
    <>
      {total > 1 && (
        <p className="text-sm font-bold sm:col-span-2">{`Schedule ${index + 1} of ${total}`}</p>
      )}
      <Field label="Date" value={slot.date} />
      <Field label="Room" value={slot.rooms.join(", ") || "—"} />
      <Field label="Time" value={slot.time} />
      <Field label="No. of Occupants" value={String(slot.occupants)} />
    </>
  );
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold">{label}</p>
      <div className="mt-1 min-h-8 whitespace-pre-wrap wrap-break-word rounded-md border border-accent-6 bg-container px-3 py-1.5 text-sm">
        {value}
      </div>
    </div>
  );
}
