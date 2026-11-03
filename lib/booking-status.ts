import type { BookingStatus } from "./definitions";

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
