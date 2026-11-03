"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { accountsHref, SHOW_OPTIONS, type AccountsQuery, type ShowKey } from "./filters";

const control =
  "h-8 rounded-full bg-container px-4 text-xs shadow-md outline-none focus:ring-2 focus:ring-accent-1";

export function AccountsFilters({ query }: { query: AccountsQuery }) {
  const router = useRouter();
  const [search, setSearch] = useState(query.q);

  const go = (next: Partial<AccountsQuery>) =>
    router.replace(accountsHref({ ...query, q: search.trim(), ...next }), { scroll: false });

  useEffect(() => {
    if (search.trim() === query.q) return;
    const t = window.setTimeout(() => router.replace(accountsHref({ ...query, q: search.trim() }), { scroll: false }), 350);
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
      <label className="flex flex-col gap-1 text-sm font-semibold">
        Show
        <select
          value={query.show}
          onChange={(e) => go({ show: e.target.value as ShowKey })}
          className={`${control} w-56 font-normal`}
        >
          {SHOW_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <label className="ml-auto flex flex-col gap-1 text-sm font-semibold">
        Search
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          maxLength={100}
          placeholder="Search for User"
          className={`${control} w-64 font-normal`}
        />
      </label>
    </form>
  );
}
