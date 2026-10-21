export const BOOKING_TAGS = ["make_up_class", "academics", "organization", "workshop", "miscellaneous"] as const;
export type BookingTag = (typeof BOOKING_TAGS)[number];

export const BOOKING_TAG_LABEL: Record<BookingTag, string> = {
  make_up_class: "Make-up Class",
  academics: "Academics",
  organization: "Organization",
  workshop: "Workshop",
  miscellaneous: "Miscellaneous (please specify)",
};

export const REQUEST_STATUSES = ["pending", "returned", "forwarded", "approved", "rejected", "cancelled"] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = {
  pending: "Pending Review",
  returned: "Returned",
  forwarded: "Pending Approval",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
};
