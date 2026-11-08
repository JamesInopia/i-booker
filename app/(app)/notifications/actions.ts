"use server";

import { requireUser } from "@/lib/auth";
import { markAllRead, markRead } from "@/lib/notifications";

export async function markNotificationRead(id: number): Promise<void> {
  const user = await requireUser();
  if (!Number.isInteger(id) || id <= 0) return;
  await markRead(user.id, id);
}

export async function markAllNotificationsRead(): Promise<void> {
  const user = await requireUser();
  await markAllRead(user.id);
}
