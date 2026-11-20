"use server";

import { inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { reports } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { notifyReportsResolved } from "@/lib/notifications";
import { REPORT_PRIORITIES, type ReportPriority } from "@/lib/report";
import { removeAttachments } from "@/lib/report-storage";
import { REPORT_ROLES } from "@/lib/session";
import type { ActionResult } from "../review/types";

const MAX_IDS = 100;
const fail = (error: string): ActionResult => ({ ok: false, error });

function parseIds(raw: unknown): number[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_IDS) return null;
  const ids = [...new Set(raw)];
  return ids.every((n) => Number.isInteger(n) && n > 0) ? (ids as number[]) : null;
}

/** Set the priority of reports. `null` puts them back to unmarked. */
export async function setReportPriority(rawIds: number[], priority: ReportPriority | null): Promise<ActionResult> {
  await requireRole(...REPORT_ROLES);
  const ids = parseIds(rawIds);
  if (!ids) return fail("Choose at least one report.");
  if (priority !== null && !REPORT_PRIORITIES.some((p) => p.value === priority)) return fail("Choose a valid priority.");

  await db.update(reports).set({ priority }).where(inArray(reports.reportId, ids));

  revalidatePath("/admin-dashboard");
  return { ok: true };
}

/**
 * Resolving a report removes it for good: the row and its screenshots are deleted, and the person who
 * sent it is told it was resolved.
 */
export async function resolveReports(rawIds: number[]): Promise<ActionResult> {
  const actor = await requireRole(...REPORT_ROLES);
  const ids = parseIds(rawIds);
  if (!ids) return fail("Choose at least one report.");

  const removed = await db
    .delete(reports)
    .where(inArray(reports.reportId, ids))
    .returning({ nature: reports.nature, userId: reports.userId, files: reports.attachments });

  await removeAttachments(removed.flatMap((r) => r.files));
  // Someone resolving their own report doesn't need telling.
  await notifyReportsResolved(removed.filter((r) => r.userId !== actor.id));

  revalidatePath("/admin-dashboard");
  return { ok: true };
}
