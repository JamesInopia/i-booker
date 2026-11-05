import "server-only";
import { and, desc, eq, lt } from "drizzle-orm";
import { db } from "@/db";
import {
  activityTypes,
  reservationRequests,
  reservationSlotRooms,
  reservationSlots,
  rooms,
} from "@/db/schema";
import type { ArchiveRow } from "@/lib/definitions";

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
    .where(
      and(
        eq(reservationRequests.status, "approved"),
        lt(reservationSlots.dateOfActivity, manilaIso(new Date())),
      ),
    )
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
