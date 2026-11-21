import type { BookingStatus } from "./definitions";

/** The accommodated (guest) group may never be larger than this, whatever the room holds. */
export const ACCOMMODATION_MAX_GUESTS = 5;

export type AccommodationStatus = "proposed" | "accepted" | "declined" | "cancelled";
export type AccommodationResponse = "accepted" | "declined" | null;
export type AccommodationRole = "host" | "guest";

/**
 * Why two bookings cannot share a room, or null when they can.
 * - the guest group (the later request) must have at most ACCOMMODATION_MAX_GUESTS people
 * - host + guest together must fit the room (capacity null = the room has no recorded limit)
 */
export function accommodationBlocker(input: {
  hostOccupants: number;
  guestOccupants: number;
  capacity: number | null;
}): string | null {
  const { hostOccupants, guestOccupants, capacity } = input;
  if (guestOccupants > ACCOMMODATION_MAX_GUESTS) {
    return `The accommodated group has ${guestOccupants} people. At most ${ACCOMMODATION_MAX_GUESTS} can be accommodated.`;
  }
  const total = hostOccupants + guestOccupants;
  if (capacity !== null && total > capacity) {
    return `Together they would be ${total} people, over the room's capacity of ${capacity}.`;
  }
  return null;
}

type PartnerSummary = {
  requestId: number;
  requestor: string;
  purpose: string;
  status: BookingStatus;
  occupants: number;
};

/** A booking that overlaps this one in the same room (Review tab). */
export type AccommodationCandidate = {
  slotId: number; // this request's schedule
  otherSlotId: number; // the other request's schedule
  partner: PartnerSummary;
  date: string;
  time: string;
  rooms: string;
  myRole: AccommodationRole; // the earlier request hosts, the later one is accommodated
  myOccupants: number;
  capacity: number | null;
  eligible: boolean;
  reason: string | null;
};

/** An accommodation already proposed or agreed for this request (Review tab). */
export type AccommodationLink = {
  id: number;
  status: Extract<AccommodationStatus, "proposed" | "accepted">;
  myRole: AccommodationRole;
  partner: PartnerSummary;
  date: string;
  time: string;
  rooms: string;
  myOccupants: number;
  myResponse: AccommodationResponse;
  partnerResponse: AccommodationResponse;
  remarks: string | null;
  /** Both bookings are still unapproved, so the liaison may still withdraw it. */
  withdrawable: boolean;
};

export type AccommodationPanelData = {
  links: AccommodationLink[];
  candidates: AccommodationCandidate[];
};

/** What a requestor sees on their own Reservation Status page. */
export type AccommodationInvite = {
  id: number;
  status: Extract<AccommodationStatus, "proposed" | "accepted">;
  myRole: AccommodationRole;
  myResponse: AccommodationResponse;
  partnerResponse: AccommodationResponse;
  rooms: string;
  date: string;
  time: string;
  myPurpose: string;
  myOccupants: number;
  partnerRequestor: string;
  partnerPurpose: string;
  partnerOccupants: number;
  remarks: string | null;
};
