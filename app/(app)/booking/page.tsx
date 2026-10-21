/*NOTE: THIS IS PLACEHOLDER TO BEGIN BOOKING PROCESS! WILL BE REPLACED DURING MERGING */

import { requireUser } from "@/lib/auth";
import { resolveTab } from "@/lib/nav";
import { startBooking } from "./actions";
import { listRooms } from "./queries";

type Params = { tab?: string | string[] };

const first = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v);

export default async function BookingPage({ searchParams }: { searchParams: Promise<Params> }) {
  const user = await requireUser();
  const params = await searchParams;
  const tab = resolveTab("/booking", user.role, first(params.tab));

  if (tab.id === "manage-rooms") {
    return (
      <main className="px-16 pb-8 pt-2">
        <h1 className="text-4xl font-bold">Manage Rooms page</h1>
      </main>
    );
  }

  const rooms = await listRooms();

  return (
    <main className="px-16 pb-8 pt-2">
      <h1 className="text-4xl font-bold">Booking page</h1>

      {rooms.length === 0 ? (
        <p className="mt-8 text-accent-3">No rooms are available for booking yet.</p>
      ) : (
        <ul className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {rooms.map((room) => (
            <li key={room.roomId} className="flex flex-col rounded-xl bg-container p-6 shadow-sm">
              <h2 className="text-xl font-bold">{room.name}</h2>
                {room.maxCapacity && <p className="mt-1 text-sm text-accent-3">Up to {room.maxCapacity} people</p>}
              {room.description && <p className="mt-3 text-sm">{room.description}</p>}
              <form action={startBooking} className="mt-auto pt-6">
                <input type="hidden" name="roomId" value={room.roomId} />
                <button className="rounded-lg bg-accent-1 px-6 py-2 font-semibold text-white hover:brightness-110">
                  Start booking
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
