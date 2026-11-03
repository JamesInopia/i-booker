"use server";

import { and, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { reservationRequests } from "@/db/schema";
import { requireRole } from "@/lib/auth";

export async function deleteArchived(ids: number[]) {
  await requireRole("admin_liaison", "admin_supervisor");

  const clean = [...new Set(ids)].filter(Number.isInteger).slice(0, 200);
  if (clean.length === 0) return { error: "Nothing selected..." };

  try {
    const done = await db
      .delete(reservationRequests)
      .where(
        and(
          inArray(reservationRequests.requestId, clean),
          inArray(reservationRequests.status, [
            "approved",
            "rejected",
            "cancelled",
          ]),
        ),
      )
      .returning({ id: reservationRequests.requestId });

    if (done.length === 0)
      return { error: "These requests can no longer be deleted." };
  } catch (err) {
    console.error("deleteArchived failed:", err);
    return {
      error:
        "Could not delete. Something else may still depend on these requests.",
    };
  }

  revalidatePath("/booking-archives");
  revalidatePath("/booking-status");
  return { success: true };
}
