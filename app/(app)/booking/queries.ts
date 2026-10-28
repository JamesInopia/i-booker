import "server-only";
import { randomUUID } from "node:crypto";
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { activityTypes, appUsers, reservationRequests, reservationSlotRooms, reservationSlots, rooms } from "@/db/schema";
import { isId, isOtherName, type Draft, type Nature, type RoomListing, type Slot } from "./rules";

export type Room = { roomId: string; name: string; description: string | null; maxCapacity: number | null };

const ROOM_COLUMNS = {
  roomId: rooms.roomId,
  name: rooms.name,
  description: rooms.description,
  maxCapacity: rooms.maxCapacity,
};

const toRoom = (r: { roomId: number; name: string; description: string | null; maxCapacity: number | null }): Room => ({
  ...r,
  roomId: String(r.roomId),
});

export async function listRooms(): Promise<Room[]> {
  const rows = await db.select(ROOM_COLUMNS).from(rooms).where(eq(rooms.status, "available")).orderBy(asc(rooms.name));
  return rows.map(toRoom);
}

export async function listAllRooms(): Promise<RoomListing[]> {
  const rows = await db
    .select({
      roomId: rooms.roomId,
      name: rooms.name,
      description: rooms.description,
      maxCapacity: rooms.maxCapacity,
      prohibitions: rooms.prohibitions,
      thumbnail: rooms.thumbnail,
      status: rooms.status,
    })
    .from(rooms)
    .orderBy(asc(rooms.roomId));
  return rows.map((r) => ({ ...r, roomId: String(r.roomId), available: r.status === "available" }));
}

export async function getRoom(roomId: string): Promise<Room | null> {
  if (!isId(roomId)) return null;
  const [row] = await db
    .select(ROOM_COLUMNS)
    .from(rooms)
    .where(and(eq(rooms.roomId, Number(roomId)), eq(rooms.status, "available")))
    .limit(1);
  return row ? toRoom(row) : null;
}

export async function getNatures(): Promise<Nature[]> {
  const rows = await db
    .select({ id: activityTypes.activityTypeId, name: activityTypes.name })
    .from(activityTypes)
    .where(eq(activityTypes.isFormOption, true))
    .orderBy(asc(activityTypes.activityTypeId));
  return rows
    .map((r) => ({ id: String(r.id), name: r.name, other: isOtherName(r.name) }))
    .sort((a, b) => Number(a.other) - Number(b.other));
}

export async function getDayBlock(date: string): Promise<string | null> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const res = await db.execute<{ description: string }>(sql`
    select dt.description
    from calendar_day cd join day_type dt on dt.day_type_id = cd.day_type_id
    where cd.calendar_date = ${date}::date and dt.allow_booking = false
    limit 1`);
  const row = res.rows[0];
  return row ? `Bookings are closed on this date (${row.description}). Choose another date.` : null;
}

export async function getBusySlots(roomId: string, date: string): Promise<Slot[]> {
  if (!isId(roomId) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];

  const approved = await db
    .select({ start: reservationSlots.startTime, end: reservationSlots.endTime })
    .from(reservationSlots)
    .innerJoin(reservationRequests, eq(reservationRequests.requestId, reservationSlots.requestId))
    .innerJoin(reservationSlotRooms, eq(reservationSlotRooms.slotId, reservationSlots.slotId))
    .where(
      and(
        eq(reservationSlotRooms.roomId, Number(roomId)),
        eq(reservationSlots.dateOfActivity, date),
        eq(reservationRequests.status, "approved"),
      ),
    );

  const classes = await db.execute<{ start: string; end: string }>(sql`
    select cs.start_time as start, cs.end_time as "end"
    from class_schedule cs join term t on t.term_id = cs.term_id
    where cs.room_id = ${Number(roomId)}
      and ${date}::date between t.start_date and t.end_date
      and cs.day_of_week = extract(isodow from ${date}::date)
      and not exists (
        select 1 from calendar_day cd join day_type dt on dt.day_type_id = cd.day_type_id
        where cd.calendar_date = ${date}::date and dt.is_class_day = false
      )`);

  return [...approved, ...classes.rows]
    .map((r) => ({ start: r.start.slice(0, 5), end: r.end.slice(0, 5) }))
    .sort((a, b) => a.start.localeCompare(b.start));
}

export class BookingError extends Error {}

export async function createRequest(input: {
  email: string;
  requestor: string;
  draft: Draft;
  nature: Nature;
  roomId: string;
}): Promise<void> {
  const { email, requestor, draft, nature, roomId } = input;
  await db.transaction(async (tx) => {
    const columns = { userId: appUsers.userId, status: appUsers.status, suspendedUntil: appUsers.suspendedUntil };
    let [owner] = await tx.select(columns).from(appUsers).where(sql`lower(${appUsers.email}) = ${email}`).limit(1);
    if (!owner) {
      [owner] = await tx.insert(appUsers).values({ userId: randomUUID(), name: requestor, email }).returning(columns);
    }
    if (owner.status === "suspended" && (!owner.suspendedUntil || owner.suspendedUntil > new Date())) {
      throw new BookingError("Your account is suspended, so you can't submit new requests right now.");
    }

    const [request] = await tx
      .insert(reservationRequests)
      .values({
        userId: owner.userId,
        activityTypeId: Number(nature.id),
        natureOther: nature.other ? draft.natureOther : null,
        requestor,
        contactDetails: draft.contactNo,
        program: draft.program || null,
        status: "pending",
      })
      .returning({ requestId: reservationRequests.requestId });

    const [slot] = await tx
      .insert(reservationSlots)
      .values({
        requestId: request.requestId,
        dateOfActivity: draft.date,
        startTime: draft.startTime,
        endTime: draft.endTime,
        occupantQuantity: Number(draft.occupants),
        detailsOfActivity: draft.description,
      })
      .returning({ slotId: reservationSlots.slotId });

    await tx.insert(reservationSlotRooms).values({ slotId: slot.slotId, roomId: Number(roomId) });
  });
}