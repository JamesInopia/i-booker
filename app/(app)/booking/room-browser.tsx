"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { startBooking } from "./actions";
import type { RoomListing } from "./rules";

const PILL =
  "w-full whitespace-nowrap rounded-full bg-accent-1 px-3 py-1.5 text-sm font-semibold text-white hover:brightness-110 disabled:cursor-not-allowed disabled:bg-accent-6 disabled:text-accent-3/50 disabled:hover:brightness-100";

const STATUS_LABEL: Record<string, string> = {
  maintenance: "Maintenance",
  closed: "Closed",
};

const capacity = (room: RoomListing) =>
  room.maxCapacity
    ? `${room.maxCapacity} ${room.maxCapacity === 1 ? "Person" : "People"}`
    : "Not specified";

const photoSrc = (value: string) =>
  /^(https?:)?\/\//.test(value) || value.startsWith("/") ? value : `/${value}`;

function Photo({ room, className }: { room: RoomListing; className: string }) {
  if (!room.thumbnail) {
    return (
      <div
        className={`flex items-center justify-center bg-accent-4 text-sm text-accent-3/60 ${className}`}
      >
        No photo yet
      </div>
    );
  }
  return (
    <img
      src={photoSrc(room.thumbnail)}
      alt={room.name}
      className={`object-cover ${className}`}
    />
  );
}

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
        {room.available
          ? "Book Room"
          : (STATUS_LABEL[room.status] ?? "Unavailable")}
      </button>
    </form>
  );
}

type RoomWithGallery = RoomListing & {
  gallery: (string | null)[];
};

function RoomPhotoCarousel({ room }: { room: RoomWithGallery }) {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const photos = [room.thumbnail, ...(room.gallery ?? [])].filter(
    (photo): photo is string => Boolean(photo),
  );

  useEffect(() => {
    setIndex(0);
  }, [room.roomId]);

  const next = () => {
    setIndex((current) => (current + 1) % photos.length);
  };

  const previous = () => {
    setIndex((current) => (current - 1 + photos.length) % photos.length);
  };

  if (photos.length === 0) {
    return (
      <div className="mt-3 flex aspect-[4/3] items-center justify-center rounded-md bg-gray-100 text-gray-500">
        No photos available
      </div>
    );
  }

  return (
    <div className="mt-3">
      <div
        className="relative aspect-[4/3] overflow-hidden rounded-md bg-gray-100"
        onTouchStart={(event) => {
          touchStartX.current = event.touches[0].clientX;
        }}
        onTouchEnd={(event) => {
          if (touchStartX.current === null) return;

          const difference =
            event.changedTouches[0].clientX - touchStartX.current;

          if (Math.abs(difference) > 50 && photos.length > 1) {
            if (difference < 0) next();
            else previous();
          }

          touchStartX.current = null;
        }}
      >
        <img
          key={`${room.roomId}-${index}`}
          src={photoSrc(photos[index])}
          alt={`${room.name} - Photo ${index + 1}`}
          className="h-full w-full object-cover"
        />

        {photos.length > 1 && (
          <>
            <button
              type="button"
              onClick={previous}
              aria-label="Previous room photo"
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 px-3 py-2 text-white hover:bg-black/70"
            >
              &#10094;
            </button>

            <button
              type="button"
              onClick={next}
              aria-label="Next room photo"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 px-3 py-2 text-white hover:bg-black/70"
            >
              &#10095;
            </button>

            <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
              {index + 1} / {photos.length}
            </span>
          </>
        )}
      </div>

      {photos.length > 1 && (
        <div className="mt-3 flex justify-center gap-2">
          {photos.map((_, photoIndex) => (
            <button
              key={photoIndex}
              type="button"
              aria-label={`Show room photo ${photoIndex + 1}`}
              aria-current={index === photoIndex ? "true" : undefined}
              onClick={() => setIndex(photoIndex)}
              className={`h-2 rounded-full transition-all ${
                index === photoIndex
                  ? "w-6 bg-accent-1"
                  : "w-2 bg-gray-300 hover:bg-gray-400"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function RoomBrowser({ rooms }: { rooms: RoomWithGallery[] }) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? rooms.filter((r) => r.name.toLowerCase().includes(q)) : rooms;
  }, [rooms, query]);

  const selected =
    visible.find((r) => r.roomId === selectedId) ?? visible[0] ?? null;

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
        <p className="mt-8 text-accent-3">
          No rooms match &ldquo;{query.trim()}&rdquo;.
        </p>
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
                <h2 className="mt-3 text-lg font-bold leading-tight">
                  {room.name}
                </h2>
                <p className="mt-0.5 text-xs font-semibold">
                  Max Capacity: {capacity(room)}
                </p>
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
              <RoomPhotoCarousel key={selected.roomId} room={selected} />
              <h3 className="mt-4 text-center text-xl font-bold">
                {selected.name}
              </h3>

              <dl className="mt-4 text-sm">
                <dt className="text-xs font-bold">Description</dt>
                <dd className="mt-1 text-base">
                  {selected.description || "No description yet."}
                </dd>

                <div className="mt-5 grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-xs font-bold">Max Capacity:</dt>
                    <dd className="text-xs">{capacity(selected)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold">Prohibitions:</dt>
                    <dd className="text-xs">
                      {selected.prohibitions || "None listed"}
                    </dd>
                  </div>
                </div>
              </dl>

              <div className="mt-6 flex justify-center">
                <BookRoom
                  room={selected}
                  className={`${PILL} py-2.5 text-base`}
                  formClassName="w-full max-w-60"
                />
              </div>
            </aside>
          )}
        </div>
      )}
    </div>
  );
}
