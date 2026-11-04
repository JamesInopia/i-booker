import "server-only";
import { db } from "@/db";
import { roleAssignments, user } from "@/db/schema";
import type { Role } from "@/lib/session";
import type { AccountRow } from "./types";

const RANK: Record<Role, number> = { admin_supervisor: 0, admin_liaison: 1, requestor: 2 };

export function resolveRole(assigned: Role | undefined): Role {
  return assigned ?? "requestor";
}

const formatDate = (d: Date) =>
  d.toLocaleDateString("en-PH", { timeZone: "Asia/Manila", year: "numeric", month: "short", day: "numeric" });

const shortId = (id: string) => `#${id.replace(/-/g, "").padEnd(6, "0").slice(0, 6).toUpperCase()}`;

export async function getAccounts(): Promise<AccountRow[]> {
  const [people, assignments] = await Promise.all([db.select().from(user), db.select().from(roleAssignments)]);

  const assigned = new Map(assignments.map((a) => [a.email.toLowerCase(), a.role]));
  const now = new Date();

  return people
    .map((p): AccountRow => {
      const email = p.email.toLowerCase();
      const suspended = p.status === "suspended" && (!p.suspendedUntil || p.suspendedUntil > now);
      return {
        email,
        shortId: shortId(p.id),
        name: p.name.trim() || email.split("@")[0],
        role: resolveRole(assigned.get(email)),
        suspended,
        suspendedUntilLabel: suspended && p.suspendedUntil ? formatDate(p.suspendedUntil) : null,
        suspensionReason: suspended ? p.suspensionReason : null,
      };
    })
    .sort((a, b) => RANK[a.role] - RANK[b.role] || a.name.localeCompare(b.name));
}
