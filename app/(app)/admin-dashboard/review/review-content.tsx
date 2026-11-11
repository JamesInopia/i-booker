import type { Role } from "@/lib/session";
import { applyQuery, parseQuery, reviewHref } from "./filters";
import { getReviewBookings } from "./queries";
import { ReviewDetail, type ScrollerOption } from "./review-detail";
import { ReviewFilters } from "./review-filters";
import { ReviewTable } from "./review-table";
import { roomSummary, scheduleSummary } from "./types";

const CLOSED = new Set<string>(["rejected", "cancelled"]);

export type ReviewParams = {
  sort?: string;
  show?: string;
  q?: string;
  request?: string;
};

export async function ReviewContent({
  params,
  role,
}: {
  params: ReviewParams;
  role: Role;
}) {
  const query = parseQuery(params);
  const all = (await getReviewBookings()).filter((b) => !CLOSED.has(b.status));
  const visible = applyQuery(all, query);

  const requestId = /^\d+$/.test(params.request ?? "")
    ? Number(params.request)
    : null;
  const current =
    requestId === null ? null : all.find((b) => b.id === requestId);

  if (current) {
    const list = visible.some((b) => b.id === current.id)
      ? visible
      : applyQuery(all, { ...query, show: "all", q: "" });

    const options: ScrollerOption[] = list.map((b) => ({
      id: b.id,
      href: reviewHref(query, b.id),
      label: `${b.purpose} · ${scheduleSummary(b)} · ${roomSummary(b)}`,
    }));

    return (
      <ReviewDetail
        key={current.id}
        booking={current}
        role={role}
        backHref={reviewHref(query)}
        options={options}
      />
    );
  }

  return (
    <div className="space-y-4">
      <ReviewFilters query={query} />
      <ReviewTable bookings={visible} query={query} />
    </div>
  );
}
