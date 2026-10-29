export const TIME_ZONE = "Asia/Manila";
export const OPEN_TIME = "07:30";
export const CLOSE_TIME = "22:00";
export const SLOT_MINUTES = 30;
export const MAX_ADVANCE_DAYS = 365;
export const MAX_DESCRIPTION = 500;
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
  startTime: string;
  endTime: string;
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
  startTime: "",
  endTime: "",
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

export type Slot = { start: string; end: string };

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

export function formatDuration(start: string, end: string): string {
  const total = toMinutes(end) - toMinutes(start);
  if (!Number.isFinite(total) || total <= 0) return "";
  const h = Math.floor(total / 60);
  const m = total % 60;
  return [h ? `${h} hr` : "", m ? `${m} min` : ""].filter(Boolean).join(" ");
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

export function overlapMessage(slot: Slot): string {
  return `${formatTime(slot.start)} – ${formatTime(slot.end)} is already taken (a class or an approved booking). Choose a different time.`;
}

export function validateTime(
  date: string,
  start: string,
  end: string,
  now: Date = new Date(),
): string | null {
  if (!start || !end) return "Select a start time and an end time.";
  if (!TIME_RE.test(start) || !TIME_RE.test(end)) return "Enter a valid time.";
  if (
    toMinutes(start) % SLOT_MINUTES !== 0 ||
    toMinutes(end) % SLOT_MINUTES !== 0
  ) {
    return `Times must be in ${SLOT_MINUTES}-minute steps.`;
  }
  if (start < OPEN_TIME || end > CLOSE_TIME) {
    return `Bookings must be between ${formatTime(OPEN_TIME)} and ${formatTime(CLOSE_TIME)}.`;
  }
  if (end <= start) return "The end time must be after the start time.";
  const current = manilaNow(now);
  if (date === current.date && start <= current.time)
    return "The start time has already passed.";
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
  if (d.natureOther.trim().length > 100)
    errors.natureOther = "Keep this under 100 characters.";

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
    errors.description = `Keep the description under ${MAX_DESCRIPTION} characters.`;
  }

  return errors;
}

export const hasErrors = (errors: object) => Object.keys(errors).length > 0;

export function furthestStep(
  d: Draft,
  details: DetailsContext,
  now: Date = new Date(),
): 1 | 2 | 3 | 4 {
  if (validateDate(d.date, now)) return 1;
  if (validateTime(d.date, d.startTime, d.endTime, now)) return 2;
  if (hasErrors(validateDetails(d, details))) return 3;
  return 4;
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
    startTime: clip(r.startTime, 5),
    endTime: clip(r.endTime, 5),
    contactNo: clip(r.contactNo, 30),
    nature: /^\d{1,9}$/.test(clip(r.nature, 9)) ? clip(r.nature, 9) : "",
    natureOther: clip(r.natureOther, 100),
    occupants: clip(r.occupants, 4),
    program: clip(r.program, 100),
    description: clip(r.description, MAX_DESCRIPTION),
  };
}
