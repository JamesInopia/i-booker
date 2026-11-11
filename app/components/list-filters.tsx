"use client";

export type SortKey =
  | "requested_desc"
  | "requested_asc"
  | "scheduled_asc"
  | "scheduled_desc"
  | "requestor_asc";

type SortOption = { value: SortKey; label: string };
type ShowOption = { value: string; label: string };

const BASE_SORTS: SortOption[] = [
  { value: "requested_desc", label: "Request Date: Newest to Oldest" },
  { value: "requested_asc", label: "Request Date: Oldest to Newest" },
  { value: "scheduled_asc", label: "Scheduled Date: Soonest First" },
  { value: "scheduled_desc", label: "Scheduled Date: Latest First" },
];
export const STATUS_SORTS = BASE_SORTS;
export const ARCHIVE_SORTS: SortOption[] = [
  ...BASE_SORTS,
  { value: "requestor_asc", label: "Requestor Name: A -Z" },
];

const control =
  "h-8 rounded-full border border-accent-6 bg-container px-3 text-xs outline-none focus:border-accent-1";

export function ListFilters({
  q,
  onQ,
  placeholder,
  show,
  onShow,
  showOptions,
  sort,
  onSort,
  sortOptions,
}: {
  q: string;
  onQ: (v: string) => void;
  placeholder: string;
  show: string;
  onShow: (v: string) => void;
  showOptions: ShowOption[];
  sort: SortKey;
  onSort: (v: SortKey) => void;
  sortOptions: SortOption[];
}) {
  return (
    <div className="flex flex-wrap items-end gap-6">
      <label className="flex flex-col gap-1 text-xs font-semibold">
        Sort By
        <select
          value={sort}
          onChange={(e) => onSort(e.target.value as SortKey)}
          className={`${control} w-56`}
        >
          {sortOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs font-semiobold">
        Show
        <select
          value={show}
          onChange={(e) => onShow(e.target.value)}
          className={`${control} w-40`}
        >
          <option value="all">All</option>
          {showOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <label className="ml-auto flex flex-col gap-1 text-xs font-0semibold">
        Search
        <input
          type="search"
          value={q}
          onChange={(e) => onQ(e.target.value)}
          maxLength={100}
          placeholder={placeholder}
          className={`${control} w-60`}
        />
      </label>
    </div>
  );
}

type Accessors<T> = {
  id: (r: T) => number;
  status: (r: T) => string;
  scheduled: (r: T) => string;
  requestor?: (r: T) => string;
  text: (r: T) => (string | null | undefined)[];
};

const ts = (s: string) => {
  const t = Date.parse(s);
  return Number.isNaN(t) ? 0 : t;
};

export function filterRows<T>(
  rows: T[],
  q: string,
  show: string,
  sort: SortKey,
  a: Accessors<T>,
): T[] {
  const needle = q.trim().toLowerCase();

  return rows
    .filter((r) => show === "all" || a.status(r) === show)
    .filter(
      (r) =>
        !needle || a.text(r).some((v) => v?.toLowerCase().includes(needle)),
    )
    .sort((x, y) => {
      switch (sort) {
        case "requested_asc":
          return a.id(x) - a.id(y);
        case "scheduled_asc":
          return ts(a.scheduled(x)) - ts(a.scheduled(y));
        case "scheduled_desc":
          return ts(a.scheduled(y)) - ts(a.scheduled(x));
        case "requestor_asc":
          return (a.requestor?.(x) ?? "").localeCompare(a.requestor?.(y) ?? "");
        default:
          return a.id(y) - a.id(x);
      }
    });
}
