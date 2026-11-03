import type { BookingStatus } from "@/lib/definitions";

export const STATUS_LABEL: Record<BookingStatus, string> = {
  pending: "In Review",
  reviewed: "Pending Approval",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

export const STATUS_TEXT: Record<BookingStatus, string> = {
  pending: "text-blue-600",
  reviewed: "text-orange-500",
  approved: "text-green-600",
  rejected: "text-red-600",
  cancelled: "text-gray-400",
};

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
