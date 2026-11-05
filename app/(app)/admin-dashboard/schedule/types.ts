import { CLOSE_TIME, OPEN_TIME, SLOT_MINUTES, toMinutes } from "../../booking/rules";

export type TermRow = { id: number; name: string; startDate: string; endDate: string };

export type ClassRow = {
  id: number;
  termId: number;
  roomId: string;
  dayOfWeek: number;
  start: string;
  end: string;
  title: string;
  adviser: string;
};

export type WeekClass = {
  id: number;
  roomId: string;
  date: string;
  start: string;
  end: string;
  title: string;
  adviser: string;
};

export type DraftClass = Omit<ClassRow, "termId">;

export type ClassPayload = {
  id?: number;
  roomId: string;
  dayOfWeek: number;
  start: string;
  end: string;
  title: string;
  adviser: string;
};

export type TermChanges = {
  termId: number;
  name: string;
  startDate: string;
  endDate: string;
  deletedIds: number[];
  classes: ClassPayload[];
};

export type ClassFormFields = {
  roomId: string;
  days: number[];
  start: string;
  end: string;
  title: string;
  adviser: string;
};

type Slot = { id: number; roomId: string; dayOfWeek: number; start: string; end: string };

// The day is split into four class blocks. A class that uses any part of a
// block takes the whole block: the rest of it can't be used by another class.
export const CLASS_BLOCKS = ["07:30", "11:00", "14:30", "18:00", "21:30"] as const;

export function expandToBlocks(start: string, end: string): { start: string; end: string } {
  let from: string = CLASS_BLOCKS[0];
  for (const b of CLASS_BLOCKS.slice(0, -1)) if (b <= start) from = b;
  const to = CLASS_BLOCKS.find((b) => b >= end) ?? CLASS_BLOCKS[CLASS_BLOCKS.length - 1];
  return { start: from, end: to };
}

export function findClash<T extends Slot>(others: T[], c: Slot): T | undefined {
  return others.find((o) => {
    if (o.id === c.id || o.roomId !== c.roomId || o.dayOfWeek !== c.dayOfWeek) return false;
    const taken = expandToBlocks(o.start, o.end);
    return taken.start < c.end && taken.end > c.start;
  });
}

export type ScheduleResult = { ok: true; id?: number } | { ok: false; error: string };

export const MAX_TERM_NAME = 60;
export const MAX_COURSE_TITLE = 60;
export const MAX_ADVISER = 80;

export const WEEK_COLUMNS = [
  { iso: 7, label: "Sunday" },
  { iso: 1, label: "Monday" },
  { iso: 2, label: "Tuesday" },
  { iso: 3, label: "Wednesday" },
  { iso: 4, label: "Thursday" },
  { iso: 5, label: "Friday" },
  { iso: 6, label: "Saturday" },
] as const;

export const toHHMM = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

export const TIME_ROWS: { start: string; end: string; label: string }[] = (() => {
  const rows = [];
  for (let t = toMinutes(OPEN_TIME); t < toMinutes(CLOSE_TIME); t += SLOT_MINUTES) {
    const start = toHHMM(t);
    const end = toHHMM(t + SLOT_MINUTES);
    rows.push({ start, end, label: `${start} – ${end}` });
  }
  return rows;
})();

export const START_OPTIONS = TIME_ROWS.map((r) => r.start);
export const END_OPTIONS = TIME_ROWS.map((r) => r.end);

export const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isRealDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const probe = new Date(Date.UTC(y, m - 1, d));
  return probe.getUTCFullYear() === y && probe.getUTCMonth() === m - 1 && probe.getUTCDate() === d;
}

export function validateTermFields(name: string, startDate: string, endDate: string): string | null {
  if (!name.trim()) return "Enter a term name.";
  if (name.trim().length > MAX_TERM_NAME) return `Keep the term name under ${MAX_TERM_NAME} characters.`;
  if (!isRealDate(startDate)) return "Enter a valid start date.";
  if (!isRealDate(endDate)) return "Enter a valid end date.";
  if (endDate < startDate) return "The end date can't be before the start date.";
  return null;
}

export function validateClassFields(c: ClassFormFields): string | null {
  if (!c.roomId) return "Choose a room.";
  if (c.days.length === 0) return "Choose at least one day.";
  if (c.days.some((d) => !Number.isInteger(d) || d < 1 || d > 7)) return "Choose a valid day.";
  if (!TIME_RE.test(c.start) || !TIME_RE.test(c.end)) return "Select a start time and an end time.";
  if (toMinutes(c.start) % SLOT_MINUTES !== 0 || toMinutes(c.end) % SLOT_MINUTES !== 0) {
    return `Times must be in ${SLOT_MINUTES}-minute steps.`;
  }
  if (c.start < OPEN_TIME || c.end > CLOSE_TIME) return `Classes must be between ${OPEN_TIME} and ${CLOSE_TIME}.`;
  if (c.end <= c.start) return "The end time must be after the start time.";
  if (!c.title.trim()) return "Enter the course title.";
  if (c.title.trim().length > MAX_COURSE_TITLE) return `Keep the course title under ${MAX_COURSE_TITLE} characters.`;
  if (!c.adviser.trim()) return "Enter the course adviser.";
  if (c.adviser.trim().length > MAX_ADVISER) return `Keep the adviser name under ${MAX_ADVISER} characters.`;
  return null;
}

export function formatLongDate(value: string): string {
  if (!isRealDate(value)) return value;
  const [y, m, d] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" }).format(
    new Date(Date.UTC(y, m - 1, d)),
  );
}
