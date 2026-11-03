import { weekdayOf } from "./dates";

export type MarkKind = "holiday" | "class_cancelled" | "no_classes" | "no_booking" | "other";

export type DayMark = {
  kind: MarkKind;
  label: string;
  note: string | null;
  implicit?: boolean;
};

export type DayMarks = Record<string, DayMark>;

export const CLASS_CANCELLED_NAME = "Class Cancelled";

export function kindFromRow(description: string, isClassDay: boolean, allowBooking: boolean): MarkKind {
  if (!allowBooking) return isClassDay ? "no_booking" : "holiday";
  if (isClassDay) return "other";
  return description.trim().toLowerCase() === CLASS_CANCELLED_NAME.toLowerCase() ? "class_cancelled" : "no_classes";
}

/** Marks on which scheduled classes do not run (an implicit Sunday mark is just a default, so it doesn't count). */
export const cancelsClasses = (mark: DayMark | null) =>
  !!mark && !mark.implicit && (mark.kind === "holiday" || mark.kind === "class_cancelled" || mark.kind === "no_classes");

export const blocksBooking =(kind: MarkKind) => kind === "holiday" || kind === "no_booking";

export const MARK_OPTIONS = [
  { kind: "holiday", label: "Holiday", hint: "No classes and no bookings", noteLabel: "Holiday name", notePlaceholder: "e.g. Independence Day" },
  { kind: "class_cancelled", label: "Class Cancelled", hint: "Classes are cancelled; bookings are still allowed", noteLabel: "Reason for cancellation", notePlaceholder: "e.g. Typhoon" },
  { kind: "no_classes", label: "No Classes", hint: "Rooms can still be booked" },
  { kind: "no_booking", label: "No Booking", hint: "Classes are held, but requestors can't book" },
] as const;

export type MarkChoice = (typeof MARK_OPTIONS)[number]["kind"];

export const needsNote = (kind: string) => kind === "holiday" || kind === "class_cancelled";

export const showsLabelOnCalendar = (kind: MarkKind) => kind !== "no_classes" && kind !== "no_booking";

export const MARK_LABEL: Record<MarkKind, string> = {
  holiday: "Holiday",
  class_cancelled: "Class Cancelled",
  no_classes: "No Classes",
  no_booking: "No Booking",
  other: "Marked",
};


export const MARK_STYLE: Record<MarkKind, { cell: string; fill: string; tint: string; dot: string }> = {
  holiday: { cell: "border-red-300 bg-red-100 text-red-900", fill: "bg-red-100", tint: "bg-red-50", dot: "bg-red-400" },
  class_cancelled: { cell: "border-amber-300 bg-amber-100 text-amber-900", fill: "bg-amber-100", tint: "bg-amber-50", dot: "bg-amber-400" },
  no_classes: { cell: "border-neutral-300 bg-neutral-200 text-neutral-500", fill: "bg-neutral-200", tint: "bg-neutral-100", dot: "bg-neutral-400" },
  no_booking: { cell: "border-violet-300 bg-violet-100 text-violet-900", fill: "bg-violet-100", tint: "bg-violet-50", dot: "bg-violet-400" },
  other: { cell: "border-teal-300 bg-teal-50 text-teal-900", fill: "bg-teal-50", tint: "bg-teal-50/50", dot: "bg-teal-400" },
};

export function markFor(date: string, marks: DayMarks): DayMark | null {
  return marks[date] ?? (weekdayOf(date) === 0 ? { kind: "no_classes", label: MARK_LABEL.no_classes, note: null, implicit: true } : null);
}
