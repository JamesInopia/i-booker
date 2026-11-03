import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  activityTypes,
  appUsers,
  reservationRequests,
  reservationSlotRooms,
  reservationSlots,
  rooms,
} from "@/db/schema";
import type { ArchiveDetail, ArchiveRow } from "@/lib/definitions";
import { formatDate, formatTime } from "../booking/rules";

const FINISHED = ["approved", "rejected", "cancelled"] as const;

const dmy = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d}-${m}-${y}`;
};

const manilaIso = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(d);

const manilaDmy = (d: Date) => dmy(manilaIso(d));

export async function getArchiveRows(): Promise<ArchiveRow[]> {
  const rows = await db
    .select({
      id: reservationRequests.requestId,
      requestor: reservationRequests.requestor,
      natureOther: reservationRequests.natureOther,
      activityName: activityTypes.name,
      room: rooms.name,
      requestDate: reservationRequests.requestDate,
      scheduledDate: reservationSlots.dateOfActivity,
      status: reservationRequests.status,
    })
    .from(reservationRequests)
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
    .where(inArray(reservationRequests.status, [...FINISHED]))
    .orderBy(desc(reservationRequests.requestDate));

  return rows.map((r) => ({
    id: r.id,
    requestor: r.requestor,
    purpose: r.natureOther || r.activityName,
    room: r.room ?? "—",
    requestDate: manilaDmy(r.requestDate),
    scheduledDate: dmy(r.scheduledDate),
    status: r.status as ArchiveRow["status"],
  }));
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
      email: appUsers.email,
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
        inArray(reservationRequests.requestId, ids),
        inArray(reservationRequests.status, [...FINISHED]),
      ),
    );

  const byId = new Map(rows.map((r) => [r.id, r]));

  // keep the order the admin selected them in
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
