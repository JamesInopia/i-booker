"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTrackedRouter } from "../../../components/loading-provider";
import {
  NATURE_OPTIONS,
  PRIORITY_OPTIONS,
  reportsHref,
  SORT_OPTIONS,
  type ReportsQuery,
  type SortKey,
} from "./filters";

const control = "h-8 rounded-full border border-accent-6 bg-container px-3 text-xs outline-none focus:border-accent-1";

export function ReportsFilters({ query }: { query: ReportsQuery }) {
  const router = useRouter(); // plain: live search typing should not cover the page
  const tracked = useTrackedRouter();
  const [search, setSearch] = useState(query.q);

  const go = (next: Partial<ReportsQuery>) =>
    tracked.replace(reportsHref({ ...query, q: search.trim(), ...next }), { scroll: false });

  useEffect(() => {
    if (search.trim() === query.q) return;
    const t = window.setTimeout(() => router.replace(reportsHref({ ...query, q: search.trim() }), { scroll: false }), 350);
    return () => window.clearTimeout(t);
  }, [search, query, router]);

  return (
    <form
      data-tour="filters"
      className="flex flex-wrap items-end gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        go({});
      }}
    >
      <label className="flex flex-col gap-1 text-xs font-semibold">
        Sort By
        <select value={query.sort} onChange={(e) => go({ sort: e.target.value as SortKey })} className={`${control} w-56`}>
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs font-semibold">
        Priority
        <select value={query.priority} onChange={(e) => go({ priority: e.target.value })} className={`${control} w-32`}>
          {PRIORITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs font-semibold">
        Nature
        <select value={query.nature} onChange={(e) => go({ nature: e.target.value })} className={`${control} w-48`}>
          {NATURE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <label className="ml-auto flex flex-col gap-1 text-xs font-semibold">
        Search
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          maxLength={100}
          placeholder="Search for Report"
          className={`${control} w-60`}
        />
      </label>
    </form>
  );
}
