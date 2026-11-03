"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { reviewHref, SHOW_OPTIONS, SORT_OPTIONS, type ReviewQuery, type ShowKey, type SortKey } from "./filters";

const control =
  "h-8 rounded-full border border-accent-6 bg-container px-3 text-xs outline-none focus:border-accent-1";

export function ReviewFilters({ query }: { query: ReviewQuery }) {
  const router = useRouter();
  const [search, setSearch] = useState(query.q);

  const go = (next: Partial<ReviewQuery>) =>
    router.replace(reviewHref({ ...query, q: search.trim(), ...next }), { scroll: false });

  useEffect(() => {
    if (search.trim() === query.q) return;
    const t = window.setTimeout(() => router.replace(reviewHref({ ...query, q: search.trim() }), { scroll: false }), 350);
    return () => window.clearTimeout(t);
  }, [search, query, router]);

  return (
    <form
      className="flex flex-wrap items-end gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        go({});
      }}
    >
      <label className="flex flex-col gap-1 text-xs font-semibold">
        Sort By
        <select
          value={query.sort}
          onChange={(e) => go({ sort: e.target.value as SortKey })}
          className={`${control} w-56`}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs font-semibold">
        Show
        <select
          value={query.show}
          onChange={(e) => go({ show: e.target.value as ShowKey })}
          className={`${control} w-40`}
        >
          {SHOW_OPTIONS.map((o) => (
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
          placeholder="Search for Booking"
          className={`${control} w-60`}
        />
      </label>
    </form>
  );
}
