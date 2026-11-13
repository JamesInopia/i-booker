export type DaySymbol = {
  id: number;
  name: string;
  color: string;
  /** Path under /public for approved-booking categories; null keeps the plain coloured dot. */
  icon: string | null;
};
export type DaySymbols = Record<string, DaySymbol[]>;

/** Legend groups for approved bookings. Each activity type name (normalised) maps to one icon. */
export const BOOKING_SYMBOLS = [
  {
    key: "academics",
    label: "Classes and Academic Events",
    icon: "/symbols/academics.png",
    activities: ["Academic Activities", "Special Class Arrangements"],
  },
  {
    key: "admin",
    label: "Admin and Marketing Events",
    icon: "/symbols/admin.png",
    activities: ["AdComms Events"],
  },
  {
    key: "extracurricular",
    label: "Student and Extracurricular Activities",
    icon: "/symbols/extracurricular.png",
    activities: ["Extracurricular Activities", "Independent Study Sessions"],
  },
  {
    key: "others",
    label: "Others",
    icon: "/symbols/others.png",
    activities: ["Others please specify"],
  },
] as const;

const normalise = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const ICON_BY_ACTIVITY = new Map<string, string>(
  BOOKING_SYMBOLS.flatMap((g) => g.activities.map((a) => [normalise(a), g.icon] as const)),
);

/** Icon for an approved booking's activity type name, or null when it has no booking symbol. */
export function iconForActivity(name: string | null | undefined): string | null {
  if (!name) return null;
  const key = normalise(name);
  // Tolerate "Others (please specify)", "Others - please specify", plain "Others", etc.
  return ICON_BY_ACTIVITY.get(key) ?? (key.startsWith("others") ? "/symbols/others.png" : null);
}
