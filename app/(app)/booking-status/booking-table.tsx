"use client";

import type { Booking, BookingStatus } from "@/lib/definitions";
import Link from "next/link";
import RowActions from "./row-actions";
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

// Column headings shrink with the screen; the pinned actions column sticks to the right edge while the rest scrolls.
const TH = "max-lg:whitespace-nowrap px-3 py-3 text-base font-bold md:text-lg xl:px-4 xl:text-2xl";
const PIN = "max-lg:sticky max-lg:right-0 max-lg:shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.25)]";

export default function BookingTable({ bookings }: { bookings: Booking[] }) {
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

      {/* Below lg the table keeps its columns and scrolls sideways; the actions column stays pinned on the right. */}
      <div data-tour="table" className="@container flex-1 overflow-x-auto px-3 py-3 bg-white rounded-[15px]">
        <table className="min-w-176 border-separate border-spacing-y-2 text-center text-sm lg:min-w-full">
          <thead>
            <tr>
              <th scope="col" className={TH}>
                Room
              </th>
              <th scope="col" className={TH}>
                Purpose
              </th>
              <th scope="col" className={TH}>
                Date Booked
              </th>
              <th scope="col" className={`${TH} !px-0`}>
                Booking Schedule
              </th>
              <th scope="col" className={TH}>
                Status
              </th>
              <th scope="col" className={`${TH} ${PIN} bg-white`}>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {bookings.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-gray-500">
                  {/* As wide as the visible area (not the scrolling table), so it stays on screen on a phone. */}
                  <div className="sticky left-0 w-[calc(100cqw-1.5rem)]">
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
                <td colSpan={6} className="py-8 text-gray-500">
                  <div className="sticky left-0 w-[calc(100cqw-1.5rem)]">
                    No requests match your search.
                  </div>
                </td>
              </tr>
            )}

            {shown.map((b) => (
              <tr key={b.id}>
                <td className="rounded-l-[15px] bg-gray-200 px-4 py-3 font-bold text-left">
                  {b.room}
                </td>
                <td className="bg-gray-200 px-4 py-3">{b.purpose}</td>
                <td className="bg-gray-200 px-4 py-3">{b.dateBooked}</td>
                <td className="bg-gray-200 px-4 py-3">
                  <div>{b.schedule.date}</div>
                  <div>{b.schedule.time}</div>
                </td>
                <td
                  className={`bg-gray-200 px-4 py-3 font-semibold capitalize ${statusColor[b.status]}`}
                >
                  {b.status}
                </td>
                <td className={`rounded-r-[15px] bg-gray-200 px-4 py-3 ${PIN}`}>
                  <RowActions id={b.id} status={b.status} booking={b} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
