export const NOTIFICATION_TYPES = [
  "booking_submitted", // liaison: a new booking needs review
  "booking_reviewed", // requestor: sent for approval / supervisor: ready to approve
  "booking_approved", // requestor
  "booking_rejected", // requestor
  "booking_cancelled", // requestor (approved booking cancelled by an admin)
  "review_ping", // supervisor: liaison reminder
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export type NotificationItem = {
  id: number;
  type: NotificationType;
  message: string;
  href: string;
  read: boolean;
  createdAt: string; // ISO
};

export type NotificationsPayload = {
  items: NotificationItem[];
  unread: number;
};
