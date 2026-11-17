import { TIME_BLOCKS, formatTime } from "../booking/rules";

/**
 * How open a day is for the room being booked:
 *  - "available": at least one block before 6:00 PM is still free (green)
 *  - "evening":   the only free block is the 6:00 PM – 9:30 PM one (indigo, never green)
 *  - absent:      nothing is free (fully booked / already passed)
 */
export type DayAvailability = "available" | "evening";
export type DayAvailabilities = Record<string, DayAvailability>;

type Busy = { start: string; end: string };

const EVENING_BLOCK = TIME_BLOCKS[TIME_BLOCKS.length - 1];

export const EVENING_LABEL = `${formatTime(EVENING_BLOCK.start)} – ${formatTime(EVENING_BLOCK.end)}`;

export const AVAILABILITY_LABEL: Record<DayAvailability, string> = {
  available: "Available schedule",
  evening: `Only ${EVENING_LABEL} available`,
};

export const AVAILABILITY_DOT: Record<DayAvailability, string> = {
  available: "bg-green-500",
  evening: "bg-indigo-500",
};

/** Classifies a day from the busy periods that hit the room (classes + approved bookings). */
export function classifyDay(
  busy: readonly Busy[],
  now?: { date: string; time: string },
  date?: string,
): DayAvailability | null {
  const free = TIME_BLOCKS.filter((b) => {
    if (now && date === now.date && b.start <= now.time) return false; // already started
    return !busy.some((s) => b.start < s.end && b.end > s.start);
  });
  if (free.length === 0) return null;
  return free.every((b) => b.start === EVENING_BLOCK.start) ? "evening" : "available";
}
