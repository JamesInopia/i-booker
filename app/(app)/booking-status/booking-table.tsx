import type { Booking, BookingStatus } from "@/lib/definitions";
import Link from "next/link";
import RowActions from "./row-actions";

const statusColor: Record<BookingStatus, string> = {
  pending: "text-yellow-500",
  reviewed: "text-blue-500",
  approved: "text-green-500",
  rejected: "text-red-500",
  cancelled: "text-gray-300",
};

export default function BookingTable({ bookings }: { bookings: Booking[] }) {
  return (
    <div className="flex-1 overflow-x-auto px-3 py-3 bg-white rounded-[15px]">
      <table className="min-w-full border-separate border-spacing-y-2 text-center text-sm">
        <thead>
          <tr>
            <th scope="col" className="px-4 py-3 text-2xl font-bold">
              Room
            </th>
            <th scope="col" className="px-4 py-3 text-2xl font-bold">
              Purpose
            </th>
            <th scope="col" className="px-4 py-3 text-2xl font-bold">
              Date Booked
            </th>
            <th scope="col" className="py-4 text-2xl font-bold">
              Booking Schedule
            </th>
            <th scope="col" className="px-4 py-3 text-2xl font-bold">
              Status
            </th>
            <th scope="col" className="px-4 py-3">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {bookings.length === 0 && (
            <tr>
              <td colSpan={6} className="py-8 text-gray-500">
                <p className="mb-4 text-lg">No requests made yet.</p>
                <Link
                  href="/booking"
                  className="inline-block rounded-full bg-blue-900 px-6 py-2 font-semibold text-white hover:bg-blue-800"
                >
                  Book a room
                </Link>
              </td>
            </tr>
          )}
          {bookings.map((b) => (
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
              <td className="rounded-r-[15px] bg-gray-200 px-4 py-3">
                <RowActions id={b.id} status={b.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
