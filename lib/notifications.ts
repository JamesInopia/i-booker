import "server-only";
import { and, asc, desc, eq, gt, inArray, isNull, max, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  notifications,
  reservationRequests,
  reservationSlotRooms,
  reservationSlots,
  roleAssignments,
  rooms,
  user as authUsers,
} from "@/db/schema";
import type { BookingStatus } from "./definitions";
import type {
  NotificationItem,
  NotificationType,
  NotificationsPayload,
} from "./notification-types";
import type { Role } from "./session";

type Actor = { id: string; name: string; email: string };

const LIST_LIMIT = 30;
const PING_COOLDOWN_MS = 10 * 60 * 1000;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const formatDay = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
};
const formatClock = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};
const clip = (s: string, n = 120) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const actorName = (a: Actor) => a.name || a.email;

// ---------------------------------------------------------------------------
// Links: where each notification takes the person
// ---------------------------------------------------------------------------
const adminReviewHref = (requestId: number) => `/admin-dashboard?tab=review&request=${requestId}`;
const myBookingHref = (requestId: number) => `/booking-status/${requestId}`; // approved/rejected detail page
const myBookingsListHref = "/booking-status"; // rejected/cancelled rows are deleted, so link to the list

// ---------------------------------------------------------------------------
// Request lookup (must be called BEFORE a reject/cancel deletes the row)
// ---------------------------------------------------------------------------
export type RequestInfo = {
  requestId: number;
  ownerId: string;
  requestor: string;
  status: BookingStatus;
  room: string;
  dateISO: string;
  start: string;
  end: string;
  slotCount: number;
};

export async function getRequestInfo(ids: number[]): Promise<Map<number, RequestInfo>> {
  const map = new Map<number, RequestInfo>();
  if (ids.length === 0) return map;

  const rows = await db
    .select({
      requestId: reservationRequests.requestId,
      ownerId: reservationRequests.userId,
      requestor: reservationRequests.requestor,
      status: reservationRequests.status,
      slotId: reservationSlots.slotId,
      dateISO: reservationSlots.dateOfActivity,
      start: reservationSlots.startTime,
      end: reservationSlots.endTime,
      room: rooms.name,
    })
    .from(reservationRequests)
    .innerJoin(reservationSlots, eq(reservationSlots.requestId, reservationRequests.requestId))
    .leftJoin(reservationSlotRooms, eq(reservationSlotRooms.slotId, reservationSlots.slotId))
    .leftJoin(rooms, eq(rooms.roomId, reservationSlotRooms.roomId))
    .where(inArray(reservationRequests.requestId, ids))
    .orderBy(asc(reservationSlots.slotId));

  const slots = new Map<number, Set<number>>();
  for (const r of rows) {
    const seen = slots.get(r.requestId) ?? new Set<number>();
    seen.add(r.slotId);
    slots.set(r.requestId, seen);
    if (map.has(r.requestId)) continue;
    map.set(r.requestId, {
      requestId: r.requestId,
      ownerId: r.ownerId,
      requestor: r.requestor,
      status: r.status,
      room: r.room ?? "a room",
      dateISO: r.dateISO,
      start: r.start,
      end: r.end,
      slotCount: 1,
    });
  }
  for (const [id, seen] of slots) map.get(id)!.slotCount = seen.size;
  return map;
}

/** "Room 201 on Nov 10, 2026, 1:00 PM - 3:00 PM" */
function describe(i: RequestInfo): string {
  const more = i.slotCount > 1 ? ` (+${i.slotCount - 1} more)` : "";
  return `${i.room} on ${formatDay(i.dateISO)}, ${formatClock(i.start)} - ${formatClock(i.end)}${more}`;
}

async function userIdsWithRole(role: Role): Promise<string[]> {
  const rows = await db
    .select({ id: authUsers.id })
    .from(roleAssignments)
    .innerJoin(authUsers, eq(sql`lower(${authUsers.email})`, roleAssignments.email))
    .where(eq(roleAssignments.role, role));
  return rows.map((r) => r.id);
}

// ---------------------------------------------------------------------------
// Creating notifications. Best-effort: a failure here must never fail the booking action.
// ---------------------------------------------------------------------------
type NewNotification = {
  userId: string;
  type: NotificationType;
  message: string;
  href: string;
  requestId: number | null;
};

async function insertAll(items: NewNotification[]): Promise<void> {
  if (items.length === 0) return;
  await db.insert(notifications).values(items);
}

async function safely(label: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (err) {
    console.error(`${label} failed:`, err);
  }
}

/** A booking was made -> every liaison (except the person who made it) can review it. */
export function notifyBookingSubmitted(requestId: number, actor: Actor) {
  return safely("notifyBookingSubmitted", async () => {
    const info = (await getRequestInfo([requestId])).get(requestId);
    if (!info) return;
    const liaisons = (await userIdsWithRole("admin_liaison")).filter((id) => id !== actor.id);
    await insertAll(
      liaisons.map((userId) => ({
        userId,
        type: "booking_submitted" as const,
        message: `${info.requestor} submitted a booking request for ${describe(info)}. Review it now.`,
        href: adminReviewHref(requestId),
        requestId,
      })),
    );
  });
}

/** Liaison sent it for approval -> tell the requestor and every supervisor. */
export function notifyBookingReviewed(requestId: number, actor: Actor) {
  return safely("notifyBookingReviewed", async () => {
    const info = (await getRequestInfo([requestId])).get(requestId);
    if (!info) return;
    const supervisors = (await userIdsWithRole("admin_supervisor")).filter(
      (id) => id !== actor.id && id !== info.ownerId,
    );
    const items: NewNotification[] = supervisors.map((userId) => ({
      userId,
      type: "booking_reviewed",
      message: `${actorName(actor)} reviewed ${info.requestor}'s booking for ${describe(info)}. It's ready for your approval.`,
      href: adminReviewHref(requestId),
      requestId,
    }));
    if (info.ownerId !== actor.id) {
      items.push({
        userId: info.ownerId,
        type: "booking_reviewed",
        message: `Your booking for ${describe(info)} was reviewed and sent to the supervisor for approval.`,
        href: myBookingsListHref,
        requestId,
      });
    }
    await insertAll(items);
  });
}

export function notifyBookingApproved(requestId: number, actor: Actor, remarks: string) {
  return safely("notifyBookingApproved", async () => {
    const info = (await getRequestInfo([requestId])).get(requestId);
    if (!info || info.ownerId === actor.id) return;
    const note = remarks ? ` Remarks: ${clip(remarks)}` : "";
    await insertAll([
      {
        userId: info.ownerId,
        type: "booking_approved",
        message: `Your booking for ${describe(info)} was approved.${note}`,
        href: myBookingHref(requestId),
        requestId,
      },
    ]);
  });
}

/** Pass infos captured BEFORE the delete; the rows no longer exist afterwards. */
export function notifyBookingRemoved(
  infos: RequestInfo[],
  kind: "rejected" | "cancelled",
  actor: Actor,
  reason: string,
) {
  return safely("notifyBookingRemoved", async () => {
    await insertAll(
      infos
        .filter((i) => i.ownerId !== actor.id)
        .map((i) => ({
          userId: i.ownerId,
          type: kind === "rejected" ? ("booking_rejected" as const) : ("booking_cancelled" as const),
          message:
            kind === "rejected"
              ? `Your booking for ${describe(i)} was rejected. Reason: ${clip(reason)}`
              : `Your approved booking for ${describe(i)} was cancelled. Reason: ${clip(reason)}`,
          href: myBookingsListHref,
          requestId: i.requestId,
        })),
    );
  });
}

// ---------------------------------------------------------------------------
// Ping: a liaison reminds the supervisors to act on a request awaiting approval
// ---------------------------------------------------------------------------
export type PingResult = { ok: true } | { ok: false; error: string };

export async function pingSupervisorsAbout(requestId: number, actor: Actor): Promise<PingResult> {
  const info = (await getRequestInfo([requestId])).get(requestId);
  if (!info) return { ok: false, error: "This request no longer exists. Refresh the page." };
  if (info.status !== "reviewed") {
    return { ok: false, error: "Only requests that are pending approval can be pinged." };
  }

  const [last] = await db
    .select({ at: max(notifications.createdAt) })
    .from(notifications)
    .where(
      and(
        eq(notifications.type, "review_ping"),
        eq(notifications.requestId, requestId),
        gt(notifications.createdAt, new Date(Date.now() - PING_COOLDOWN_MS)),
      ),
    );
  if (last?.at) {
    const waitMin = Math.ceil((last.at.getTime() + PING_COOLDOWN_MS - Date.now()) / 60000);
    return {
      ok: false,
      error: `Supervisors were already pinged about this request. You can ping again in ${waitMin} min.`,
    };
  }

  const supervisors = await userIdsWithRole("admin_supervisor");
  if (supervisors.length === 0) return { ok: false, error: "No supervisor accounts were found to ping." };

  await insertAll(
    supervisors.map((userId) => ({
      userId,
      type: "review_ping" as const,
      message: `${actorName(actor)} is reminding you to review ${info.requestor}'s booking for ${describe(info)}.`,
      href: adminReviewHref(requestId),
      requestId,
    })),
  );
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Reading / marking
// ---------------------------------------------------------------------------
export async function getNotifications(userId: string): Promise<NotificationsPayload> {
  try {
    const [rows, [{ unread }]] = await Promise.all([
      db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt), desc(notifications.notificationId))
        .limit(LIST_LIMIT),
      db
        .select({ unread: sql<number>`count(*)::int` })
        .from(notifications)
        .where(and(eq(notifications.userId, userId), isNull(notifications.readAt))),
    ]);

    const items: NotificationItem[] = rows.map((n) => ({
      id: n.notificationId,
      type: n.type as NotificationType,
      message: n.message,
      href: n.href,
      read: n.readAt !== null,
      createdAt: n.createdAt.toISOString(),
    }));
    return { items, unread };
  } catch (err) {
    console.error("getNotifications failed (did you create the notification table?):", err);
    return { items: [], unread: 0 };
  }
}

export async function markRead(userId: string, id: number): Promise<void> {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.notificationId, id),
        eq(notifications.userId, userId),
        isNull(notifications.readAt),
      ),
    );
}

export async function markAllRead(userId: string): Promise<void> {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
}
