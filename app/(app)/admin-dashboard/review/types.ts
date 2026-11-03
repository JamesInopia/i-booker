import type { BookingStatus } from "@/lib/definitions";

export { STATUS_LABEL, STATUS_TEXT } from "@/lib/booking-status";

export type ReviewSlot = {
  dateISO: string;
  date: string;
  time: string;
  rooms: string[];
  occupants: number;
  details: string;
};

export type ReviewBooking = {
  id: number;
  status: BookingStatus;
  requestor: string;
  email: string;
  contact: string;
  program: string;
  purpose: string;
  requestDateISO: string;
  requestDate: string;
  slots: ReviewSlot[];
  liaisonRemarks: string | null;
  supervisorRemarks: string | null;
  cancelReason: string | null;
  decidedAt: string | null;
};

export type ActionResult = { ok: true } | { ok: false; error: string };

export function uniqueRooms(b: ReviewBooking): string[] {
  return [...new Set(b.slots.flatMap((s) => s.rooms))];
}

export function roomSummary(b: ReviewBooking): string {
  const rooms = uniqueRooms(b);
  if (rooms.length === 0) return "—";
  return rooms.length === 1 ? rooms[0] : `${rooms[0]} +${rooms.length - 1}`;
}

export function scheduleSummary(b: ReviewBooking): string {
  if (b.slots.length === 0) return "—";
  return b.slots.length === 1 ? b.slots[0].date : `${b.slots[0].date} (+${b.slots.length - 1} more)`;
}

export const isOpen = (s: BookingStatus) => s === "pending" || s === "reviewed";
