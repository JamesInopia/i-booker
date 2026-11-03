"use server";

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { db } from "@/db";
import { roomPictures, rooms, reservationSlotRooms } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { ADMIN_ROLES } from "@/lib/session";
import type { RoomListing } from "./rules";

export type ManagedRoom = RoomListing & { gallery: (string | null)[] };
export type RoomInput = {
  roomId?: string;
  name: string;
  description: string;
  maxCapacity: string;
  prohibitions: string;
  thumbnail: string | null;
  gallery: (string | null)[];
};
export type RoomResult =
  | { ok: true; room: ManagedRoom }
  | { ok: false; error: string };
export type DeleteRoomResult = { ok: true } | { ok: false; error: string };

const BUCKET = "room-images";
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const IMAGE_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

function storage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret)
    throw new Error(
      "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY on the server.",
    );
  return createClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function validId(id: unknown): number | null {
  if (typeof id !== "string" || !/^[1-9]\d{0,8}$/.test(id)) return null;
  return Number(id);
}

function isImageBytes(mime: string, bytes: Buffer): boolean {
  if (mime === "image/png")
    return (
      bytes.length >= 8 &&
      bytes
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    );
  if (mime === "image/jpeg")
    return (
      bytes.length >= 3 &&
      bytes[0] === 255 &&
      bytes[1] === 216 &&
      bytes[2] === 255
    );
  if (mime === "image/webp")
    return (
      bytes.length >= 12 &&
      bytes.toString("ascii", 0, 4) === "RIFF" &&
      bytes.toString("ascii", 8, 12) === "WEBP"
    );
  if (mime === "image/gif")
    return (
      bytes.length >= 6 && /^GIF8[79]a$/.test(bytes.toString("ascii", 0, 6))
    );
  return false;
}

function normalized(input: RoomInput): RoomInput {
  if (!input || typeof input !== "object")
    throw new Error("Invalid form data.");
  if (
    typeof input.name !== "string" ||
    !input.name.trim() ||
    input.name.trim().length > 120
  )
    throw new Error("Room name must be between 1 and 120 characters.");
  if (typeof input.description !== "string" || input.description.length > 2000)
    throw new Error("Description is too long.");
  if (typeof input.prohibitions !== "string" || input.prohibitions.length > 500)
    throw new Error("Prohibitions field is too long.");
  if (
    typeof input.maxCapacity !== "string" ||
    !/^[1-9]\d{0,5}$/.test(input.maxCapacity) ||
    Number(input.maxCapacity) > 100000
  )
    throw new Error(
      "Maximum capacity must be a whole number from 1 to 100000.",
    );
  if (!Array.isArray(input.gallery) || input.gallery.length !== 2)
    throw new Error("Exactly two additional image positions are required.");
  for (const img of [input.thumbnail, ...input.gallery]) {
    if (img !== null && typeof img !== "string")
      throw new Error("Invalid image.");
    if (typeof img === "string" && img.length > 3_000_000)
      throw new Error("Image size limit is 2 MB per image.");
  }
  return {
    ...input,
    name: input.name.trim(),
    description: input.description.trim(),
    prohibitions: input.prohibitions.trim(),
  };
}

function objectPath(value: string, origin: string): string | null {
  // Delete only objects from our public bucket / rooms prefix, never user-controlled URLs.
  const prefix = `${origin.replace(/\/$/, "")}/storage/v1/object/public/${BUCKET}/rooms/`;
  if (!value.startsWith(prefix)) return null;
  const path = `rooms/${value.slice(prefix.length)}`;
  return /^rooms\/[1-9]\d{0,8}\/[a-f0-9-]+\.(png|jpg|webp|gif)$/.test(path)
    ? path
    : null;
}

async function removeOwnedImages(
  client: ReturnType<typeof storage>,
  urls: (string | null)[],
) {
  const origin = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const paths = urls.flatMap((url) =>
    url ? [objectPath(url, origin)].filter((x): x is string => x !== null) : [],
  );
  if (paths.length) {
    const { error } = await client.storage.from(BUCKET).remove(paths);
    if (error)
      console.error("Could not remove unused room images:", error.message);
  }
}

async function resolveImage(
  value: string | null,
  oldValue: string | null,
  roomId: number,
  client: ReturnType<typeof storage> | null,
  uploaded: string[],
): Promise<string | null> {
  if (value === null) return null;
  if (value === oldValue) return value;
  if (!value.startsWith("data:"))
    throw new Error("Please select an image from your computer.");
  const match =
    /^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/]+={0,2})$/.exec(
      value,
    );
  if (!match)
    throw new Error("Only PNG, JPEG, WebP, and GIF uploads are supported.");
  const mime = match[1];
  const bytes = Buffer.from(match[2], "base64");
  if (
    !bytes.length ||
    bytes.length > MAX_IMAGE_BYTES ||
    !isImageBytes(mime, bytes)
  )
    throw new Error(
      "Each image must be a valid PNG, JPEG, WebP, or GIF of 2 MB or less.",
    );
  const path = `rooms/${roomId}/${randomUUID()}.${IMAGE_TYPES[mime]}`;
  const service = client ?? storage();
  const { error } = await service.storage.from(BUCKET).upload(path, bytes, {
    contentType: mime,
    upsert: false,
    cacheControl: "3600",
  });
  if (error)
    throw new Error(
      `Image upload failed: ${error.message}. Check the public ${BUCKET} bucket.`,
    );
  uploaded.push(path);
  return service.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

function friendlyError(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) {
    if (error.code === "23505") return "A room with that name already exists.";
    if (error.code === "23503")
      return "This room is linked to existing records and cannot be deleted.";
    if (error.code === "42P01")
      return "Missing room_pictures table. Confirm the table name and database configuration.";
  }
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}

export async function saveManagedRoom(input: RoomInput): Promise<RoomResult> {
  await requireRole(...ADMIN_ROLES);
  const uploaded: string[] = [];
  let client: ReturnType<typeof storage> | null = null;
  let createdId: number | null = null;
  try {
    const data = normalized(input);
    const id = input.roomId === undefined ? null : validId(input.roomId);
    if (input.roomId !== undefined && id === null)
      throw new Error("Invalid room ID.");
    const existing =
      id === null
        ? null
        : (
            await db.select().from(rooms).where(eq(rooms.roomId, id)).limit(1)
          )[0];
    if (id !== null && !existing)
      throw new Error("Room not found. Refresh and try again.");
    const duplicate = await db
      .select({ id: rooms.roomId })
      .from(rooms)
      .where(eq(rooms.name, data.name))
      .limit(1);
    if (duplicate.length && duplicate[0].id !== id)
      throw new Error("A room with that name already exists.");
    const previousGallery = existing
      ? await db
          .select()
          .from(roomPictures)
          .where(eq(roomPictures.roomId, existing.roomId))
      : [];
    const before = [
      existing?.thumbnail ?? null,
      ...[0, 1].map(
        (position) =>
          previousGallery.find((image) => image.sortOrder === position + 1)
            ?.imagePath ?? null,
      ),
    ];
    // Reserve an ID for new rooms before upload; clean up the row on upload failure.
    let recordId = id;
    if (recordId === null) {
      const [created] = await db
        .insert(rooms)
        .values({
          name: data.name,
          description: data.description,
          maxCapacity: Number(data.maxCapacity),
          prohibitions: data.prohibitions,
          thumbnail: null,
          status: "closed",
        })
        .returning({ id: rooms.roomId });
      recordId = created.id;
      createdId = recordId;
    }
    const roomId = recordId;
    const hasNewImages = [data.thumbnail, ...data.gallery].some(
      (value, index) => value !== before[index] && value !== null,
    );
    if (hasNewImages) client = storage();
    const images: (string | null)[] = [];
    for (const [index, value] of [data.thumbnail, ...data.gallery].entries()) {
      images.push(
        await resolveImage(value, before[index], roomId, client, uploaded),
      );
    }
    await db.transaction(async (tx) => {
      await tx
        .update(rooms)
        .set({
          name: data.name,
          description: data.description,
          maxCapacity: Number(data.maxCapacity),
          prohibitions: data.prohibitions,
          thumbnail: images[0],
          ...(createdId !== null ? { status: "available" } : {}),
        })
        .where(eq(rooms.roomId, roomId));
      await tx.delete(roomPictures).where(eq(roomPictures.roomId, roomId));
      const galleryRows = images
        .slice(1)
        .flatMap((image, position) =>
          image ? [{ roomId, sortOrder: position + 1, imagePath: image }] : [],
        );
      if (galleryRows.length) await tx.insert(roomPictures).values(galleryRows);
    });
    if (createdId !== null) createdId = null;
    const replaced = before.filter((img) => img && !images.includes(img));
    if (replaced.length) {
      try {
        await removeOwnedImages(client ?? storage(), replaced);
      } catch (error) {
        console.error("Room saved, but old image cleanup failed:", error);
      }
    }
    revalidatePath("/booking");
    return {
      ok: true,
      room: {
        roomId: String(roomId),
        name: data.name,
        description: data.description,
        maxCapacity: Number(data.maxCapacity),
        prohibitions: data.prohibitions,
        thumbnail: images[0],
        gallery: images.slice(1),
        status: existing?.status ?? "available",
        available: (existing?.status ?? "available") === "available",
      },
    };
  } catch (error) {
    if (client && uploaded.length) {
      const { error: cleanupError } = await client.storage
        .from(BUCKET)
        .remove(uploaded);
      if (cleanupError)
        console.error(
          "Room upload rollback cleanup failed:",
          cleanupError.message,
        );
    }
    if (createdId !== null) {
      try {
        await db.delete(rooms).where(eq(rooms.roomId, createdId));
      } catch (cleanupError) {
        console.error("Room creation rollback cleanup failed:", cleanupError);
      }
    }
    return { ok: false, error: friendlyError(error) };
  }
}

export async function deleteManagedRoom(
  roomId: string,
): Promise<DeleteRoomResult> {
  await requireRole(...ADMIN_ROLES);
  try {
    const id = validId(roomId);
    if (id === null) throw new Error("Invalid room ID.");
    const [existing] = await db
      .select()
      .from(rooms)
      .where(eq(rooms.roomId, id))
      .limit(1);
    if (!existing) throw new Error("Room not found. Refresh and try again.");
    const [linked] = await db
      .select({ id: reservationSlotRooms.roomId })
      .from(reservationSlotRooms)
      .where(eq(reservationSlotRooms.roomId, id))
      .limit(1);
    if (linked)
      throw new Error(
        "This room has booking records and cannot be deleted. Keep it for history; contact your administrator to mark it unavailable.",
      );
    const gallery = await db
      .select()
      .from(roomPictures)
      .where(eq(roomPictures.roomId, id));
    // FKs in PostgreSQL also protect against concurrent booking inserts.
    await db.delete(rooms).where(eq(rooms.roomId, id));
    const images = [existing.thumbnail, ...gallery.map((img) => img.imagePath)];
    if (images.some(Boolean)) {
      try {
        await removeOwnedImages(storage(), images);
      } catch (error) {
        console.error("Room deleted, but image cleanup failed:", error);
      }
    }
    revalidatePath("/booking");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: friendlyError(error) };
  }
}
