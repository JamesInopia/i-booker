import "server-only";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  user as authUsers,
  activityTypes,
  reservationRequests,
  reservationSlots,
  reservationSlotRooms,
  rooms,
} from "@/db/schema";
import type { ArchiveDetail } from "@/lib/definitions";
import { formatDate, formatTime } from "@/app/(app)/booking/rules";

function manilaIso(d: Date | string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(
    new Date(d),
  );
}

export async function getArchiveDetails(
  ids: number[],
): Promise<ArchiveDetail[]> {
  if (ids.length === 0) return [];

  const rows = await db
    .select({
      id: reservationRequests.requestId,
      status: reservationRequests.status,
      activityName: activityTypes.name,
      natureOther: reservationRequests.natureOther,
      requestor: reservationRequests.requestor,
      email: authUsers.email,
      contactDetails: reservationRequests.contactDetails,
      program: reservationRequests.program,
      requestDate: reservationRequests.requestDate,
      dateOfActivity: reservationSlots.dateOfActivity,
      startTime: reservationSlots.startTime,
      endTime: reservationSlots.endTime,
      room: rooms.name,
      occupants: reservationSlots.occupantQuantity,
      details: reservationSlots.detailsOfActivity,
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
    .where(inArray(reservationRequests.requestId, ids));

  const byId = new Map(rows.map((r) => [r.id, r]));

  return ids.flatMap((id) => {
    const r = byId.get(id);
    if (!r) return [];
    return [
      {
        id: r.id,
        status: r.status as ArchiveDetail["status"],
        nature: r.activityName,
        natureOther: r.natureOther ?? "",
        requestor: r.requestor,
        email: r.email,
        contactDetails: r.contactDetails,
        program: r.program ?? "",
        dateFiled: formatDate(manilaIso(r.requestDate)),
        dateOfActivity: formatDate(r.dateOfActivity),
        startTime: formatTime(r.startTime.slice(0, 5)),
        endTime: formatTime(r.endTime.slice(0, 5)),
        venue: r.room ?? "—",
        participants: r.occupants,
        details: r.details ?? "",
      },
    ];
  });
}
