"use server";

import { eq, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { roleAssignments, user } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import type { ActionResult } from "../review/types";
import { resolveRole } from "./queries";
import { MAX_SUSPENSION_DAYS } from "./types";

const MAX_REASON = 500;
const DAY_MS = 86_400_000;

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Target = { email: string; userId: string };

class Protected extends Error {}
class NotFound extends Error {}

const fail = (error: string): ActionResult => ({ ok: false, error });

async function guarded(rawEmail: unknown, run: (tx: Tx, target: Target) => Promise<void>): Promise<ActionResult> {
  await requireRole("admin_supervisor");

  const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";
  if (!email || email.length > 254) return fail("Invalid user.");

  try {
    await db.transaction(async (tx) => {
      const [assigned] = await tx
        .select({ role: roleAssignments.role })
        .from(roleAssignments)
        .where(eq(roleAssignments.email, email))
        .for("update")
        .limit(1);
      const [account] = await tx
        .select({ id: user.id })
        .from(user)
        .where(eq(sql`lower(${user.email})`, email))
        .for("update")
        .limit(1);

      if (!account) throw new NotFound();
      if (resolveRole(assigned?.role) === "admin_supervisor") throw new Protected();

      await run(tx, { email, userId: account.id });
    });
  } catch (err) {
    if (err instanceof Protected) return fail("Admin supervisors can't be modified.");
    if (err instanceof NotFound) return fail("That user no longer exists. Refresh the page.");
    throw err;
  }

  revalidatePath("/admin-dashboard");
  return { ok: true };
}

export async function suspendUser(email: string, days: number | null, reason: string): Promise<ActionResult> {
  const text = String(reason ?? "").trim();
  if (text.length < 3) return fail("Please enter a reason.");
  if (text.length > MAX_REASON) return fail(`Reason is too long (max ${MAX_REASON} characters).`);
  if (days !== null && (typeof days !== "number" || !Number.isInteger(days) || days < 1 || days > MAX_SUSPENSION_DAYS)) {
    return fail(`Enter a number of days between 1 and ${MAX_SUSPENSION_DAYS}.`);
  }

  const until = days === null ? null : new Date(Date.now() + days * DAY_MS);
  return guarded(email, async (tx, t) => {
    await tx.update(user).set({ status: "suspended", suspendedUntil: until, suspensionReason: text }).where(eq(user.id, t.userId));
  });
}

export async function unsuspendUser(email: string): Promise<ActionResult> {
  return guarded(email, async (tx, t) => {
    await tx
      .update(user)
      .set({ status: "active", suspendedUntil: null, suspensionReason: null })
      .where(eq(user.id, t.userId));
  });
}

export async function setLiaisonRole(email: string, grant: boolean): Promise<ActionResult> {
  const role = grant === true ? "admin_liaison" : "requestor";

  return guarded(email, async (tx, t) => {
    const written = await tx
      .insert(roleAssignments)
      .values({ email: t.email, role })
      .onConflictDoUpdate({
        target: roleAssignments.email,
        set: { role },
        setWhere: ne(roleAssignments.role, "admin_supervisor"),
      })
      .returning({ email: roleAssignments.email });
    if (written.length === 0) throw new Protected();
  });
}
