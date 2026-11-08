import "server-only";
import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  activityTypes,
  user as authUsers,
  reservationRequests,
  reservationSlotRooms,
  reservationSlots,
  rooms,
} from "@/db/schema";
import type { ReviewBooking, ReviewSlot } from "./types";

const formatDate = (value: string | Date) =>
  new Date(value).toLocaleDateString("en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "short",
    day: "numeric",
  });

const formatTime = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString("en-PH", {
    hour: "numeric",
    minute: "2-digit",
  });
};

export async function getReviewBookings(
  ids?: number[],
): Promise<ReviewBooking[]> {
  if (ids && ids.length === 0) return [];

  const requests = await db
    .select({
      id: reservationRequests.requestId,
      status: reservationRequests.status,
      requestor: reservationRequests.requestor,
      email: authUsers.email,
      contact: reservationRequests.contactDetails,
      program: reservationRequests.program,
      natureOther: reservationRequests.natureOther,
      activityName: activityTypes.name,
      requestDate: reservationRequests.requestDate,
      liaisonRemarks: reservationRequests.liaisonRemarks,
      supervisorRemarks: reservationRequests.supervisorRemarks,
      cancelReason: reservationRequests.cancelReason,
      decidedAt: reservationRequests.decidedAt,
    })
    .from(reservationRequests)
    .innerJoin(authUsers, eq(authUsers.id, reservationRequests.userId))
    .innerJoin(
      activityTypes,
      eq(activityTypes.activityTypeId, reservationRequests.activityTypeId),
    )
    .where(ids ? inArray(reservationRequests.requestId, ids) : undefined)
    .orderBy(desc(reservationRequests.requestDate));

  if (requests.length === 0) return [];

  const slotRows = await db
    .select({
      requestId: reservationSlots.requestId,
      slotId: reservationSlots.slotId,
      date: reservationSlots.dateOfActivity,
      start: reservationSlots.startTime,
      end: reservationSlots.endTime,
      occupants: reservationSlots.occupantQuantity,
      details: reservationSlots.detailsOfActivity,
      room: rooms.name,
    })
    .from(reservationSlots)
    .leftJoin(
      reservationSlotRooms,
      eq(reservationSlotRooms.slotId, reservationSlots.slotId),
    )
    .leftJoin(rooms, eq(rooms.roomId, reservationSlotRooms.roomId))
    .where(
      inArray(
        reservationSlots.requestId,
        requests.map((r) => r.id),
      ),
    )
    .orderBy(reservationSlots.dateOfActivity, reservationSlots.startTime);

  const slotsByRequest = new Map<number, Map<number, ReviewSlot>>();
  for (const r of slotRows) {
    const bySlot =
      slotsByRequest.get(r.requestId) ?? new Map<number, ReviewSlot>();
    const slot = bySlot.get(r.slotId) ?? {
      dateISO: r.date,
      date: formatDate(`${r.date}T00:00:00+08:00`),
      time: `${formatTime(r.start)} - ${formatTime(r.end)}`,
      rooms: [],
      occupants: r.occupants,
      details: r.details ?? "",
    };
    if (r.room) slot.rooms.push(r.room);
    bySlot.set(r.slotId, slot);
    slotsByRequest.set(r.requestId, bySlot);
  }

  return requests.map((r) => ({
    id: r.id,
    status: r.status,
    requestor: r.requestor,
    email: r.email,
    contact: r.contact,
    program: r.program ?? "",
    purpose: r.natureOther || r.activityName,
    requestDateISO: r.requestDate.toISOString(),
    requestDate: formatDate(r.requestDate),
    slots: [...(slotsByRequest.get(r.id)?.values() ?? [])],
    liaisonRemarks: r.liaisonRemarks,
    supervisorRemarks: r.supervisorRemarks,
    cancelReason: r.cancelReason,
    decidedAt: r.decidedAt ? formatDate(r.decidedAt) : null,
  }));
}
