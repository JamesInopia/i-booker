import type { BookingStatus } from "@/lib/definitions";
import { STATUS_LABEL, type ReviewBooking } from "./types";

export const SORT_OPTIONS = [
  { value: "requested_desc", label: "Request Date: Newest to Oldest" },
  { value: "requested_asc", label: "Request Date: Oldest to Newest" },
  { value: "scheduled_asc", label: "Scheduled Date: Soonest First" },
  { value: "scheduled_desc", label: "Scheduled Date: Latest First" },
  { value: "requester_asc", label: "Requester Name: A to Z" },
] as const;
export type SortKey = (typeof SORT_OPTIONS)[number]["value"];

const STATUSES: BookingStatus[] = ["pending", "reviewed", "approved", "rejected", "cancelled"];
export const SHOW_OPTIONS: { value: "all" | BookingStatus; label: string }[] = [
  { value: "all", label: "All" },
  ...STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] })),
];
export type ShowKey = "all" | BookingStatus;

export type ReviewQuery = { sort: SortKey; show: ShowKey; q: string };

export const DEFAULT_QUERY: ReviewQuery = { sort: "requested_desc", show: "all", q: "" };

export function parseQuery(p: { sort?: string; show?: string; q?: string }): ReviewQuery {
  const sort = SORT_OPTIONS.find((o) => o.value === p.sort)?.value ?? DEFAULT_QUERY.sort;
  const show = SHOW_OPTIONS.find((o) => o.value === p.show)?.value ?? DEFAULT_QUERY.show;
  return { sort, show, q: (p.q ?? "").trim().slice(0, 100) };
}

const scheduledKey = (b: ReviewBooking) => (b.slots[0] ? `${b.slots[0].dateISO} ${b.slots[0].time}` : "");

export function applyQuery(list: ReviewBooking[], query: ReviewQuery): ReviewBooking[] {
  const needle = query.q.toLowerCase();
  const filtered = list.filter((b) => {
    if (query.show !== "all" && b.status !== query.show) return false;
    if (!needle) return true;
    const haystack = [
      String(b.id),
      b.requestor,
      b.email,
      b.purpose,
      ...b.slots.flatMap((s) => s.rooms),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(needle);
  });

  const sorted = [...filtered];
  switch (query.sort) {
    case "requested_asc":
      sorted.sort((a, b) => a.requestDateISO.localeCompare(b.requestDateISO));
      break;
    case "scheduled_asc":
      sorted.sort((a, b) => scheduledKey(a).localeCompare(scheduledKey(b)));
      break;
    case "scheduled_desc":
      sorted.sort((a, b) => scheduledKey(b).localeCompare(scheduledKey(a)));
      break;
    case "requester_asc":
      sorted.sort((a, b) => a.requestor.localeCompare(b.requestor));
      break;
    default:
      sorted.sort((a, b) => b.requestDateISO.localeCompare(a.requestDateISO));
  }
  return sorted;
}

export function reviewHref(query: ReviewQuery, requestId?: number): string {
  const qs = new URLSearchParams({ tab: "review" });
  if (query.sort !== DEFAULT_QUERY.sort) qs.set("sort", query.sort);
  if (query.show !== DEFAULT_QUERY.show) qs.set("show", query.show);
  if (query.q) qs.set("q", query.q);
  if (requestId !== undefined) qs.set("request", String(requestId));
  return `/admin-dashboard?${qs.toString()}`;
}
