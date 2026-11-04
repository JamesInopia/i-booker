"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { reservationRequests, user as authUsers } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { ADMIN_ROLES } from "@/lib/session";
import type { ActionResult } from "./types";

const MAX_TEXT = 500;
const MAX_BULK = 100;

class StatusMismatch extends Error {}

const fail = (error: string): ActionResult => ({ ok: false, error });

function cleanText(value: string, { required }: { required: boolean }): { text: string } | { error: string } {
  const text = (value ?? "").trim();
  if (required && text.length < 3) return { error: "Please enter a reason." };
  if (text.length > MAX_TEXT) return { error: `Text is too long (max ${MAX_TEXT} characters).` };
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
  return { ok: true };
};

const validId = (id: number) => Number.isInteger(id) && id > 0;

export async function sendForApproval(requestId: number, remarks: string): Promise<ActionResult> {
  const user = await requireRole("admin_liaison");
  if (!validId(requestId)) return fail("Invalid request.");
  const clean = cleanText(remarks, { required: false });
  if ("error" in clean) return fail(clean.error);

  const updated = await db
    .update(reservationRequests)
    .set({
      status: "reviewed",
      reviewedBy: await appUserId(user.email),
      reviewedAt: new Date(),
      liaisonRemarks: clean.text || null,
    })
    .where(and(eq(reservationRequests.requestId, requestId), eq(reservationRequests.status, "pending")))
    .returning({ id: reservationRequests.requestId });

  if (updated.length === 0) return fail("This request is no longer in review. Refresh the page.");
  return done();
}

export async function approveRequest(requestId: number, remarks: string): Promise<ActionResult> {
  const user = await requireRole("admin_supervisor");
  if (!validId(requestId)) return fail("Invalid request.");
  const clean = cleanText(remarks, { required: false });
  if ("error" in clean) return fail(clean.error);

  const updated = await db
    .update(reservationRequests)
    .set({
      status: "approved",
      decidedBy: await appUserId(user.email),
      decidedAt: new Date(),
      supervisorRemarks: clean.text || null,
    })
    .where(
      and(
        eq(reservationRequests.requestId, requestId),
        inArray(reservationRequests.status, ["pending", "reviewed"]),
      ),
    )
    .returning({ id: reservationRequests.requestId });

  if (updated.length === 0) return fail("This request can no longer be approved. Refresh the page.");
  return done();
}

export async function rejectRequest(requestId: number, reason: string): Promise<ActionResult> {
  await requireRole(...ADMIN_ROLES);
  if (!validId(requestId)) return fail("Invalid request.");
  const clean = cleanText(reason, { required: true });
  if ("error" in clean) return fail(clean.error);

  const updated = await db
    .delete(reservationRequests)
    .where(
      and(
        eq(reservationRequests.requestId, requestId),
        inArray(reservationRequests.status, ["pending", "reviewed"]),
      ),
    )
    .returning({ id: reservationRequests.requestId });

  if (updated.length === 0) return fail("This request can no longer be rejected. Refresh the page.");
  return done();
}

export async function cancelApprovedRequests(requestIds: number[], reason: string): Promise<ActionResult> {
  await requireRole(...ADMIN_ROLES);
  const ids = [...new Set(requestIds)];
  if (ids.length === 0 || ids.length > MAX_BULK || !ids.every(validId)) return fail("Invalid selection.");
  const clean = cleanText(reason, { required: true });
  if ("error" in clean) return fail(clean.error);

  try {
    await db.transaction(async (tx) => {
      const updated = await tx
        .delete(reservationRequests)
        .where(and(inArray(reservationRequests.requestId, ids), eq(reservationRequests.status, "approved")))
        .returning({ id: reservationRequests.requestId });
      if (updated.length !== ids.length) throw new StatusMismatch();
    });
  } catch (err) {
    if (err instanceof StatusMismatch) {
      return fail("Only approved requests can be cancelled. Refresh the page and try again.");
    }
    throw err;
  }
  return done();
}
