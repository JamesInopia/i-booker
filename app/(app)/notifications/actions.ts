"use server";

import { requireUser } from "@/lib/auth";
import { deleteAllRead, deleteOne, markAllRead, markRead } from "@/lib/notifications";

export async function markNotificationRead(id: number): Promise<void> {
  const user = await requireUser();
  if (!Number.isInteger(id) || id <= 0) return;
  await markRead(user.id, id);
}

export async function markAllNotificationsRead(): Promise<void> {
  const user = await requireUser();
  await markAllRead(user.id);
}

export async function removeNotification(id: number): Promise<void> {
  const user = await requireUser();
  if (!Number.isInteger(id) || id <= 0) return;
  await deleteOne(user.id, id);
}

/** Deletes only notifications that have already been read. */
export async function clearReadNotifications(): Promise<void> {
  const user = await requireUser();
  await deleteAllRead(user.id);
}
