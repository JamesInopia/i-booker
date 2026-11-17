"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { FormPendingSignal } from "../../components/loading-provider";
import { startBooking } from "./actions";
import type { RoomListing } from "./rules";

const PILL =
  "w-full whitespace-nowrap rounded-full bg-accent-1 px-3 py-1.5 text-sm font-semibold text-white hover:brightness-110 disabled:cursor-not-allowed disabled:bg-accent-6 disabled:text-accent-3/50 disabled:hover:brightness-100";

const MORE_INFO =
  "w-full whitespace-nowrap rounded-full bg-accent-8 px-3 py-1.5 text-sm font-semibold text-white hover:brightness-110";

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

/** Reports the surrounding form's pending state, so the room modal can get out of the way. */
function PendingReport({ onChange }: { onChange: (pending: boolean) => void }) {
  const { pending } = useFormStatus();
  useEffect(() => {
    onChange(pending);
  }, [pending, onChange]);
  return null;
}

function BookRoom({
  room,
  className = PILL,
  formClassName,
  onPendingChange,
}: {
  room: RoomListing;
  className?: string;
  formClassName?: string;
  onPendingChange?: (pending: boolean) => void;
}) {
  return (
    <form action={startBooking} className={formClassName}>
      <FormPendingSignal />
      {onPendingChange && <PendingReport onChange={onPendingChange} />}
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

function RoomDetailsModal({
  room,
  onClose,
}: {
  room: RoomWithGallery;
  onClose: () => void;
}) {
  const [booking, setBooking] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="room-details-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      // Stays mounted while booking starts (so the form submit isn't cancelled) but is hidden:
      // the loading screen only covers the content area, so a visible backdrop would keep the
      // sidebar and header dimmed.
      className={`fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4 ${
        booking ? "invisible" : ""
      }`}
    >
      <div className="relative my-auto w-full max-w-3xl rounded-xl bg-container p-6 shadow-lg sm:p-8">
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close room details"
          className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full text-2xl leading-none text-accent-3 hover:bg-accent-5"
        >
          &times;
        </button>

        <h2
          id="room-details-title"
          className="text-center text-3xl font-bold sm:text-4xl"
        >
          Room Details
        </h2>

        <div className="mt-4 grid gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <div>
            <RoomPhotoCarousel key={room.roomId} room={room} />
            <dl className="mt-4 text-sm">
              <dt className="text-xs font-bold">Max Capacity:</dt>
              <dd className="text-sm">{capacity(room)}</dd>
              <dt className="mt-3 text-xs font-bold">Prohibitions:</dt>
              <dd className="text-sm">{room.prohibitions || "None listed"}</dd>
            </dl>
          </div>

          <div className="flex flex-col">
            <h3 className="text-lg font-bold">{room.name}</h3>
            <dl className="mt-3">
              <dt className="text-xs font-bold">Description</dt>
              <dd className="mt-1 text-sm">
                {room.description || "No description yet."}
              </dd>
            </dl>
            <div className="mt-auto pt-6">
              <BookRoom
                room={room}
                className={`${PILL} py-2.5 text-base`}
                onPendingChange={setBooking}
              />
            </div>
          </div>
        </div>
      </div>
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

  const selected = rooms.find((r) => r.roomId === selectedId) ?? null;
  const closeModal = useMemo(() => () => setSelectedId(null), []);

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
        <ul className="mt-5 grid grid-cols-2 gap-5 lg:grid-cols-3 2xl:grid-cols-4">
          {visible.map((room) => (
            <li
              key={room.roomId}
              className="flex flex-col rounded-xl bg-container p-3 shadow-sm"
            >
              <Photo room={room} className="aspect-[4/3] w-full rounded-md" />
              <h2 className="mt-2 text-base font-bold leading-tight">
                {room.name}
              </h2>
              <div className="mt-auto grid grid-cols-2 gap-2 pt-3">
                <button
                  type="button"
                  aria-haspopup="dialog"
                  onClick={() => setSelectedId(room.roomId)}
                  className={MORE_INFO}
                >
                  More Info
                </button>
                <BookRoom room={room} />
              </div>
            </li>
          ))}
        </ul>
      )}

      {selected && <RoomDetailsModal room={selected} onClose={closeModal} />}
    </div>
  );
}
