import { desc, eq, ne, and, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  activityTypes,
  appUsers,
  reservationRequests,
  reservationSlotRooms,
  reservationSlots,
  rooms,
} from "@/db/schema";
import BookingTable from "./booking-table";
import type { Booking } from "@/lib/definitions";
import { requireUser } from "@/lib/auth";

const formatDate = (value: string | Date) =>
  new Date(value).toLocaleDateString("en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

const formatTime = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString("en-PH", {
    hour: "numeric",
    minute: "2-digit",
  });
};

export default async function BookingStatusPage() {
  const user = await requireUser();

  const rows = await db
    .select({
      id: reservationRequests.requestId,
      natureOther: reservationRequests.natureOther,
      activityName: activityTypes.name,
      requestDate: reservationRequests.requestDate,
      status: reservationRequests.status,
      room: rooms.name,
      dateOfActivity: reservationSlots.dateOfActivity,
      startTime: reservationSlots.startTime,
      endTime: reservationSlots.endTime,
    })
    .from(reservationRequests)
    .innerJoin(appUsers, eq(appUsers.userId, reservationRequests.userId))
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
        eq(sql`lower(${appUsers.email})`, user.email),
        ne(reservationRequests.status, "cancelled"),
      ),
    )
    .orderBy(desc(reservationRequests.requestDate));

  const bookings: Booking[] = rows.map((r) => ({
    id: r.id,
    room: r.room ?? "—",
    purpose: r.natureOther || r.activityName,
    dateBooked: formatDate(r.requestDate),
    status: r.status,
    schedule: {
      date: formatDate(r.dateOfActivity),
      time: `${formatTime(r.startTime)} - ${formatTime(r.endTime)}`,
    },
  }));

  return (
    <main className="box-border flex flex-col h-screen px-8 py-5">
      <h1 className="text-4xl font-bold pb-5">Reservation Status</h1>

      <BookingTable bookings={bookings} />
    </main>
  );
}
