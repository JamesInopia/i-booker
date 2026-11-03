import type { AccountRow } from "./types";

export const SHOW_OPTIONS = [
  { value: "all", label: "All" },
  { value: "admin_supervisor", label: "Admin - Supervisor" },
  { value: "admin_liaison", label: "Admin - Liaison" },
  { value: "requestor", label: "Requestor" },
  { value: "suspended", label: "Suspended" },
] as const;
export type ShowKey = (typeof SHOW_OPTIONS)[number]["value"];

export type AccountsQuery = { show: ShowKey; q: string };

export const DEFAULT_QUERY: AccountsQuery = { show: "all", q: "" };

export function parseQuery(p: { show?: string; q?: string }): AccountsQuery {
  const show = SHOW_OPTIONS.find((o) => o.value === p.show)?.value ?? DEFAULT_QUERY.show;
  return { show, q: (p.q ?? "").trim().slice(0, 100) };
}

export function applyQuery(list: AccountRow[], query: AccountsQuery): AccountRow[] {
  const needle = query.q.toLowerCase();
  return list.filter((a) => {
    if (query.show === "suspended" ? !a.suspended : query.show !== "all" && a.role !== query.show) return false;
    if (!needle) return true;
    return [a.name, a.email, a.shortId].join(" ").toLowerCase().includes(needle);
  });
}

export function accountsHref(query: AccountsQuery): string {
  const qs = new URLSearchParams({ tab: "accounts" });
  if (query.show !== DEFAULT_QUERY.show) qs.set("show", query.show);
  if (query.q) qs.set("q", query.q);
  return `/admin-dashboard?${qs.toString()}`;
}
