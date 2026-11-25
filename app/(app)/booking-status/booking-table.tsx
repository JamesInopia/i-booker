"use client";

import type { Booking, BookingStatus } from "@/lib/definitions";
import Link from "next/link";
import { useTrackedRouter as useRouter } from "../../components/loading-provider";
import { useMemo, useState } from "react";
import {
  ListFilters,
  STATUS_SORTS,
  filterRows,
  type SortKey,
} from "@/app/components/list-filters";

const statusColor: Record<BookingStatus, string> = {
  pending: "text-yellow-500",
  reviewed: "text-blue-500",
  approved: "text-green-500",
  rejected: "text-red-500",
  cancelled: "text-gray-500",
};

// Same look as the Review tab's table: left-aligned columns, a line under each row, the row lights up on hover.
const TH = "px-3 py-3 text-left text-sm font-bold whitespace-nowrap";
const TD = "px-3 py-3 text-sm";

export default function BookingTable({ bookings }: { bookings: Booking[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [show, setShow] = useState("all");
  const [sort, setSort] = useState<SortKey>("requested_desc");

  const shown = useMemo(
    () =>
      filterRows(bookings, q, show, sort, {
        id: (b) => b.id,
        status: (b) => b.status,
        scheduled: (b) => b.schedule.date,
        text: (b) => [String(b.id), b.room, b.purpose],
      }),
    [bookings, q, show, sort],
  );

  return (
    <>
      <div data-tour="filters" className="mb-3">
        <ListFilters
          q={q}
          onQ={setQ}
          placeholder="Search for Booking"
          show={show}
          onShow={setShow}
          showOptions={(Object.keys(statusColor) as BookingStatus[]).map(
            (s) => ({
              value: s,
              label: s.charAt(0).toUpperCase() + s.slice(1),
            }),
          )}
          sort={sort}
          onSort={setSort}
          sortOptions={STATUS_SORTS}
        />
      </div>

      {/* Below lg the table keeps its columns and scrolls sideways. Clicking a row opens that request's details. */}
      <section data-tour="table" className="@container flex-1 overflow-x-auto rounded-lg bg-container p-4 shadow-sm">
        <table className="min-w-176 border-collapse lg:min-w-full">
          <thead>
            <tr className="border-b border-black">
              <th scope="col" className={TH}>Room</th>
              <th scope="col" className={TH}>Purpose</th>
              <th scope="col" className={TH}>Date Booked</th>
              <th scope="col" className={TH}>Booking Schedule</th>
              <th scope="col" className={TH}>Status</th>
            </tr>
          </thead>
          <tbody>
            {bookings.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-500">
                  {/* As wide as the visible area (not the scrolling table), so it stays on screen on a phone. */}
                  <div className="sticky left-0 w-[calc(100cqw-2rem)]">
                    <p className="mb-4 text-lg">No requests made yet.</p>
                    <Link
                      href="/booking"
                      className="inline-block rounded-full bg-blue-900 px-6 py-2 font-semibold text-white hover:bg-blue-800"
                    >
                      Book a room
                    </Link>
                  </div>
                </td>
              </tr>
            )}

            {bookings.length > 0 && shown.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-500">
                  <div className="sticky left-0 w-[calc(100cqw-2rem)]">
                    No requests match your search.
                  </div>
                </td>
              </tr>
            )}

            {shown.map((b) => {
              const open = () => router.push(`/booking-status/${b.id}`);
              return (
                <tr
                  key={b.id}
                  tabIndex={0}
                  onClick={open}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.target === e.currentTarget) open();
                  }}
                  aria-label={`Open request for ${b.room}, ${b.schedule.date}`}
                  className="cursor-pointer border-b border-accent-6 hover:bg-accent-4 focus-visible:bg-accent-4 focus-visible:outline-none"
                >
                  <td className={`${TD} font-bold`}>{b.room}</td>
                  <td className={TD}>{b.purpose}</td>
                  <td className={TD}>{b.dateBooked}</td>
                  <td className={TD}>
                    <div>{b.schedule.date}</div>
                    <div>{b.schedule.time}</div>
                  </td>
                  <td className={`${TD} font-semibold capitalize ${statusColor[b.status]}`}>
                    {b.status}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </>
  );
}
