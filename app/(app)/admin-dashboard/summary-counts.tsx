import { count } from "drizzle-orm";
import { db } from "@/db";
import { reservationRequests } from "@/db/schema";

const pad = (n: number) => String(n).padStart(2, "0");

export async function SummaryCounts() {
  const rows = await db
    .select({ status: reservationRequests.status, n: count() })
    .from(reservationRequests)
    .groupBy(reservationRequests.status);

  const by = (status: string) => rows.find((r) => r.status === status)?.n ?? 0;

  const summary = [
    { label: "Total Requests", value: pad(rows.reduce((sum, r) => sum + r.n, 0)) },
    { label: "Reservations in Schedule", value: pad(by("approved")) }, // approved
    { label: "Pending Approval", value: pad(by("reviewed")) }, // sent to the supervisor
    { label: "Requests in Review", value: pad(by("pending")) }, // waiting on the liaison
  ];

  return (
    <ul className="flex flex-wrap gap-4">
      {summary.map((s) => (
        <li key={s.label} className="flex w-28 flex-col items-center rounded-lg bg-container px-3 py-3 text-center shadow-sm">
          <span className="text-2xl font-bold">{s.value}</span>
          <span className="mt-1 text-xs font-semibold leading-tight">{s.label}</span>
        </li>
      ))}
    </ul>
  );
}
