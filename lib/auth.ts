import "server-only";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/db";
import {
  roleAssignments,
  session as sessionTable,
  user as authUsers,
} from "@/db/schema";
import { auth } from "@/lib/better-auth";
import { ROLE_HOME, type Role } from "@/lib/session";

const MAX_SESSION_MS = 30 * 24 * 60 * 60 * 1000;

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

export type AuthState =
  | { kind: "anonymous" }
  | { kind: "suspended" }
  | { kind: "ok"; user: CurrentUser };

export const getAuthState = cache(async (): Promise<AuthState> => {
  const session = await auth.api
    .getSession({ headers: await headers() })
    .catch(() => null);
  if (!session) return { kind: "anonymous" };

  if (
    Date.now() - new Date(session.session.createdAt).getTime() >
    MAX_SESSION_MS
  ) {
    await db
      .delete(sessionTable)
      .where(eq(sessionTable.id, session.session.id))
      .catch(() => {});
    return { kind: "anonymous" };
  }

  const [account] = await db
    .select({
      status: authUsers.status,
      suspendedUntil: authUsers.suspendedUntil,
    })
    .from(authUsers)
    .where(eq(authUsers.id, session.user.id))
    .limit(1);
  if (!account) return { kind: "anonymous" };

  const suspended =
    account.status === "suspended" &&
    (!account.suspendedUntil || account.suspendedUntil > new Date());
  if (suspended) {
    await db
      .delete(sessionTable)
      .where(eq(sessionTable.userId, session.user.id))
      .catch(() => {});
    return { kind: "suspended" };
  }

  const email = session.user.email.toLowerCase();
  const [row] = await db
    .select({ role: roleAssignments.role })
    .from(roleAssignments)
    .where(eq(roleAssignments.email, email))
    .limit(1);

  return {
    kind: "ok",
    user: {
      id: session.user.id,
      email,
      name: session.user.name,
      role: row?.role ?? "requestor",
    },
  };
});

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const state = await getAuthState();
  return state.kind === "ok" ? state.user : null;
});

export async function requireUser(): Promise<CurrentUser> {
  const state = await getAuthState();
  if (state.kind === "suspended") redirect("/login?suspended=1");
  if (state.kind !== "ok") redirect("/login");
  return state.user;
}

export async function requireRole(...roles: Role[]): Promise<CurrentUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect(ROLE_HOME[user.role]);
  return user;
}
