export const NOTIFICATION_TYPES = [
  "booking_submitted", // liaison: a new booking needs review
  "booking_reviewed", // requestor: sent for approval / supervisor: ready to approve
  "booking_approved", // requestor
  "booking_rejected", // requestor
  "booking_cancelled", // requestor (approved booking cancelled by an admin)
  "review_ping", // supervisor: liaison reminder
  "report_submitted", // developer: someone reported a problem
  "report_resolved", // the person who reported it
  "accommodation_available", // liaison: two unapproved bookings could share a room
  "accommodation_proposed", // both requestors: asked to accept sharing the room
  "accommodation_accepted", // both requestors + liaison: everyone agreed
  "accommodation_declined", // other requestor + liaison: someone said no
  "accommodation_withdrawn", // requestors: the arrangement no longer stands
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
