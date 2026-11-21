"use client";

import { useState } from "react";
import {
  ACCOMMODATION_MAX_GUESTS,
  type AccommodationCandidate,
  type AccommodationLink,
  type AccommodationPanelData,
  type AccommodationResponse,
} from "@/lib/accommodation-rules";
import { allowAccommodation, withdrawAccommodationRequest } from "./actions";
import { ReasonDialog } from "./reason-dialog";

const btn = "rounded-md px-4 py-1.5 text-sm font-semibold disabled:opacity-50";
const btnPrimary = `${btn} bg-accent-1 text-white hover:opacity-90`;
const btnDangerOutline = `${btn} border border-red-600 bg-container text-red-600 hover:bg-red-50`;

type Dialog =
  | { kind: "allow"; candidate: AccommodationCandidate }
  | { kind: "withdraw"; link: AccommodationLink };

const answerText = (r: AccommodationResponse) =>
  r === "accepted" ? "Accepted" : r === "declined" ? "Declined" : "Waiting for answer";
const answerTone = (r: AccommodationResponse) =>
  r === "accepted" ? "text-green-700" : r === "declined" ? "text-red-600" : "text-orange-600";

/** Room accommodation for one request. Lives in the Review tab; only the Admin Liaison can act. */
export function AccommodationPanel({
  panel,
  canManage,
}: {
  panel: AccommodationPanelData;
  canManage: boolean;
}) {
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const { links, candidates } = panel;
  if (links.length === 0 && candidates.length === 0) return null;

  return (
    <section data-tour="accommodation" className="mt-6 rounded-md border border-accent-6 p-4">
      <h3 className="text-lg font-bold">Room Accommodation</h3>
      <p className="mt-1 text-sm text-gray-600">
        Before a request is sent for approval, two bookings can share a room if the combined occupants fit the room and the later
        booking has at most {ACCOMMODATION_MAX_GUESTS} people. Both requestors must accept.
      </p>

      {links.length > 0 && (
        <ul className="mt-3 space-y-3">
          {links.map((l) => (
            <li key={l.id} className="rounded-md bg-accent-4 p-3 text-sm">
              <p className="font-semibold">
                {l.status === "accepted" ? "Agreed" : "Awaiting agreement"}: shares {l.rooms} with{" "}
                {l.partner.requestor}
              </p>
              <p className="mt-1">
                {l.date}, {l.time} · This booking ({l.myRole === "host" ? "keeps the room" : "accommodated"}):{" "}
                {l.myOccupants} people · {l.partner.requestor} ({l.partner.purpose}): {l.partner.occupants} people
              </p>
              <p className="mt-1">
                This requestor: <span className={answerTone(l.myResponse)}>{answerText(l.myResponse)}</span> ·{" "}
                {l.partner.requestor}:{" "}
                <span className={answerTone(l.partnerResponse)}>{answerText(l.partnerResponse)}</span>
              </p>
              {l.status === "accepted" && (
                <p className="mt-1 text-gray-600">
                  Both bookings move together: sending for approval or approving one applies to the other.
                </p>
              )}
              {l.remarks && <p className="mt-1 text-gray-600">Note: {l.remarks}</p>}
              {canManage && l.withdrawable && (
                <div className="mt-2">
                  <button type="button" className={btnDangerOutline} onClick={() => setDialog({ kind: "withdraw", link: l })}>
                    Withdraw
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {candidates.length > 0 && (
        <>
          <p className="mt-4 text-sm font-semibold">Overlapping bookings still in review for the same room</p>
          <ul className="mt-2 space-y-3">
            {candidates.map((c) => (
              <li
                key={`${c.slotId}-${c.otherSlotId}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-accent-6 p-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-semibold">
                    {c.partner.requestor} · {c.partner.purpose}
                  </p>
                  <p>
                    {c.rooms} · {c.date}, {c.time}
                  </p>
                  <p>
                    This booking: {c.myOccupants} people ({c.myRole === "host" ? "keeps the room" : "would be accommodated"}) ·{" "}
                    {c.partner.requestor}: {c.partner.occupants} people ·{" "}
                    {c.capacity === null ? "No room limit recorded" : `Room holds ${c.capacity}`}
                  </p>
                  {c.reason ? (
                    <p className="mt-1 text-red-600">Can&apos;t share: {c.reason}</p>
                  ) : (
                    <p className="mt-1 text-green-700">
                      Fits: {c.myOccupants + c.partner.occupants} people together.
                    </p>
                  )}
                </div>
                {canManage && (
                  <button
                    type="button"
                    className={btnPrimary}
                    disabled={!c.eligible}
                    title={c.reason ?? undefined}
                    onClick={() => setDialog({ kind: "allow", candidate: c })}
                  >
                    Allow Accommodation
                  </button>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      {dialog?.kind === "allow" && (
        <ReasonDialog
          title="Allow this accommodation?"
          description={`Both requestors will be asked to accept sharing ${dialog.candidate.rooms}. It only takes effect once both agree.`}
          label="Note for the requestors"
          confirmLabel="Allow accommodation"
          pendingLabel="Sending..."
          required={false}
          tone="primary"
          onClose={() => setDialog(null)}
          onConfirm={(text) => allowAccommodation(dialog.candidate.slotId, dialog.candidate.otherSlotId, text)}
        />
      )}
      {dialog?.kind === "withdraw" && (
        <ReasonDialog
          title="Withdraw this accommodation?"
          description="Both requestors will be told the bookings no longer share the room."
          label="Note for the requestors"
          confirmLabel="Withdraw"
          pendingLabel="Withdrawing..."
          required={false}
          tone="danger"
          onClose={() => setDialog(null)}
          onConfirm={(text) => withdrawAccommodationRequest(dialog.link.id, text)}
        />
      )}
    </section>
  );
}
