"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { STATUS_LABEL, type ReviewBooking } from "./types";

export function usePrintBookings() {
  const [items, setItems] = useState<ReviewBooking[] | null>(null);

  useEffect(() => {
    if (!items) return;
    const clear = () => setItems(null);
    window.addEventListener("afterprint", clear, { once: true });
    const t = window.setTimeout(() => window.print(), 50);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("afterprint", clear);
    };
  }, [items]);

  return { items, print: setItems };
}

export function PrintPortal({ items }: { items: ReviewBooking[] | null }) {
  if (!items || typeof document === "undefined") return null;
  return createPortal(
    <div className="print-root">
      {items.map((b) => (
        <BookingSheet key={b.id} booking={b} />
      ))}
    </div>,
    document.body,
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4 py-0.5">
      <dt className="w-40 shrink-0 font-semibold">{label}</dt>
      <dd className="min-w-0 flex-1 whitespace-pre-wrap break-words">{value || "—"}</dd>
    </div>
  );
}

function BookingSheet({ booking: b }: { booking: ReviewBooking }) {
  return (
    <article className="print-sheet text-sm text-black">
      <p className="text-xs font-semibold tracking-widest">iACADEMY CEBU</p>
      <h1 className="mt-1 text-2xl font-bold">Room Reservation – Booking Details</h1>
      <p className="mt-1">
        Request No. {b.id} · Status: <strong>{STATUS_LABEL[b.status]}</strong>
      </p>
      <hr className="my-4 border-black" />

      <h2 className="mb-1 text-base font-bold">Requester</h2>
      <dl>
        <Row label="Name" value={b.requestor} />
        <Row label="Email" value={b.email} />
        <Row label="Contact No." value={b.contact} />
        {b.program && <Row label="Program" value={b.program} />}
      </dl>

      <h2 className="mb-1 mt-5 text-base font-bold">Booking</h2>
      <dl>
        <Row label="Purpose" value={b.purpose} />
        <Row label="Date of Request" value={b.requestDate} />
      </dl>

      {b.slots.map((s, i) => (
        <section key={i} className="mt-5">
          <h2 className="mb-1 text-base font-bold">
            {b.slots.length > 1 ? `Schedule ${i + 1} of ${b.slots.length}` : "Schedule"}
          </h2>
          <dl>
            <Row label="Date" value={s.date} />
            <Row label="Time" value={s.time} />
            <Row label="Room" value={s.rooms.join(", ")} />
            <Row label="No. of Occupants" value={String(s.occupants)} />
            <Row label="Description" value={s.details} />
          </dl>
        </section>
      ))}

      <h2 className="mb-1 mt-5 text-base font-bold">Approval</h2>
      <dl>
        <Row label="Approved on" value={b.status === "approved" ? (b.decidedAt ?? "") : ""} />
        {b.liaisonRemarks && <Row label="Liaison remarks" value={b.liaisonRemarks} />}
        {b.supervisorRemarks && <Row label="Supervisor remarks" value={b.supervisorRemarks} />}
      </dl>
    </article>
  );
}
