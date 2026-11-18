"use server";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { session as sessionTable } from "@/db/schema";
import { auth } from "@/lib/better-auth";

export async function signOut() {
  const h = await headers();
  const current = await auth.api.getSession({ headers: h }).catch(() => null);
  await auth.api.signOut({ headers: h }).catch(() => null);
  // Also drop the rotated-away tokens of this login that are still inside their grace period,
  // so no old token works after logging out.
  if (current)
    await db
      .delete(sessionTable)
      .where(eq(sessionTable.familyId, current.session.familyId))
      .catch(() => null);
  redirect("/login");
}
