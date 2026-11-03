import { getCurrentUser } from "@/lib/auth";
import { ADMIN_ROLES } from "@/lib/session";
import { buildBookingPdf } from "@/app/(app)/admin-dashboard/review/booking-pdf";
import { getReviewBookings } from "@/app/(app)/admin-dashboard/review/queries";

/** GET /api/booking-details?id=12 -> PDF of one approved booking (admins only). */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  if (!ADMIN_ROLES.includes(user.role)) return new Response("Forbidden", { status: 403 });

  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) return new Response("Invalid id", { status: 400 });

  const [booking] = await getReviewBookings([id]);
  if (!booking) return new Response("Not found", { status: 404 });
  if (booking.status !== "approved") {
    return new Response("Only approved bookings can be downloaded.", { status: 409 });
  }

  return new Response(buildBookingPdf([booking]), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="booking-${booking.id}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
