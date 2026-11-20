import { REPORT_NATURES, REPORT_PRIORITIES } from "@/lib/report";
import type { ReportRow } from "./types";

export const SORT_OPTIONS = [
  { value: "newest", label: "Date Reported: Newest to Oldest" },
  { value: "oldest", label: "Date Reported: Oldest to Newest" },
  { value: "priority", label: "Priority: High to Low" },
] as const;
export type SortKey = (typeof SORT_OPTIONS)[number]["value"];

export const PRIORITY_OPTIONS = [
  { value: "all", label: "All" },
  ...REPORT_PRIORITIES,
  { value: "unmarked", label: "Unmarked" },
] as const;

export const NATURE_OPTIONS = [{ value: "all", label: "All" }, ...REPORT_NATURES] as const;

export type ReportsQuery = { sort: SortKey; priority: string; nature: string; q: string };

export const DEFAULT_QUERY: ReportsQuery = { sort: "newest", priority: "all", nature: "all", q: "" };

export function parseQuery(p: { sort?: string; priority?: string; nature?: string; q?: string }): ReportsQuery {
  return {
    sort: SORT_OPTIONS.find((o) => o.value === p.sort)?.value ?? DEFAULT_QUERY.sort,
    priority: PRIORITY_OPTIONS.find((o) => o.value === p.priority)?.value ?? DEFAULT_QUERY.priority,
    nature: NATURE_OPTIONS.find((o) => o.value === p.nature)?.value ?? DEFAULT_QUERY.nature,
    q: (p.q ?? "").trim().slice(0, 100),
  };
}

const RANK = { high: 0, medium: 1, low: 2 } as const;
const rank = (r: ReportRow) => (r.priority ? RANK[r.priority] : 3);

export function applyQuery(list: ReportRow[], query: ReportsQuery): ReportRow[] {
  const needle = query.q.toLowerCase();
  const filtered = list.filter((r) => {
    if (query.priority !== "all" && (r.priority ?? "unmarked") !== query.priority) return false;
    if (query.nature !== "all" && r.nature !== query.nature) return false;
    if (!needle) return true;
    return [String(r.id), r.natureLabel, r.description, r.reporterName ?? "", r.reporterEmail ?? ""]
      .join(" ")
      .toLowerCase()
      .includes(needle);
  });
  // The list arrives newest first, and the sort below is stable, so ties stay newest first.
  if (query.sort === "oldest") return [...filtered].reverse();
  if (query.sort === "priority") return [...filtered].sort((a, b) => rank(a) - rank(b));
  return filtered;
}

export function reportsHref(query: ReportsQuery, reportId?: number): string {
  const qs = new URLSearchParams({ tab: "reports" });
  if (query.sort !== DEFAULT_QUERY.sort) qs.set("sort", query.sort);
  if (query.priority !== DEFAULT_QUERY.priority) qs.set("priority", query.priority);
  if (query.nature !== DEFAULT_QUERY.nature) qs.set("nature", query.nature);
  if (query.q) qs.set("q", query.q);
  if (reportId !== undefined) qs.set("report", String(reportId));
  return `/admin-dashboard?${qs.toString()}`;
}
