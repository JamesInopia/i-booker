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

  // A request can have several slots; collect all of its times.
  const byId = new Map<number, (typeof rows)[number]>();
  const timesById = new Map<number, { start: string; end: string }[]>();
  for (const r of [...rows].sort((a, b) => a.startTime.localeCompare(b.startTime))) {
    if (!byId.has(r.id)) byId.set(r.id, r);
    const list = timesById.get(r.id) ?? [];
    const start = r.startTime.slice(0, 5);
    const end = r.endTime.slice(0, 5);
    if (!list.some((t) => t.start === start && t.end === end))
      list.push({ start, end });
    timesById.set(r.id, list);
  }

  return ids.flatMap((id) => {
    const r = byId.get(id);
    if (!r) return [];
    const times = timesById.get(id) ?? [];
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
        startTime: times.map((t) => formatTime(t.start)).join(", "),
        endTime: times.map((t) => formatTime(t.end)).join(", "),
        time: times
          .map((t) => `${formatTime(t.start)} - ${formatTime(t.end)}`)
          .join(", "),
        venue: r.room ?? "—",
        participants: r.occupants,
        details: r.details ?? "",
      },
    ];
  });
}
