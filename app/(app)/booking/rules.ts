export const TIME_ZONE = "Asia/Manila";
export const OPEN_TIME = "07:30";
export const CLOSE_TIME = "21:30";
export const SLOT_MINUTES = 30;
export const MAX_ADVANCE_DAYS = 365;
export const MAX_DESCRIPTION = 40;
export const MAX_NATURE_OTHER = 25;
export const PROGRAMS = [
  "BSCS-SE",
  "AB-ANI",
  "AB-MAD",
  "BSEMC-GD",
  "BS-REM",
  "FACULTY/STAFF",
];
export const STEP_FORM_ID = "booking-step-form";

export type Draft = {
  requestId: string;
  roomId: string;
  date: string;
  // Start times of the chosen TIME_BLOCKS, in order. Blocks need not touch.
  blocks: string[];
  contactNo: string;
  nature: string;
  natureOther: string;
  occupants: string;
  program: string;
  description: string;
};

export const EMPTY_DRAFT: Draft = {
  requestId: "",
  roomId: "",
  date: "",
  blocks: [],
  contactNo: "",
  nature: "",
  natureOther: "",
  occupants: "",
  program: "",
  description: "",
};

export type FormState = { error: string | null; submitted?: boolean };
export const EMPTY_FORM_STATE: FormState = { error: null };

export type Nature = { id: string; name: string; other: boolean };
export const isOtherName = (name: string) =>
  /^(others?|miscellaneous)\b/i.test(name.trim());

// What is occupying a period: a class or an approved booking.
export type Slot = {
  start: string;
  end: string;
  kind?: "class" | "booking";
  label?: string;
};

// Bookings are made in these four fixed blocks. Any combination can be picked.
export const TIME_BLOCKS = [
  { start: "07:30", end: "11:00" },
  { start: "11:00", end: "14:30" },
  { start: "14:30", end: "18:00" },
  { start: "18:00", end: "21:30" },
] as const;

const BLOCK_STARTS: string[] = TIME_BLOCKS.map((b) => b.start);

// Keeps only real block start times, without duplicates, in time order.
export function sortBlocks(blocks: readonly string[]): string[] {
  return BLOCK_STARTS.filter((s) => blocks.includes(s));
}

export const parseBlocks = (value: string) => sortBlocks(value.split(","));

export type Range = { start: string; end: string };

// Blocks that sit back to back are merged, so 7:30 + 11:00 becomes one
// 7:30 - 14:30 range while 7:30 + 14:30 stays two separate ranges.
export function blocksToRanges(blocks: readonly string[]): Range[] {
  const ranges: Range[] = [];
  for (const b of TIME_BLOCKS) {
    if (!blocks.includes(b.start)) continue;
    const last = ranges[ranges.length - 1];
    if (last && last.end === b.start) last.end = b.end;
    else ranges.push({ start: b.start, end: b.end });
  }
  return ranges;
}

// Every block that a saved range touches (used when editing a request).
export function rangesToBlocks(ranges: readonly Range[]): string[] {
  return TIME_BLOCKS.filter((b) =>
    ranges.some((r) => r.start < b.end && r.end > b.start),
  ).map((b) => b.start);
}

export type RoomListing = {
  roomId: string;
  name: string;
  description: string | null;
  maxCapacity: number | null;
  prohibitions: string | null;
  thumbnail: string | null;
  status: string;
  available: boolean;
};

export type DetailsErrors = Partial<
  Record<
    | "contactNo"
    | "nature"
    | "natureOther"
    | "occupants"
    | "program"
    | "description",
    string
  >
>;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const ID_RE = /^[1-9]\d{0,8}$/;

export const isId = (value: string) => ID_RE.test(value);

export function manilaNow(now: Date = new Date()): {
  date: string;
  time: string;
} {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}`,
  };
}

function isRealDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const probe = new Date(Date.UTC(y, m - 1, d));
  return (
    probe.getUTCFullYear() === y &&
    probe.getUTCMonth() === m - 1 &&
    probe.getUTCDate() === d
  );
}

export function addDays(value: string, days: number): string {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export const toMinutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

export function formatTime(time: string): string {
  if (!TIME_RE.test(time)) return time;
  const [h, m] = time.split(":").map(Number);
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

export function formatDate(value: string): string {
  if (!isRealDate(value)) return value;
  const [y, m, d] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

function formatMinutes(total: number): string {
  if (!Number.isFinite(total) || total <= 0) return "";
  const h = Math.floor(total / 60);
  const m = total % 60;
  return [h ? `${h} hr` : "", m ? `${m} min` : ""].filter(Boolean).join(" ");
}

export function formatDuration(start: string, end: string): string {
  return formatMinutes(toMinutes(end) - toMinutes(start));
}

export function formatBlocksDuration(blocks: readonly string[]): string {
  return formatMinutes(
    blocksToRanges(blocks).reduce(
      (sum, r) => sum + toMinutes(r.end) - toMinutes(r.start),
      0,
    ),
  );
}

export function formatRange(r: Range): string {
  return `${formatTime(r.start)} – ${formatTime(r.end)}`;
}

export function formatBlocks(blocks: readonly string[]): string {
  return blocksToRanges(blocks).map(formatRange).join(", ");
}

export function timeOptions(): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = [];
  for (
    let t = toMinutes(OPEN_TIME);
    t <= toMinutes(CLOSE_TIME);
    t += SLOT_MINUTES
  ) {
    const value = `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
    out.push({ value, label: formatTime(value) });
  }
  return out;
}

export function validateDate(
  date: string,
  now: Date = new Date(),
): string | null {
  if (!date) return "Select a date.";
  if (!isRealDate(date)) return "Enter a valid date.";
  const today = manilaNow(now).date;
  if (date < today) return "You can't book a date that has already passed.";
  if (date > addDays(today, MAX_ADVANCE_DAYS))
    return `You can only book up to ${MAX_ADVANCE_DAYS} days ahead.`;
  return null;
}

export function findOverlap(
  slots: Slot[],
  start: string,
  end: string,
): Slot | null {
  return slots.find((s) => start < s.end && end > s.start) ?? null;
}

export function findBlocksOverlap(
  slots: Slot[],
  blocks: readonly string[],
): Slot | null {
  for (const r of blocksToRanges(blocks)) {
    const clash = findOverlap(slots, r.start, r.end);
    if (clash) return clash;
  }
  return null;
}

export function overlapMessage(slot: Slot): string {
  const by = slot.label ? ` by ${slot.label}` : " (a class or an approved booking)";
  return `${formatTime(slot.start)} – ${formatTime(slot.end)} is already taken${by}. Choose a different time.`;
}

export function validateBlocks(
  date: string,
  blocks: readonly string[],
  now: Date = new Date(),
): string | null {
  if (blocks.length === 0) return "Select at least one time block.";
  if (
    new Set(blocks).size !== blocks.length ||
    blocks.some((b) => !BLOCK_STARTS.includes(b))
  ) {
    return "Choose one or more of the available time blocks.";
  }
  const current = manilaNow(now);
  if (date === current.date && blocks.some((b) => b <= current.time))
    return "A selected start time has already passed.";
  return null;
}

export type DetailsContext = { maxCapacity: number | null; natures: Nature[] };

export function validateDetails(
  d: Draft,
  { maxCapacity, natures }: DetailsContext,
): DetailsErrors {
  const errors: DetailsErrors = {};

  const digits = d.contactNo.replace(/\D/g, "");
  if (!d.contactNo.trim()) errors.contactNo = "Enter a contact number.";
  else if (
    !/^[0-9+\-()\s]+$/.test(d.contactNo) ||
    digits.length < 7 ||
    digits.length > 15
  ) {
    errors.contactNo = "Enter a valid contact number.";
  }

  const nature = natures.find((n) => n.id === d.nature);
  if (!d.nature) errors.nature = "Choose the nature of the activity.";
  else if (!nature) errors.nature = "Choose a valid nature of activity.";
  else if (nature.other && !d.natureOther.trim())
    errors.natureOther = "Please specify the activity.";
  if (d.natureOther.trim().length > MAX_NATURE_OTHER)
    errors.natureOther = `Keep this to ${MAX_NATURE_OTHER} characters or fewer.`;

  const occupants = Number(d.occupants);
  if (!d.occupants.trim()) errors.occupants = "Enter the number of occupants.";
  else if (!/^\d+$/.test(d.occupants.trim()) || occupants < 1)
    errors.occupants = "Enter a whole number, 1 or more.";
  else if (maxCapacity !== null && occupants > maxCapacity)
    errors.occupants = `This room holds at most ${maxCapacity} people.`;

  if (!d.program) errors.program = "Choose your program.";
  else if (!PROGRAMS.includes(d.program))
    errors.program = "Choose a valid program.";

  if (!d.description.trim()) errors.description = "Describe your request.";
  else if (d.description.trim().length > MAX_DESCRIPTION) {
    errors.description = `Keep the description to ${MAX_DESCRIPTION} characters or fewer.`;
  }

  return errors;
}

export const hasErrors = (errors: object) => Object.keys(errors).length > 0;

export function furthestStep(
  draft: Draft,
  context: {
    maxCapacity: number | null;
    natures: Nature[];
  },
): number {
  if (validateDate(draft.date)) {
    return 1;
  }

  if (validateBlocks(draft.date, draft.blocks)) {
    return 1;
  }

  if (hasErrors(validateDetails(draft, context))) {
    return 2;
  }

  return 3;
}

const clip = (value: unknown, max: number) =>
  typeof value === "string" ? value.slice(0, max) : "";

export function parseDraft(raw: string | undefined): Draft | null {
  if (!raw) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof data !== "object" || data === null) return null;
  const r = data as Record<string, unknown>;

  const roomId = clip(r.roomId, 9);
  if (!isId(roomId)) return null;

  return {
    requestId: /^\d{1,9}$/.test(clip(r.requestId, 9))
      ? clip(r.requestId, 9)
      : "",
    roomId,
    date: clip(r.date, 10),
    blocks: sortBlocks(
      Array.isArray(r.blocks)
        ? r.blocks.filter((b): b is string => typeof b === "string")
        : [],
    ),
    contactNo: clip(r.contactNo, 30),
    nature: /^\d{1,9}$/.test(clip(r.nature, 9)) ? clip(r.nature, 9) : "",
    natureOther: clip(r.natureOther, MAX_NATURE_OTHER),
    occupants: clip(r.occupants, 4),
    program: clip(r.program, 100),
    description: clip(r.description, MAX_DESCRIPTION),
  };
}
