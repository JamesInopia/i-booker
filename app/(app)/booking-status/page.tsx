import { asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  activityTypes,
  user as authUsers,
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
    .where(eq(sql`lower(${authUsers.email})`, user.email))
    .orderBy(
      desc(reservationRequests.requestDate),
      asc(reservationSlots.startTime),
    );

  // A request can have several time slots; show it once with every time.
  const grouped = new Map<number, (typeof rows)[number] & { times: string[] }>();
  for (const r of rows) {
    const time = `${formatTime(r.startTime)} - ${formatTime(r.endTime)}`;
    const existing = grouped.get(r.id);
    if (!existing) grouped.set(r.id, { ...r, times: [time] });
    else if (!existing.times.includes(time)) existing.times.push(time);
  }

  const bookings: Booking[] = [...grouped.values()].map((r) => ({
    id: r.id,
    room: r.room ?? "—",
    purpose: r.natureOther || r.activityName,
    dateBooked: formatDate(r.requestDate),
    status: r.status,
    schedule: {
      date: formatDate(r.dateOfActivity),
      time: r.times.join(", "),
    },
  }));

  return (
    <main className="box-border flex flex-col h-screen px-8 py-5">
      <h1 className="text-4xl font-bold pb-5">Reservation Status</h1>

      <BookingTable bookings={bookings} />
    </main>
  );
}
