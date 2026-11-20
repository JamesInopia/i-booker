"use server";

import { eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { roleAssignments, user } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { ACCOUNT_MANAGER_ROLES, canGrantRole, canModifyAccount, type Role } from "@/lib/session";
import type { ActionResult } from "../review/types";
import { resolveRole } from "./queries";
import { MAX_SUSPENSION_DAYS } from "./types";

const MAX_REASON = 500;
const DAY_MS = 86_400_000;

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Target = { email: string; userId: string; role: Role };

class Protected extends Error {}
class Changed extends Error {}
class NotFound extends Error {}

const fail = (error: string): ActionResult => ({ ok: false, error });

/**
 * Runs `run` on one account, but only if the person asking is allowed to modify it. The check is made
 * here on the server, under a row lock, so it holds however the request was sent (see `canModifyAccount`
 * in lib/session.ts for who may change whom).
 */
async function guarded(
  rawEmail: unknown,
  run: (tx: Tx, target: Target, actorRole: Role) => Promise<void>,
): Promise<ActionResult> {
  const actor = await requireRole(...ACCOUNT_MANAGER_ROLES);

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
      const role = resolveRole(assigned?.role);
      if (!canModifyAccount(actor.role, role)) throw new Protected();

      await run(tx, { email, userId: account.id, role }, actor.role);
    });
  } catch (err) {
    if (err instanceof Protected) return fail("You can't modify this account.");
    if (err instanceof Changed) return fail("This account's access has changed. Refresh the page and try again.");
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

/** Move an account from one of the roles in `from` to `to`, if the person asking may hand out `to`. */
function changeRole(email: string, from: Role[], to: Role): Promise<ActionResult> {
  return guarded(email, async (tx, t, actorRole) => {
    if (to !== "requestor" && !canGrantRole(actorRole, to)) throw new Protected();
    if (!from.includes(t.role)) throw new Changed();

    const written = await tx
      .insert(roleAssignments)
      .values({ email: t.email, role: to })
      .onConflictDoUpdate({
        target: roleAssignments.email,
        set: { role: to },
        setWhere: inArray(roleAssignments.role, from),
      })
      .returning({ email: roleAssignments.email });
    if (written.length === 0) throw new Changed();
  });
}

export async function setLiaisonRole(email: string, grant: boolean): Promise<ActionResult> {
  return grant === true
    ? changeRole(email, ["requestor"], "admin_liaison")
    : changeRole(email, ["admin_liaison"], "requestor");
}

/** Supervisors only (see `canGrantRole`). */
export async function setDeveloperRole(email: string, grant: boolean): Promise<ActionResult> {
  return grant === true
    ? changeRole(email, ["requestor", "admin_liaison"], "admin_developer")
    : changeRole(email, ["admin_developer"], "requestor");
}
