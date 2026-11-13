"use server";

import { and, eq, inArray, sql, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { reservationRequests } from "@/db/schema";
import { requireRole } from "@/lib/auth";

export async function deleteArchived(ids: number[]) {
  await requireRole("admin_liaison", "admin_supervisor");

  const clean = [...new Set(ids)].filter(Number.isInteger).slice(0, 200);
  if (clean.length === 0) return { error: "Nothing selected..." };
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
  }).format(new Date());

  try {
    const done = await db
      .delete(reservationRequests)
      .where(
        and(
          // Only the requests that were actually selected.
          inArray(reservationRequests.requestId, clean),
          // ...and only if they are still archived (safety check).
          or(
            inArray(reservationRequests.status, ["rejected", "cancelled"]),
            and(
              eq(reservationRequests.status, "approved"),
              sql`exists (
                select 1 from reservation_slot s
                where s.request_id = ${reservationRequests.requestId}
                  and s.date_of_activity < ${today}
              )`,
            ),
          ),
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
