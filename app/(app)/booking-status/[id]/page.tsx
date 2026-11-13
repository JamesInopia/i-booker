import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  activityTypes,
  reservationRequests,
  reservationSlots,
  reservationSlotRooms,
  rooms,
  user as authUsers,
} from "@/db/schema";
import { requireUser } from "@/lib/auth";

function formatDate(value: string | Date) {
  const date =
    typeof value === "string"
      ? new Date(
          /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00+08:00` : value,
        )
      : value;

  return date.toLocaleDateString("en-PH", {
    timeZone: "Asia/Manila",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(value: string) {
  const [hour, minute] = value.split(":").map(Number);

  return new Date(Date.UTC(2000, 0, 1, hour, minute)).toLocaleTimeString(
    "en-US",
    {
      timeZone: "UTC",
      hour: "numeric",
      minute: "2-digit",
    },
  );
}

function DetailField({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-bold text-black">{label}</label>

      <div className="flex min-h-12.25 items-center rounded-md border border-gray-300 bg-white px-5 py-3 text-base text-black wrap-break-word">
        {value === null || value === undefined || value === "" ? "—" : value}
      </div>
    </div>
  );
}

export default async function ReservationReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const requestId = Number(id);

  if (!Number.isSafeInteger(requestId) || requestId <= 0) {
    notFound();
  }

  const results = await db
    .select({
      id: reservationRequests.requestId,
      status: reservationRequests.status,

      requestor: reservationRequests.requestor,
      email: authUsers.email,
      contact: reservationRequests.contactDetails,
      program: reservationRequests.program,

      activityName: activityTypes.name,
      natureOther: reservationRequests.natureOther,

      dateOfActivity: reservationSlots.dateOfActivity,
      startTime: reservationSlots.startTime,
      endTime: reservationSlots.endTime,
      occupants: reservationSlots.occupantQuantity,
      description: reservationSlots.detailsOfActivity,
      supervisorRemarks: reservationRequests.supervisorRemarks,
      cancelledAt: reservationRequests.cancelledAt,
      cancelReason: reservationRequests.cancelReason,
      decidedAt: reservationRequests.decidedAt,

      room: rooms.name,
    })
    .from(reservationRequests)
    .innerJoin(authUsers, eq(authUsers.id, reservationRequests.userId))
    .innerJoin(
      activityTypes,
      eq(activityTypes.activityTypeId, reservationRequests.activityTypeId),
    )
    .innerJoin(
      reservationSlots,
      eq(reservationSlots.requestId, reservationRequests.requestId),
    )
    .leftJoin(
      reservationSlotRooms,
      eq(reservationSlotRooms.slotId, reservationSlots.slotId),
    )
    .leftJoin(rooms, eq(rooms.roomId, reservationSlotRooms.roomId))
    .where(
      and(
        eq(reservationRequests.requestId, requestId),
        eq(sql`lower(${authUsers.email})`, user.email.toLowerCase()),
        inArray(reservationRequests.status, [
          "approved",
          "rejected",
          "cancelled",
        ]),
      ),
    )
    .orderBy(asc(reservationSlots.startTime));

  const booking = results[0];
  const timeLabel = [
    ...new Set(
      results.map(
        (r) => `${formatTime(r.startTime)} - ${formatTime(r.endTime)}`,
      ),
    ),
  ].join(", ");

  if (!booking) {
    notFound();
  }

  const heading = {
    approved: { label: "Approved", color: "text-green-600" },
    rejected: { label: "Rejected", color: "text-red-600" },
    cancelled: { label: "Cancelled", color: "text-gray-600" },
  }[booking.status as "approved" | "rejected" | "cancelled"];

  const isCancelled = booking.status === "cancelled";
  const closedAt = isCancelled ? booking.cancelledAt : booking.decidedAt;

  return (
    <main className="min-h-screen bg-background px-6 py-8 md:px-10">
      {/* Back navigation */}
      <Link
        href="/booking-status"
        className="mb-5 inline-flex items-center gap-2 text-base font-semibold text-blue-700 hover:underline"
      >
        &lt; Back to Reservation Status
      </Link>

      {/* White reservation details container */}
      <section className="rounded-xl bg-white p-6 shadow-sm md:p-8">
        {/* Reservation status */}
        <h1 className={`mb-5 text-4xl font-bold ${heading.color}`}>
          {heading.label}
        </h1>

        {/* Two-column booking details */}
        <div className="grid grid-cols-1 gap-x-11 gap-y-5 md:grid-cols-2">
          <DetailField label="Requestor's Name" value={booking.requestor} />

          <DetailField label="Requestor's Email" value={booking.email} />

          <DetailField
            label="Date"
            value={formatDate(booking.dateOfActivity)}
          />

          <DetailField label="Room" value={booking.room} />

          <DetailField
            label="Time"
            value={timeLabel}
          />

          <DetailField label="No. of Occupants" value={booking.occupants} />

          <DetailField
            label="Booking Purpose"
            value={booking.natureOther || booking.activityName}
          />

          <DetailField label="Contact No." value={booking.contact} />

          <DetailField label="Program" value={booking.program} />
        </div>

        {/* Full-width booking description */}
        <div className="mt-5">
          <label className="mb-1 block text-sm font-bold">
            Booking Description
          </label>

          <div className="min-h-40 whitespace-pre-wrap wrap-break-word rounded-md border border-gray-300 bg-white px-5 py-4 text-base">
            {booking.description || "—"}
          </div>
        </div>

        {booking.status === "approved" && booking.supervisorRemarks && (
          <div className="mt-5">
            {booking.supervisorRemarks && (
              <div>
                <label className="mb-1 block text-sm font-bold">
                  Supervisor&apos;s Remarks
                </label>
                <div className="whitespace-pre-wrap wrap-break-word rounded-md border border-gray-300 bg-white px-5 py-4 text-base">
                  {booking.supervisorRemarks}
                </div>
              </div>
            )}
          </div>
        )}

        {(booking.status === "rejected" || isCancelled) && (
          <div className="mt-5 space-y-5">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <DetailField
                label={isCancelled ? "Date Cancelled" : "Date Rejected"}
                value={closedAt ? formatDate(closedAt) : null}
              />
              <DetailField
                label={isCancelled ? "Cancellation Reason" : "Rejection Reason"}
                value={booking.cancelReason}
              />
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
