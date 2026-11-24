import { count } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { reservationRequests } from "@/db/schema";
import { DEFAULT_QUERY, reviewHref, type ShowKey } from "./review/filters";

const pad = (n: number) => String(n).padStart(2, "0");

export async function SummaryCounts() {
  const rows = await db
    .select({ status: reservationRequests.status, n: count() })
    .from(reservationRequests)
    .groupBy(reservationRequests.status);

  const by = (status: string) => rows.find((r) => r.status === status)?.n ?? 0;

  // Each card opens the Review tab with the matching "Show" filter.
  const summary: { label: string; value: string; show: ShowKey }[] = [
    { label: "Total Requests", value: pad(rows.reduce((sum, r) => sum + r.n, 0)), show: "all" },
    { label: "Reservations in Schedule", value: pad(by("approved")), show: "approved" },
    { label: "Pending Approval", value: pad(by("reviewed")), show: "reviewed" }, // sent to the supervisor
    { label: "Requests in Review", value: pad(by("pending")), show: "pending" }, // waiting on the liaison
  ];

  return (
    <ul data-tour="summary-counts" className="flex flex-wrap gap-4">
      {summary.map((s) => (
        <li key={s.label}>
          <Link
            href={reviewHref({ ...DEFAULT_QUERY, show: s.show })}
            draggable={false}
            className="flex h-26 w-28 cursor-pointer select-none flex-col items-center justify-center rounded-lg bg-container px-3 py-3 text-center shadow-sm transition-transform duration-150 hover:scale-110 hover:shadow-md focus-visible:scale-110 focus-visible:outline-2 focus-visible:outline-accent-1"
          >
            <span className="text-2xl font-bold">{s.value}</span>
            <span className="mt-1 text-xs font-semibold leading-tight">{s.label}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
