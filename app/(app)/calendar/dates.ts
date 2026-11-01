export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
export const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_RE = /^(\d{4})-(\d{2})$/;

const toDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};

export const toISO = (d: Date) => d.toISOString().slice(0, 10);

export const addDays = (iso: string, n: number) => {
  const d = toDate(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return toISO(d);
};

export const todayISO = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());

export function parseDate(value: string | undefined): string | null {
  if (!value || !DATE_RE.test(value)) return null;
  return toISO(toDate(value)) === value ? value : null;
}

export function parseMonth(value: string | undefined): string | null {
  const m = value ? MONTH_RE.exec(value) : null;
  if (!m || Number(m[2]) < 1 || Number(m[2]) > 12) return null;
  return `${m[1]}-${m[2]}-01`;
}

export const monthKey = (iso: string) => iso.slice(0, 7);

export const startOfWeek = (iso: string) => addDays(iso, -toDate(iso).getUTCDay());

export function addMonths(firstOfMonth: string, n: number) {
  const d = toDate(firstOfMonth);
  d.setUTCMonth(d.getUTCMonth() + n, 1);
  return toISO(d);
}

export const monthLabel = (iso: string) =>
  new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(toDate(iso));

const fmt = (iso: string, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-US", { ...opts, timeZone: "UTC" }).format(toDate(iso));

export const dayOfMonth = (iso: string) => Number(iso.slice(8, 10));
export const shortMonthDay = (iso: string) => fmt(iso, { month: "short", day: "numeric" }).toUpperCase();

export function monthGrid(firstOfMonth: string): string[] {
  const start = startOfWeek(firstOfMonth);
  const last = addDays(addMonths(firstOfMonth, 1), -1);
  const end = addDays(startOfWeek(last), 6);
  const days: string[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) days.push(d);
  return days;
}

export const weekDays = (sunday: string) => Array.from({ length: 7 }, (_, i) => addDays(sunday, i));

export function weekRangeLabel(sunday: string) {
  const sat = addDays(sunday, 6);
  const year = fmt(sat, { year: "numeric" });
  if (monthKey(sunday) === monthKey(sat)) {
    return `${fmt(sunday, { month: "long" })} ${dayOfMonth(sunday)} – ${dayOfMonth(sat)}, ${year}`;
  }
  return `${fmt(sunday, { month: "short", day: "numeric" })} – ${fmt(sat, { month: "short", day: "numeric" })}, ${year}`;
}

export function weekOfMonth(sunday: string) {
  const first = `${monthKey(sunday)}-01`;
  return Math.floor((dayOfMonth(sunday) - 1 + toDate(first).getUTCDay()) / 7) + 1;
}

export const longDateLabel = (iso: string) => fmt(iso, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
