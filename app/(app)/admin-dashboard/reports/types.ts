import type { ReportPriority } from "@/lib/report";

export type ReportRow = {
  id: number;
  nature: string;
  natureLabel: string;
  description: string;
  createdAtLabel: string;
  /** Null when the reporter's account has since been deleted. */
  reporterName: string | null;
  reporterEmail: string | null;
  /** Storage paths of the screenshots (turned into links only when a report is opened). */
  attachments: string[];
  /** Null = unmarked. */
  priority: ReportPriority | null;
};

export const reporterLabel = (r: ReportRow) => r.reporterName ?? "Deleted user";

export const PRIORITY_LABEL: Record<ReportPriority | "unmarked", string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
  unmarked: "Unmarked",
};

export const PRIORITY_BADGE: Record<ReportPriority | "unmarked", string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-sky-100 text-sky-700",
  unmarked: "bg-gray-100 text-gray-600",
};
