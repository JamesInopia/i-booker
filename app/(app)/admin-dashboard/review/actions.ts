"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { reservationRequests, user as authUsers } from "@/db/schema";
import {
  findApprovalConflicts,
  hasUnansweredProposal,
  proposeAccommodation,
  withdrawAccommodation,
  withdrawAccommodationsFor,
} from "@/lib/accommodation";
import { requireRole } from "@/lib/auth";
import {
  getRequestInfo,
  notifyBookingApproved,
  notifyBookingRemoved,
  notifyBookingReviewed,
  pingSupervisorsAbout,
} from "@/lib/notifications";
import { ADMIN_ROLES } from "@/lib/session";
import type { ActionResult } from "./types";

const MAX_TEXT = 500;
const MAX_BULK = 100;

class StatusMismatch extends Error {}

const SUPERSEDED_REASON = "Another booking for the same room and time was approved.";

const fail = (error: string): ActionResult => ({ ok: false, error });

function cleanText(
  value: string,
  { required }: { required: boolean },
): { text: string } | { error: string } {
  const text = (value ?? "").trim();
  if (required && text.length < 3) return { error: "Please enter a reason." };
  if (text.length > MAX_TEXT)
    return { error: `Text is too long (max ${MAX_TEXT} characters).` };
  return { text };
}

async function appUserId(email: string) {
  const [row] = await db
    .select({ id: authUsers.id })
    .from(authUsers)
    .where(eq(sql`lower(${authUsers.email})`, email))
    .limit(1);
  return row?.id ?? null;
}

const done = (): ActionResult => {
  revalidatePath("/admin-dashboard");
  revalidatePath("/booking-status");
  revalidatePath("/booking-archives");
  return { ok: true };
};

const validId = (id: number) => Number.isInteger(id) && id > 0;

export async function sendForApproval(
  requestId: number,
  remarks: string,
): Promise<ActionResult> {
  const user = await requireRole("admin_liaison");
  if (!validId(requestId)) return fail("Invalid request.");
  const clean = cleanText(remarks, { required: false });
  if ("error" in clean) return fail(clean.error);

  // Accommodation is settled before a request goes to the supervisor.
  if (await hasUnansweredProposal(requestId))
    return fail(
      "A shared-room proposal for this request is still waiting for an answer. Wait for both requestors or withdraw it first.",
    );

  const updated = await db
    .update(reservationRequests)
    .set({
      status: "reviewed",
      reviewedBy: await appUserId(user.email),
      reviewedAt: new Date(),
      liaisonRemarks: clean.text || null,
    })
    .where(
      and(
        eq(reservationRequests.requestId, requestId),
        eq(reservationRequests.status, "pending"),
      ),
    )
    .returning({ id: reservationRequests.requestId });

  if (updated.length === 0)
    return fail("This request is no longer in review. Refresh the page.");
  await notifyBookingReviewed(requestId, user);
  return done();
}

/**
 * Approving a booking REJECTS every other unapproved booking for the same room and time, except the
 * ones it has an accepted accommodation with (those stay and are approved on their own).
 */
export async function approveRequest(
  requestId: number,
  remarks: string,
): Promise<ActionResult> {
  const user = await requireRole("admin_supervisor");
  if (!validId(requestId)) return fail("Invalid request.");
  const clean = cleanText(remarks, { required: false });
  if ("error" in clean) return fail(clean.error);

  const conflictIds = await findApprovalConflicts(requestId);

  let rejectedIds: number[] = [];
  try {
    await db.transaction(async (tx) => {
      const decidedBy = await appUserId(user.email);
      const decidedAt = new Date();
      const updated = await tx
        .update(reservationRequests)
        .set({
          status: "approved",
          decidedBy,
          decidedAt,
          supervisorRemarks: clean.text || null,
        })
        .where(
          and(
            eq(reservationRequests.requestId, requestId),
            inArray(reservationRequests.status, ["pending", "reviewed"]),
          ),
        )
        .returning({ id: reservationRequests.requestId });
      if (updated.length === 0) throw new StatusMismatch();

      if (conflictIds.length > 0) {
        const rejected = await tx
          .update(reservationRequests)
          .set({
            status: "rejected",
            decidedBy,
            decidedAt,
            cancelReason: SUPERSEDED_REASON,
          })
          .where(
            and(
              inArray(reservationRequests.requestId, conflictIds),
              inArray(reservationRequests.status, ["pending", "reviewed"]),
            ),
          )
          .returning({ id: reservationRequests.requestId });
        rejectedIds = rejected.map((r) => r.id);
      }
    });
  } catch (err) {
    if (err instanceof StatusMismatch)
      return fail("This request can no longer be approved. Refresh the page.");
    throw err;
  }

  await notifyBookingApproved(requestId, user, clean.text);
  if (rejectedIds.length > 0) {
    await withdrawAccommodationsFor(rejectedIds, "the other booking was rejected", false);
    const infos = [...(await getRequestInfo(rejectedIds)).values()];
    await notifyBookingRemoved(infos, "rejected", user, SUPERSEDED_REASON);
  }
  return done();
}

export async function rejectRequest(requestId: number, reason: string): Promise<ActionResult> {
  const user = await requireRole(...ADMIN_ROLES);
  if (!validId(requestId)) return fail("Invalid request.");
  const clean = cleanText(reason, { required: true });
  if ("error" in clean) return fail(clean.error);

  const updated = await db
    .update(reservationRequests)
    .set({
      status: "rejected",
      decidedBy: await appUserId(user.email),
      decidedAt: new Date(),
      cancelReason: clean.text,
    })
    .where(
      and(
        eq(reservationRequests.requestId, requestId),
        inArray(reservationRequests.status, ["pending", "reviewed"]),
      ),
    )
    .returning({ id: reservationRequests.requestId });

  if (updated.length === 0) return fail("This request can no longer be rejected. Refresh the page.");
  await withdrawAccommodationsFor([requestId], "the other booking was rejected");
  const info = (await getRequestInfo([requestId])).get(requestId);
  if (info) await notifyBookingRemoved([info], "rejected", user, clean.text);
  return done();
}

export async function cancelApprovedRequests(requestIds: number[], reason: string): Promise<ActionResult> {
  const user = await requireRole(...ADMIN_ROLES);
  const ids = [...new Set(requestIds)];
  if (ids.length === 0 || ids.length > MAX_BULK || !ids.every(validId))
    return fail("Invalid selection.");
  const clean = cleanText(reason, { required: true });
  if ("error" in clean) return fail(clean.error);

  try {
    await db.transaction(async (tx) => {
      const updated = await tx
        .update(reservationRequests)
        .set({
          status: "cancelled",
          cancelledAt: new Date(),
          cancelReason: clean.text,
        })
        .where(
          and(
            inArray(reservationRequests.requestId, ids),
            eq(reservationRequests.status, "approved"),
          ),
        )
        .returning({ id: reservationRequests.requestId });
      if (updated.length !== ids.length) throw new StatusMismatch();
    });
  } catch (err) {
    if (err instanceof StatusMismatch) {
      return fail(
        "Only approved requests can be cancelled. Refresh the page and try again.",
      );
    }
    throw err;
  }
  await withdrawAccommodationsFor(ids, "the other booking was cancelled");
  const infos = [...(await getRequestInfo(ids)).values()];
  await notifyBookingRemoved(infos, "cancelled", user, clean.text);
  return done();
}

/**
 * Admin Liaison allows two in-review bookings to share a room (decided before they go to the supervisor). Both requestors are asked to accept;
 * the pair only becomes an accommodation once both do. Capacity and the 5-person guest limit are
 * checked on the server in lib/accommodation.ts.
 */
export async function allowAccommodation(
  slotId: number,
  otherSlotId: number,
  remarks: string,
): Promise<ActionResult> {
  const user = await requireRole("admin_liaison");
  if (!validId(slotId) || !validId(otherSlotId)) return fail("Invalid booking.");
  const clean = cleanText(remarks, { required: false });
  if ("error" in clean) return fail(clean.error);

  const result = await proposeAccommodation(user, slotId, otherSlotId, clean.text || null);
  if (!result.ok) return fail(result.error);
  return done();
}

/** Admin Liaison takes back an accommodation (proposed or agreed) while both bookings are still in review. */
export async function withdrawAccommodationRequest(id: number, note: string): Promise<ActionResult> {
  const user = await requireRole("admin_liaison");
  if (!validId(id)) return fail("Invalid accommodation.");
  const clean = cleanText(note, { required: false });
  if ("error" in clean) return fail(clean.error);

  const result = await withdrawAccommodation(user, id, clean.text);
  if (!result.ok) return fail(result.error);
  return done();
}

/** Admin Liaison reminds every Admin Supervisor about a request awaiting approval. */
export async function pingSupervisors(requestId: number): Promise<ActionResult> {
  const user = await requireRole("admin_liaison");
  if (!validId(requestId)) return fail("Invalid request.");

  const result = await pingSupervisorsAbout(requestId, user);
  return result.ok ? { ok: true } : fail(result.error);
}
