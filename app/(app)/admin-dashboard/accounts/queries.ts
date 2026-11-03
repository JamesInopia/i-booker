import "server-only";
import { db } from "@/db";
import { appUsers, roleAssignments, user } from "@/db/schema";
import type { Role } from "@/lib/session";
import type { AccountRow } from "./types";

const RANK: Record<Role, number> = { admin_supervisor: 0, admin_liaison: 1, requestor: 2 };

export function resolveRole(assigned: Role | undefined, app: Role | undefined): Role {
  if (assigned === "admin_supervisor" || app === "admin_supervisor") return "admin_supervisor";
  return assigned ?? "requestor";
}

const formatDate = (d: Date) =>
  d.toLocaleDateString("en-PH", { timeZone: "Asia/Manila", year: "numeric", month: "short", day: "numeric" });

const shortId = (id: string) => `#${id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;

export async function getAccounts(): Promise<AccountRow[]> {
  const [appRows, authRows, assignments] = await Promise.all([
    db.select().from(appUsers),
    db.select({ id: user.id, name: user.name, email: user.email }).from(user),
    db.select().from(roleAssignments),
  ]);

  const assigned = new Map(assignments.map((a) => [a.email.toLowerCase(), a.role]));
  const now = new Date();
  const byEmail = new Map<string, AccountRow>();

  for (const a of appRows) {
    const email = a.email.toLowerCase();
    const suspended = a.status === "suspended" && (!a.suspendedUntil || a.suspendedUntil > now);
    byEmail.set(email, {
      email,
      shortId: shortId(a.userId),
      name: a.name.trim(),
      role: resolveRole(assigned.get(email), a.role),
      suspended,
      suspendedUntilLabel: suspended && a.suspendedUntil ? formatDate(a.suspendedUntil) : null,
      suspensionReason: suspended ? a.suspensionReason : null,
    });
  }

  for (const u of authRows) {
    const email = u.email.toLowerCase();
    const existing = byEmail.get(email);
    if (existing) {
      if (!existing.name) existing.name = u.name.trim();
      continue;
    }
    byEmail.set(email, {
      email,
      shortId: shortId(u.id.padEnd(6, "0")),
      name: u.name.trim(),
      role: resolveRole(assigned.get(email), undefined),
      suspended: false,
      suspendedUntilLabel: null,
      suspensionReason: null,
    });
  }

  return [...byEmail.values()]
    .map((a) => ({ ...a, name: a.name || a.email.split("@")[0] }))
    .sort((a, b) => RANK[a.role] - RANK[b.role] || a.name.localeCompare(b.name));
}
