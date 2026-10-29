"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { appUsers, reservationRequests } from "@/db/schema";
import { requireUser } from "@/lib/auth";

export async function cancelRequest(requestId: number, reason: string) {
  const user = await requireUser();

  const cleanReason = reason.trim();
  if (cleanReason.length < 3) return { error: "Please enter a reason." };
  if (cleanReason.length > 500)
    return { error: "Reason is too long (max 500 characters)." };

  const myIds = db
    .select({ id: appUsers.userId })
    .from(appUsers)
    .where(eq(sql`lower(${appUsers.email})`, user.email));

  const [req] = await db
    .select({ status: reservationRequests.status })
    .from(reservationRequests)
    .where(
      and(
        eq(reservationRequests.requestId, requestId),
        inArray(reservationRequests.userId, myIds),
      ),
    )
    .limit(1);

  if (!req) return { error: "Request not found for your account." };
  if (req.status !== "pending" && req.status !== "reviewed") {
    return { error: `A ${req.status} request can't be cancelled.` };
  }

  await db
    .update(reservationRequests)
    .set({
      status: "cancelled",
      cancelledAt: new Date(),
      cancelReason: cleanReason,
    })
    .where(
      and(
        eq(reservationRequests.requestId, requestId),
        inArray(reservationRequests.userId, myIds),
        inArray(reservationRequests.status, ["pending", "reviewed"]),
      ),
    );

  revalidatePath("/booking-status");
  return { success: true };
}
