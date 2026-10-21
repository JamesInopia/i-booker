"use server";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { clearDraft, writeDraft } from "./draft";
import { requireStep, STEPS } from "./flow";
import { BookingError, createRequest, getBusySlots, getDayBlock, getRoom } from "./queries";
import {
  EMPTY_DRAFT,
  findOverlap,
  hasErrors,
  isId,
  overlapMessage,
  validateDate,
  validateDetails,
  validateTime,
  type Draft,
  type FormState,
} from "./rules";

const TOO_LONG: FormState = { error: "That is too much text to keep. Please shorten your entries." };
const text = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();

export async function startBooking(formData: FormData) {
  await requireUser();
  const roomId = text(formData, "roomId");
  if (!isId(roomId) || !(await getRoom(roomId))) redirect("/booking");

  if (!(await writeDraft({ ...EMPTY_DRAFT, roomId }))) redirect("/booking");
  redirect(STEPS[0].path);
}

export async function saveDate(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const { draft } = await requireStep(1);

  const date = text(formData, "date");
  const error = validateDate(date, new Date()) ?? (await getDayBlock(date));
  if (error) return { error };

  const changed = date !== draft.date;
  const next: Draft = changed ? { ...draft, date, startTime: "", endTime: "" } : { ...draft, date };
  if (!(await writeDraft(next))) return TOO_LONG;
  redirect(STEPS[1].path);
}

export async function saveTime(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const { draft, room } = await requireStep(2);

  const startTime = text(formData, "startTime");
  const endTime = text(formData, "endTime");
  const error = validateTime(draft.date, startTime, endTime, new Date());
  if (error) return { error };

  const clash = findOverlap(await getBusySlots(room.roomId, draft.date), startTime, endTime);
  if (clash) return { error: overlapMessage(clash) };

  if (!(await writeDraft({ ...draft, startTime, endTime }))) return TOO_LONG;
  redirect(STEPS[2].path);
}

export async function saveDetails(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const { draft, room, natures } = await requireStep(3);

  const nature = text(formData, "nature");
  const isOther = natures.find((n) => n.id === nature)?.other ?? false;
  const next: Draft = {
    ...draft,
    contactNo: text(formData, "contactNo"),
    nature,
    natureOther: isOther ? text(formData, "natureOther") : "",
    occupants: text(formData, "occupants"),
    program: text(formData, "program"),
    description: text(formData, "description"),
  };

  const errors = validateDetails(next, { maxCapacity: room.maxCapacity, natures });
  if (hasErrors(errors)) return { error: Object.values(errors)[0] ?? "Please check your details." };

  if (!(await writeDraft(next))) return TOO_LONG;
  redirect(STEPS[3].path);
}

export async function submitBooking(_prev: FormState): Promise<FormState> {
  const user = await requireUser();
  const { draft, room, natures } = await requireStep(4);
  const nature = natures.find((n) => n.id === draft.nature);
  if (!nature || (await getDayBlock(draft.date))) return { error: "This request is no longer valid. Please go back." };

  const email = user.email.toLowerCase();
  const requestor = user.name || email;

  try {
    await createRequest({ email, requestor, draft, nature, roomId: room.roomId });
  } catch (err) {
    if (err instanceof BookingError) return { error: err.message };
    console.error("submitBooking failed:", err);
    return { error: "We couldn't submit your request. Please try again." };
  }

  return { error: null, submitted: true };
}

export async function finishBooking() {
  await requireUser();
  await clearDraft();
  redirect("/booking-status?submitted=1");
}