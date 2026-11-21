"use client";

import { useState, useTransition } from "react";
import type { AccommodationInvite } from "@/lib/accommodation-rules";
import { usePendingScreen } from "../../components/loading-provider";
import { respondToAccommodation } from "./actions";

/** Shared-room requests from the Admin Liaison. Both requestors must accept before the room is shared. */
export default function AccommodationInvites({ invites }: { invites: AccommodationInvite[] }) {
  const [pending, startTransition] = useTransition();
  usePendingScreen(pending);
  const [error, setError] = useState<{ id: number; text: string } | null>(null);

  if (invites.length === 0) return null;

  function answer(id: number, accept: boolean) {
    setError(null);
    startTransition(async () => {
      const res = await respondToAccommodation(id, accept);
      if (res.error) setError({ id, text: res.error });
    });
  }

  return (
    <section aria-label="Room sharing requests" className="mb-4 space-y-3">
      {invites.map((i) => {
        const needsMe = i.status === "proposed" && i.myResponse === null;
        return (
          <div key={i.id} className="rounded-[15px] border border-blue-900 bg-white p-4 text-sm">
            <h2 className="text-lg font-bold">
              {i.status === "accepted"
                ? "Room sharing agreed"
                : needsMe
                  ? "Share a room with another booking?"
                  : "Waiting for the other requestor"}
            </h2>
            <p className="mt-1">
              The Admin Liaison proposed that your booking <strong>{i.myPurpose}</strong> ({i.myOccupants} people) share{" "}
              <strong>{i.rooms}</strong> on {i.date}, {i.time} with <strong>{i.partnerRequestor}</strong>&apos;s booking{" "}
              ({i.partnerPurpose}, {i.partnerOccupants} people).{" "}
              {i.myRole === "guest"
                ? "Your group would be accommodated in the room."
                : "You keep the room and the other group joins you."}
            </p>
            {i.remarks && <p className="mt-1 text-gray-600">Note: {i.remarks}</p>}
            <p className="mt-1 text-gray-600">
              {i.status === "accepted"
                ? "Both of you agreed. Neither booking is cancelled when the other is approved."
                : "It only takes effect if you both accept. If either of you declines, the bookings stay separate and only one can be approved."}
            </p>

            {needsMe && (
              <div className="mt-3 flex gap-3">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => answer(i.id, true)}
                  className="rounded-full bg-blue-900 px-5 py-2 font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
                >
                  Accept
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => answer(i.id, false)}
                  className="rounded-full border border-red-600 px-5 py-2 font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  Decline
                </button>
              </div>
            )}
            {i.status === "proposed" && !needsMe && (
              <p className="mt-3 font-semibold text-orange-600">
                You accepted. Waiting for {i.partnerRequestor} to answer.
              </p>
            )}
            {error?.id === i.id && (
              <p role="alert" className="mt-2 text-red-600">
                {error.text}
              </p>
            )}
          </div>
        );
      })}
    </section>
  );
}
