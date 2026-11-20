import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { reports, user } from "@/db/schema";
import { REPORT_NATURES, REPORT_PRIORITIES, type ReportPriority } from "@/lib/report";
import type { ReportRow } from "./types";

const formatWhen = (d: Date) =>
  d.toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

const asPriority = (v: string | null): ReportPriority | null =>
  REPORT_PRIORITIES.find((p) => p.value === v)?.value ?? null;

export async function getReports(): Promise<ReportRow[]> {
  const rows = await db
    .select({
      id: reports.reportId,
      nature: reports.nature,
      description: reports.description,
      createdAt: reports.createdAt,
      attachments: reports.attachments,
      priority: reports.priority,
      reporterName: user.name,
      reporterEmail: user.email,
    })
    .from(reports)
    .leftJoin(user, eq(user.id, reports.userId))
    .orderBy(desc(reports.createdAt));

  return rows.map(
    (r): ReportRow => ({
      id: r.id,
      nature: r.nature,
      natureLabel: REPORT_NATURES.find((n) => n.value === r.nature)?.label ?? r.nature,
      description: r.description,
      createdAtLabel: formatWhen(r.createdAt),
      reporterName: r.reporterName?.trim() || r.reporterEmail?.split("@")[0] || null,
      reporterEmail: r.reporterEmail,
      attachments: r.attachments,
      priority: asPriority(r.priority),
    }),
  );
}
