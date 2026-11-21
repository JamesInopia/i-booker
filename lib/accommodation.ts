import "server-only";
import { and, asc, eq, inArray, ne, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import {
  accommodations,
  activityTypes,
  reservationRequests,
  reservationSlotRooms,
  reservationSlots,
  rooms,
} from "@/db/schema";
import {
  accommodationBlocker,
  type AccommodationCandidate,
  type AccommodationInvite,
  type AccommodationLink,
  type AccommodationPanelData,
  type AccommodationResponse,
} from "./accommodation-rules";
import type { BookingStatus } from "./definitions";
import {
  adminReviewHref,
  clip,
  createNotifications,
  formatClock,
  formatDay,
  getRequestInfo,
  myBookingsListHref,
  userIdsWithRole,
  type Actor,
  type NewNotification,
} from "./notifications";

export type AccommodationResult = { ok: true } | { ok: false; error: string };
const fail = (error: string): AccommodationResult => ({ ok: false, error });

/** Not yet decided. An approval rejects overlapping bookings that are still in this state. */
const OPEN: BookingStatus[] = ["pending", "reviewed"];
/** "In Review": the liaison's stage, right before Pending Approval. Accommodations are decided here. */
const IN_REVIEW: BookingStatus[] = ["pending"];
const LIVE = ["proposed", "accepted"];

// ---------------------------------------------------------------------------
// Loading schedules (one entry per slot, with every room it uses)
// ---------------------------------------------------------------------------
type SlotInfo = {
  slotId: number;
  requestId: number;
  status: BookingStatus;
  requestDate: Date;
  ownerId: string;
  requestor: string;
  purpose: string;
  date: string; // YYYY-MM-DD
  start: string; // HH:MM:SS
  end: string;
  occupants: number;
  rooms: { id: number; name: string; capacity: number | null }[];
};

async function loadSlots(where: SQL | undefined): Promise<SlotInfo[]> {
  const rows = await db
    .select({
      slotId: reservationSlots.slotId,
      requestId: reservationRequests.requestId,
      status: reservationRequests.status,
      requestDate: reservationRequests.requestDate,
      ownerId: reservationRequests.userId,
      requestor: reservationRequests.requestor,
      natureOther: reservationRequests.natureOther,
      activityName: activityTypes.name,
      date: reservationSlots.dateOfActivity,
      start: reservationSlots.startTime,
      end: reservationSlots.endTime,
      occupants: reservationSlots.occupantQuantity,
      roomId: rooms.roomId,
      roomName: rooms.name,
      capacity: rooms.maxCapacity,
    })
    .from(reservationSlots)
    .innerJoin(reservationRequests, eq(reservationRequests.requestId, reservationSlots.requestId))
    .innerJoin(activityTypes, eq(activityTypes.activityTypeId, reservationRequests.activityTypeId))
    .innerJoin(reservationSlotRooms, eq(reservationSlotRooms.slotId, reservationSlots.slotId))
    .innerJoin(rooms, eq(rooms.roomId, reservationSlotRooms.roomId))
    .where(where)
    .orderBy(asc(reservationSlots.dateOfActivity), asc(reservationSlots.startTime), asc(reservationSlots.slotId));

  const bySlot = new Map<number, SlotInfo>();
  for (const r of rows) {
    const slot =
      bySlot.get(r.slotId) ??
      ({
        slotId: r.slotId,
        requestId: r.requestId,
        status: r.status,
        requestDate: r.requestDate,
        ownerId: r.ownerId,
        requestor: r.requestor,
        purpose: r.natureOther || r.activityName,
        date: r.date,
        start: r.start,
        end: r.end,
        occupants: r.occupants,
        rooms: [],
      } satisfies SlotInfo);
    slot.rooms.push({ id: r.roomId, name: r.roomName, capacity: r.capacity });
    bySlot.set(r.slotId, slot);
  }
  return [...bySlot.values()];
}

/** Bookings with one of `statuses` (other than `requestId`) on the same dates and in the same rooms as `mine`. */
function loadOverlapPool(mine: SlotInfo[], requestId: number, statuses: BookingStatus[]): Promise<SlotInfo[]> {
  return loadSlots(
    and(
      inArray(reservationSlots.dateOfActivity, [...new Set(mine.map((s) => s.date))]),
      inArray(reservationSlotRooms.roomId, [...new Set(mine.flatMap((s) => s.rooms.map((r) => r.id)))]),
      inArray(reservationRequests.status, statuses),
      ne(reservationRequests.requestId, requestId),
    ),
  );
}

// ---------------------------------------------------------------------------
// Pair rules
// ---------------------------------------------------------------------------
const slotsOverlap = (a: SlotInfo, b: SlotInfo) => a.date === b.date && a.start < b.end && a.end > b.start;

const isEarlier = (a: SlotInfo, b: SlotInfo) =>
  a.requestDate.getTime() !== b.requestDate.getTime()
    ? a.requestDate.getTime() < b.requestDate.getTime()
    : a.requestId < b.requestId;

/** null when the two schedules don't share a room at overlapping times. */
function assess(a: SlotInfo, b: SlotInfo) {
  if (a.requestId === b.requestId || !slotsOverlap(a, b)) return null;
  const bRooms = new Set(b.rooms.map((r) => r.id));
  const shared = a.rooms.filter((r) => bRooms.has(r.id));
  if (shared.length === 0) return null;

  // The earlier request keeps the room (host); the later one is accommodated (guest).
  const [host, guest] = isEarlier(a, b) ? [a, b] : [b, a];
  const capacity = shared.some((r) => r.capacity === null)
    ? null
    : shared.reduce((sum, r) => sum + (r.capacity ?? 0), 0);
  const reason = accommodationBlocker({
    hostOccupants: host.occupants,
    guestOccupants: guest.occupants,
    capacity,
  });
  return { host, guest, capacity, reason, roomNames: shared.map((r) => r.name).join(", ") };
}

const dayLabel = (s: SlotInfo) => formatDay(s.date);
const timeLabel = (s: SlotInfo) => `${formatClock(s.start)} - ${formatClock(s.end)}`;
const where = (s: SlotInfo, roomNames: string) => `${roomNames} on ${dayLabel(s)}, ${timeLabel(s)}`;

type AccRow = typeof accommodations.$inferSelect;

function liveRowsFor(slotIds: number[]): Promise<AccRow[]> {
  if (slotIds.length === 0) return Promise.resolve([]);
  return db
    .select()
    .from(accommodations)
    .where(
      and(
        inArray(accommodations.status, LIVE),
        or(inArray(accommodations.guestSlotId, slotIds), inArray(accommodations.hostSlotId, slotIds)),
      ),
    );
}

const asResponse = (v: string | null): AccommodationResponse => (v === "accepted" || v === "declined" ? v : null);

// ---------------------------------------------------------------------------
// Review tab: what the liaison sees for one request
// ---------------------------------------------------------------------------
export async function getAccommodationPanel(requestId: number): Promise<AccommodationPanelData> {
  const mine = await loadSlots(eq(reservationSlots.requestId, requestId));
  if (mine.length === 0) return { links: [], candidates: [] };

  const inReview = IN_REVIEW.includes(mine[0].status);
  const others = inReview ? await loadOverlapPool(mine, requestId, IN_REVIEW) : [];

  const mineIds = new Set(mine.map((s) => s.slotId));
  const live = await liveRowsFor([...mineIds, ...others.map((s) => s.slotId)]);
  const taken = new Set(live.flatMap((a) => [a.guestSlotId, a.hostSlotId]));

  // Accommodations this request already takes part in (the partner may be approved, so load them directly).
  const mineLive = live.filter((a) => mineIds.has(a.guestSlotId) || mineIds.has(a.hostSlotId));
  const partnerSlots = await loadSlots(
    inArray(
      reservationSlots.slotId,
      mineLive.map((a) => (mineIds.has(a.hostSlotId) ? a.guestSlotId : a.hostSlotId)),
    ),
  );
  const slotById = new Map([...mine, ...partnerSlots].map((s) => [s.slotId, s]));

  const links: AccommodationLink[] = [];
  for (const a of mineLive) {
    const iAmHost = mineIds.has(a.hostSlotId);
    const my = slotById.get(iAmHost ? a.hostSlotId : a.guestSlotId);
    const other = slotById.get(iAmHost ? a.guestSlotId : a.hostSlotId);
    if (!my || !other) continue;
    const otherRooms = new Set(other.rooms.map((r) => r.id));
    links.push({
      id: a.accommodateId,
      status: a.status as AccommodationLink["status"],
      myRole: iAmHost ? "host" : "guest",
      partner: {
        requestId: other.requestId,
        requestor: other.requestor,
        purpose: other.purpose,
        status: other.status,
        occupants: other.occupants,
      },
      date: dayLabel(my),
      time: timeLabel(my),
      rooms: my.rooms.filter((r) => otherRooms.has(r.id)).map((r) => r.name).join(", "),
      myOccupants: my.occupants,
      myResponse: asResponse(iAmHost ? a.hostResponse : a.guestResponse),
      partnerResponse: asResponse(iAmHost ? a.guestResponse : a.hostResponse),
      remarks: a.remarks,
      withdrawable: IN_REVIEW.includes(my.status) && IN_REVIEW.includes(other.status),
    });
  }

  const linkedPairs = new Set(live.map((a) => `${a.hostSlotId}:${a.guestSlotId}`));
  const candidates: AccommodationCandidate[] = [];
  for (const m of mine) {
    for (const o of others) {
      const pair = assess(m, o);
      if (!pair) continue;
      if (linkedPairs.has(`${pair.host.slotId}:${pair.guest.slotId}`)) continue; // shown under links
      let reason = pair.reason;
      if (!reason && taken.has(m.slotId)) reason = "This schedule is already part of another accommodation.";
      if (!reason && taken.has(o.slotId)) reason = "The other booking is already part of another accommodation.";
      candidates.push({
        slotId: m.slotId,
        otherSlotId: o.slotId,
        partner: {
          requestId: o.requestId,
          requestor: o.requestor,
          purpose: o.purpose,
          status: o.status,
          occupants: o.occupants,
        },
        date: dayLabel(m),
        time: timeLabel(m),
        rooms: pair.roomNames,
        myRole: pair.host.slotId === m.slotId ? "host" : "guest",
        myOccupants: m.occupants,
        capacity: pair.capacity,
        eligible: reason === null,
        reason,
      });
    }
  }
  return { links, candidates };
}

// ---------------------------------------------------------------------------
// Liaison: allow / withdraw
// ---------------------------------------------------------------------------
function isUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string } } | null;
  return e?.code === "23505" || e?.cause?.code === "23505";
}

export async function proposeAccommodation(
  actor: Actor,
  slotA: number,
  slotB: number,
  remarks: string | null,
): Promise<AccommodationResult> {
  if (slotA === slotB) return fail("Choose two different bookings.");
  const slots = await loadSlots(inArray(reservationSlots.slotId, [slotA, slotB]));
  const a = slots.find((s) => s.slotId === slotA);
  const b = slots.find((s) => s.slotId === slotB);
  if (!a || !b) return fail("One of these bookings no longer exists. Refresh the page.");
  if (!IN_REVIEW.includes(a.status) || !IN_REVIEW.includes(b.status)) {
    return fail("An accommodation can only be arranged while both bookings are still in review, before they are sent for approval.");
  }

  const pair = assess(a, b);
  if (!pair) return fail("These bookings don't share a room at overlapping times.");
  if (pair.reason) return fail(pair.reason);

  if ((await liveRowsFor([slotA, slotB])).length > 0) {
    return fail("One of these schedules is already part of an accommodation.");
  }

  const { host, guest } = pair;
  try {
    await db
      .insert(accommodations)
      .values({
        hostSlotId: host.slotId,
        guestSlotId: guest.slotId,
        remarks,
        status: "proposed",
        proposedBy: actor.id,
      });
  } catch (err) {
    if (isUniqueViolation(err)) return fail("One of these schedules is already part of an accommodation.");
    throw err;
  }

  const note = remarks ? ` Note: ${clip(remarks, 100)}` : "";
  const place = where(host, pair.roomNames);
  const items: NewNotification[] = [
    {
      userId: host.ownerId,
      type: "accommodation_proposed",
      message: `${actor.name || actor.email} proposed that ${guest.requestor}'s group (${guest.occupants} people) share ${place} with your booking (${host.occupants} people). Please accept or decline.${note}`,
      href: myBookingsListHref,
      requestId: host.requestId,
    },
    {
      userId: guest.ownerId,
      type: "accommodation_proposed",
      message: `${actor.name || actor.email} proposed that your booking (${guest.occupants} people) share ${place} with ${host.requestor}'s booking (${host.occupants} people). Please accept or decline.${note}`,
      href: myBookingsListHref,
      requestId: guest.requestId,
    },
  ];
  await createNotifications(items);
  return { ok: true };
}

export async function withdrawAccommodation(actor: Actor, id: number, note: string): Promise<AccommodationResult> {
  const [row] = await db
    .select()
    .from(accommodations)
    .where(and(eq(accommodations.accommodateId, id), inArray(accommodations.status, LIVE)))
    .limit(1);
  if (!row) return fail("This accommodation is no longer active. Refresh the page.");

  const slots = await loadSlots(inArray(reservationSlots.slotId, [row.hostSlotId, row.guestSlotId]));
  const host = slots.find((s) => s.slotId === row.hostSlotId);
  const guest = slots.find((s) => s.slotId === row.guestSlotId);
  if (!host || !guest) return fail("This accommodation no longer exists. Refresh the page.");
  if (!IN_REVIEW.includes(host.status) || !IN_REVIEW.includes(guest.status)) {
    return fail("It can't be withdrawn after one of the bookings was sent for approval.");
  }

  const updated = await db
    .update(accommodations)
    .set({ status: "cancelled", decidedAt: new Date() })
    .where(and(eq(accommodations.accommodateId, id), inArray(accommodations.status, LIVE)))
    .returning({ id: accommodations.accommodateId });
  if (updated.length === 0) return fail("This accommodation is no longer active. Refresh the page.");

  const why = note ? ` Note: ${clip(note, 100)}` : "";
  const place = where(host, host.rooms.map((r) => r.name).join(", "));
  await createNotifications(
    [host, guest].map((s) => {
      const other = s === host ? guest : host;
      return {
        userId: s.ownerId,
        type: "accommodation_withdrawn" as const,
        message: `${actor.name || actor.email} withdrew the shared-room arrangement for ${place} with ${other.requestor}'s booking.${why}`,
        href: myBookingsListHref,
        requestId: s.requestId,
      };
    }),
  );
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Requestors: accept / decline (both must accept)
// ---------------------------------------------------------------------------
export async function answerAccommodation(
  user: { id: string; name: string; email: string },
  id: number,
  accept: boolean,
): Promise<AccommodationResult> {
  const [row] = await db
    .select()
    .from(accommodations)
    .where(and(eq(accommodations.accommodateId, id), eq(accommodations.status, "proposed")))
    .limit(1);
  if (!row) return fail("This accommodation request is no longer open.");

  const slots = await loadSlots(inArray(reservationSlots.slotId, [row.hostSlotId, row.guestSlotId]));
  const host = slots.find((s) => s.slotId === row.hostSlotId);
  const guest = slots.find((s) => s.slotId === row.guestSlotId);
  if (!host || !guest) return fail("This accommodation request is no longer open.");

  const isHost = host.ownerId === user.id;
  const isGuest = guest.ownerId === user.id;
  if (!isHost && !isGuest) return fail("This accommodation request is no longer open.");

  if (!OPEN.includes(host.status) || !OPEN.includes(guest.status)) {
    await db
      .update(accommodations)
      .set({ status: "cancelled", decidedAt: new Date() })
      .where(and(eq(accommodations.accommodateId, id), eq(accommodations.status, "proposed")));
    return fail("This accommodation is no longer possible because one of the bookings is no longer unapproved.");
  }

  const answer = accept ? "accepted" : "declined";
  const hostResponse = isHost ? answer : row.hostResponse;
  const guestResponse = isGuest ? answer : row.guestResponse;
  if ((isHost && row.hostResponse) || (isGuest && row.guestResponse)) {
    return fail("You already answered this request.");
  }

  const status = !accept ? "declined" : hostResponse === "accepted" && guestResponse === "accepted" ? "accepted" : "proposed";
  const updated = await db
    .update(accommodations)
    .set({ hostResponse, guestResponse, status, decidedAt: status === "proposed" ? null : new Date() })
    .where(and(eq(accommodations.accommodateId, id), eq(accommodations.status, "proposed")))
    .returning({ id: accommodations.accommodateId });
  if (updated.length === 0) return fail("This accommodation request is no longer open.");

  if (status === "proposed") return { ok: true }; // still waiting for the other requestor

  const roomNames = host.rooms.map((r) => r.name).join(", ");
  const place = where(host, roomNames);
  const liaisons = await userIdsWithRole("admin_liaison");
  const who = user.name || user.email;
  const items: NewNotification[] = [];

  if (status === "declined") {
    for (const [s, other] of [[host, guest], [guest, host]] as const) {
      if (s.ownerId === user.id) continue;
      items.push({
        userId: s.ownerId,
        type: "accommodation_declined",
        message: `${who} declined to share ${place} with ${other.requestor}'s booking, so each booking stays separate.`,
        href: myBookingsListHref,
        requestId: s.requestId,
      });
    }
    for (const liaison of liaisons) {
      items.push({
        userId: liaison,
        type: "accommodation_declined",
        message: `${who} declined the shared-room proposal for ${place} (${host.requestor} & ${guest.requestor}).`,
        href: adminReviewHref(host.requestId),
        requestId: host.requestId,
      });
    }
  } else {
    for (const [s, other] of [[host, guest], [guest, host]] as const) {
      items.push({
        userId: s.ownerId,
        type: "accommodation_accepted",
        message: `Both requestors agreed: your booking will share ${place} with ${other.requestor}'s booking.`,
        href: myBookingsListHref,
        requestId: s.requestId,
      });
    }
    for (const liaison of liaisons) {
      items.push({
        userId: liaison,
        type: "accommodation_accepted",
        message: `${host.requestor} and ${guest.requestor} both accepted sharing ${place}. Both bookings can now go forward for approval.`,
        href: adminReviewHref(host.requestId),
        requestId: host.requestId,
      });
    }
  }
  await createNotifications(items);
  return { ok: true };
}

/** Everything the requestor needs to answer (or see the outcome of) their accommodation requests. */
export async function getAccommodationInvites(userId: string): Promise<AccommodationInvite[]> {
  const mine = await loadSlots(and(eq(reservationRequests.userId, userId), inArray(reservationRequests.status, OPEN)));
  if (mine.length === 0) return [];
  const mineIds = new Set(mine.map((s) => s.slotId));

  const live = await liveRowsFor([...mineIds]);
  if (live.length === 0) return [];
  const partnerSlots = await loadSlots(
    inArray(
      reservationSlots.slotId,
      live.map((a) => (mineIds.has(a.hostSlotId) ? a.guestSlotId : a.hostSlotId)),
    ),
  );
  const slotById = new Map([...mine, ...partnerSlots].map((s) => [s.slotId, s]));

  const out: AccommodationInvite[] = [];
  for (const a of live) {
    const iAmHost = mineIds.has(a.hostSlotId);
    const my = slotById.get(iAmHost ? a.hostSlotId : a.guestSlotId);
    const other = slotById.get(iAmHost ? a.guestSlotId : a.hostSlotId);
    if (!my || !other) continue;
    const otherRooms = new Set(other.rooms.map((r) => r.id));
    out.push({
      id: a.accommodateId,
      status: a.status as AccommodationInvite["status"],
      myRole: iAmHost ? "host" : "guest",
      myResponse: asResponse(iAmHost ? a.hostResponse : a.guestResponse),
      partnerResponse: asResponse(iAmHost ? a.guestResponse : a.hostResponse),
      rooms: my.rooms.filter((r) => otherRooms.has(r.id)).map((r) => r.name).join(", "),
      date: dayLabel(my),
      time: timeLabel(my),
      myPurpose: my.purpose,
      myOccupants: my.occupants,
      partnerRequestor: other.requestor,
      partnerPurpose: other.purpose,
      partnerOccupants: other.occupants,
      remarks: a.remarks,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// When a booking closes or changes, its accommodations stop standing
// ---------------------------------------------------------------------------
async function buildWithdrawNotices(rows: AccRow[], closedRequestIds: number[], why: string): Promise<NewNotification[]> {
  const slots = await loadSlots(inArray(reservationSlots.slotId, rows.flatMap((a) => [a.hostSlotId, a.guestSlotId])));
  const byId = new Map(slots.map((s) => [s.slotId, s]));
  const items: NewNotification[] = [];
  for (const a of rows) {
    const host = byId.get(a.hostSlotId);
    const guest = byId.get(a.guestSlotId);
    if (!host || !guest) continue;
    for (const [s, other] of [[host, guest], [guest, host]] as const) {
      if (closedRequestIds.includes(s.requestId)) continue; // that booking is the one that closed
      items.push({
        userId: s.ownerId,
        type: "accommodation_withdrawn",
        message: `The shared-room arrangement for ${where(s, s.rooms.map((r) => r.name).join(", "))} with ${other.requestor}'s booking no longer stands: ${why}.`,
        href: myBookingsListHref,
        requestId: s.requestId,
      });
    }
  }
  return items;
}

async function liveRowsOfRequests(requestIds: number[]): Promise<AccRow[]> {
  if (requestIds.length === 0) return [];
  const slotIds = (
    await db.select({ id: reservationSlots.slotId }).from(reservationSlots).where(inArray(reservationSlots.requestId, requestIds))
  ).map((r) => r.id);
  return liveRowsFor(slotIds);
}

/**
 * Requests were rejected / cancelled: end their accommodations. `notify` tells the other requestor
 * (leave it off when that person is already being told something bigger, e.g. their own approval).
 */
export async function withdrawAccommodationsFor(requestIds: number[], why: string, notify = true): Promise<void> {
  try {
    const rows = await liveRowsOfRequests(requestIds);
    if (rows.length === 0) return;
    const notices = notify ? await buildWithdrawNotices(rows, requestIds, why) : [];
    await db
      .update(accommodations)
      .set({ status: "cancelled", decidedAt: new Date() })
      .where(inArray(accommodations.accommodateId, rows.map((r) => r.accommodateId)));
    await createNotifications(notices);
  } catch (err) {
    console.error("withdrawAccommodationsFor failed:", err);
  }
}

/**
 * Editing a request replaces its schedule, which deletes its accommodations with it. Call this BEFORE
 * the edit to capture who must be told, then run the returned function once the edit succeeded.
 */
export async function prepareEditWithdrawal(requestId: number): Promise<() => Promise<void>> {
  try {
    const rows = await liveRowsOfRequests([requestId]);
    if (rows.length === 0) return async () => {};
    const notices = await buildWithdrawNotices(rows, [requestId], "the other requestor changed their booking");
    return () => createNotifications(notices);
  } catch (err) {
    console.error("prepareEditWithdrawal failed:", err);
    return async () => {};
  }
}

// ---------------------------------------------------------------------------
// Telling the liaison that an accommodation can be made
// ---------------------------------------------------------------------------
const nameList = (names: string[]) => {
  const shown = names.slice(0, 3).join(", ");
  return names.length > 3 ? `${shown} and ${names.length - 3} more` : shown;
};

/** A new or edited booking overlaps others in a way that could be shared -> every liaison is told. */
export async function notifyAccommodationPossible(requestId: number, actor: Actor): Promise<void> {
  try {
    const panel = await getAccommodationPanel(requestId);
    const eligible = panel.candidates.filter((c) => c.eligible);
    if (eligible.length === 0) return;
    const info = (await getRequestInfo([requestId])).get(requestId);
    if (!info) return;
    const names = [...new Set(eligible.map((c) => c.partner.requestor))];
    const liaisons = (await userIdsWithRole("admin_liaison")).filter((id) => id !== actor.id);
    await createNotifications(
      liaisons.map((userId) => ({
        userId,
        type: "accommodation_available" as const,
        message: `${info.requestor}'s booking overlaps with ${nameList(names)} in the same room, and they could share it. Review the accommodation options.`,
        href: adminReviewHref(requestId),
        requestId,
      })),
    );
  } catch (err) {
    console.error("notifyAccommodationPossible failed:", err);
  }
}

// ---------------------------------------------------------------------------
// Approval: which other bookings an approval rejects
// ---------------------------------------------------------------------------
/**
 * Other unapproved requests that overlap `requestId` in a room. Approving `requestId` rejects all of them
 * except those with an ACCEPTED accommodation to it (those are left out of the result).
 */
export async function findApprovalConflicts(requestId: number): Promise<number[]> {
  const mine = await loadSlots(eq(reservationSlots.requestId, requestId));
  if (mine.length === 0) return [];
  const others = await loadOverlapPool(mine, requestId, OPEN);
  if (others.length === 0) return [];

  const accepted = (
    await liveRowsFor([...mine.map((s) => s.slotId), ...others.map((s) => s.slotId)])
  ).filter((a) => a.status === "accepted");
  const agreed = (x: SlotInfo, y: SlotInfo) =>
    accepted.some(
      (a) =>
        (a.hostSlotId === x.slotId && a.guestSlotId === y.slotId) ||
        (a.hostSlotId === y.slotId && a.guestSlotId === x.slotId),
    );

  const ids = new Set<number>();
  for (const m of mine) {
    for (const o of others) {
      if (assess(m, o) && !agreed(m, o)) ids.add(o.requestId);
    }
  }
  return [...ids];
}

/** True while a proposal for any of these requests is still waiting for a requestor's answer. */
export async function hasUnansweredProposal(requestIds: number[]): Promise<boolean> {
  const rows = await liveRowsOfRequests(requestIds);
  return rows.some((r) => r.status === "proposed");
}

/**
 * The request plus every request it shares a room with through an ACCEPTED accommodation.
 * They move through review together: sent for approval together, approved together.
 */
export async function getAccommodatedGroup(requestId: number): Promise<number[]> {
  const group = new Set([requestId]);
  let frontier = [requestId];
  while (frontier.length > 0) {
    const rows = (await liveRowsOfRequests(frontier)).filter((r) => r.status === "accepted");
    const slotIds = rows.flatMap((r) => [r.hostSlotId, r.guestSlotId]);
    if (slotIds.length === 0) break;
    const found = await db
      .select({ id: reservationSlots.requestId })
      .from(reservationSlots)
      .where(inArray(reservationSlots.slotId, slotIds));
    frontier = [...new Set(found.map((r) => r.id))].filter((id) => !group.has(id));
    for (const id of frontier) group.add(id);
  }
  return [...group];
}
