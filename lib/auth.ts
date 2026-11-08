import "server-only";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/db";
import { roleAssignments, session as sessionTable } from "@/db/schema";
import { auth } from "@/lib/better-auth";
import { ROLE_HOME, type Role } from "@/lib/session";

const MAX_SESSION_MS = 30 * 24 * 60 * 60 * 1000;

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);
  if (!session) return null;

  if (Date.now() - new Date(session.session.createdAt).getTime() > MAX_SESSION_MS) {
    await db.delete(sessionTable).where(eq(sessionTable.id, session.session.id)).catch(() => {});
    return null;
  }

  const email = session.user.email.toLowerCase();
  const [row] = await db
    .select({ role: roleAssignments.role })
    .from(roleAssignments)
    .where(eq(roleAssignments.email, email))
    .limit(1);

  return { id: session.user.id, email, name: session.user.name, role: row?.role ?? "requestor" };
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(...roles: Role[]): Promise<CurrentUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect(ROLE_HOME[user.role]);
  return user;
}
