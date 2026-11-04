import "server-only";
import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  activityTypes,
  reservationRequests,
  reservationSlotRooms,
  reservationSlots,
  rooms,
} from "@/db/schema";
import type { ArchiveRow } from "@/lib/definitions";

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
