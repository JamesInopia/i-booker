"use client";

import { useMemo, useState } from "react";
import { startBooking } from "./actions";
import type { RoomListing } from "./rules";

const PILL =
  "w-full whitespace-nowrap rounded-full bg-accent-1 px-3 py-1.5 text-sm font-semibold text-white hover:brightness-110 disabled:cursor-not-allowed disabled:bg-accent-6 disabled:text-accent-3/50 disabled:hover:brightness-100";

const STATUS_LABEL: Record<string, string> = { maintenance: "Maintenance", closed: "Closed" };

const capacity = (room: RoomListing) =>
  room.maxCapacity ? `${room.maxCapacity} ${room.maxCapacity === 1 ? "Person" : "People"}` : "Not specified";

const photoSrc = (value: string) => (/^(https?:)?\/\//.test(value) || value.startsWith("/") ? value : `/${value}`);

function Photo({ room, className }: { room: RoomListing; className: string }) {
  if (!room.thumbnail) {
    return (
      <div className={`flex items-center justify-center bg-accent-4 text-sm text-accent-3/60 ${className}`}>
        No photo yet
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={photoSrc(room.thumbnail)} alt={room.name} className={`object-cover ${className}`} />
  );
}

/** Starts the booking process with this room already chosen (see startBooking in actions.ts). */
function BookRoom({
  room,
  className = PILL,
  formClassName,
}: {
  room: RoomListing;
  className?: string;
  formClassName?: string;
}) {
  return (
    <form action={startBooking} className={formClassName}>
      <input type="hidden" name="roomId" value={room.roomId} />
      <button type="submit" disabled={!room.available} className={className}>
        {room.available ? "Book Room" : (STATUS_LABEL[room.status] ?? "Unavailable")}
      </button>
    </form>
  );
}

export function RoomBrowser({ rooms }: { rooms: RoomListing[] }) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? rooms.filter((r) => r.name.toLowerCase().includes(q)) : rooms;
  }, [rooms, query]);

  const selected = visible.find((r) => r.roomId === selectedId) ?? visible[0] ?? null;

  return (
    <div>
      <label className="relative block max-w-xl">
        <span className="sr-only">Search for a room</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for a room"
          className="h-12 w-full rounded-full bg-container px-6 pr-12 shadow-sm outline-none focus:ring-2 focus:ring-accent-1"
        />
        <svg
          viewBox="0 0 20 20"
          className="pointer-events-none absolute right-5 top-1/2 h-5 w-5 -translate-y-1/2 text-accent-3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <circle cx="9" cy="9" r="6" />
          <path d="m14 14 4 4" strokeLinecap="round" />
        </svg>
      </label>

      {rooms.length === 0 ? (
        <p className="mt-8 text-accent-3">No rooms have been added yet.</p>
      ) : visible.length === 0 ? (
        <p className="mt-8 text-accent-3">No rooms match &ldquo;{query.trim()}&rdquo;.</p>
      ) : (
        <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <ul className="grid content-start gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((room) => (
              <li
                key={room.roomId}
                className={`flex flex-col rounded-xl bg-container p-4 shadow-sm ${
                  room.roomId === selected?.roomId ? "ring-2 ring-accent-1" : ""
                }`}
              >
                <Photo room={room} className="aspect-[4/3] w-full rounded-md" />
                <h2 className="mt-3 text-lg font-bold leading-tight">{room.name}</h2>
                <p className="mt-0.5 text-xs font-semibold">Max Capacity: {capacity(room)}</p>
                <div className="mt-auto grid grid-cols-2 gap-2 pt-3">
                  <button
                    type="button"
                    aria-pressed={room.roomId === selected?.roomId}
                    onClick={() => setSelectedId(room.roomId)}
                    className={PILL}
                  >
                    More Info
                  </button>
                  <BookRoom room={room} />
                </div>
              </li>
            ))}
          </ul>

          {selected && (
            <aside
              aria-label="Room details"
              className="flex flex-col rounded-xl bg-container p-6 shadow-sm lg:sticky lg:top-4 lg:self-start"
            >
              <h2 className="text-center text-3xl font-bold">Room Details</h2>
              <Photo room={selected} className="mt-3 aspect-[4/3] w-full rounded-md" />
              <h3 className="mt-4 text-center text-xl font-bold">{selected.name}</h3>

              <dl className="mt-4 text-sm">
                <dt className="text-xs font-bold">Description</dt>
                <dd className="mt-1 text-base">{selected.description || "No description yet."}</dd>

                <div className="mt-5 grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-xs font-bold">Max Capacity:</dt>
                    <dd className="text-xs">{capacity(selected)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold">Prohibitions:</dt>
                    <dd className="text-xs">{selected.prohibitions || "None listed"}</dd>
                  </div>
                </div>
              </dl>

              <div className="mt-6 flex justify-center">
                <BookRoom room={selected} className={`${PILL} py-2.5 text-base`} formClassName="w-full max-w-60" />
              </div>
            </aside>
          )}
        </div>
      )}
    </div>
  );
}