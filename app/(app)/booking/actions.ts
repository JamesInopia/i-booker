"use server";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { notifyBookingSubmitted } from "@/lib/notifications";
import { readDraft, clearDraft, writeDraft } from "./draft";
import { requireStep, STEPS } from "./flow";
import {
  BookingError,
  createRequest,
  getBusySlots,
  getDayBlock,
  getRoom,
  getNatures,
  getEditableRequest,
  updateRequest,
} from "./queries";
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
  type Slot,
} from "./rules";

const ALLOWED_TARGETS = new Set<string>([
  "/booking",
  ...STEPS.map((s) => s.path),
]);

const TOO_LONG: FormState = {
  error: "That is too much text to keep. Please shorten your entries.",
};
const text = (formData: FormData, key: string) =>
  String(formData.get(key) ?? "").trim();

export async function saveAndGo(targetPath: string, formData: FormData) {
  await requireUser();
  if (!ALLOWED_TARGETS.has(targetPath)) redirect("/booking");

  const draft = await readDraft();
  if (!draft) redirect("/booking");

  let next: Draft = draft;

  if (formData.has("date")) {
    const date = text(formData, "date");

    if (validateDate(date) === null && !(await getDayBlock(date))) {
      const startTime = formData.has("startTime")
        ? text(formData, "startTime")
        : draft.startTime;

      const endTime = formData.has("endTime")
        ? text(formData, "endTime")
        : draft.endTime;

      const room = await getRoom(draft.roomId);

      if (
        room &&
        validateTime(date, startTime, endTime) === null &&
        !findOverlap(await getBusySlots(room.roomId, date), startTime, endTime)
      ) {
        next = {
          ...draft,
          date,
          startTime,
          endTime,
        };
      } else if (date !== draft.date) {
        next = {
          ...draft,
          date,
          startTime: "",
          endTime: "",
        };
      }
    }
  } else if (formData.has("startTime") || formData.has("endTime")) {
    const startTime = text(formData, "startTime");
    const endTime = text(formData, "endTime");

    const room = await getRoom(draft.roomId);

    if (
      room &&
      validateTime(draft.date, startTime, endTime) === null &&
      !findOverlap(
        await getBusySlots(room.roomId, draft.date),
        startTime,
        endTime,
      )
    ) {
      next = {
        ...draft,
        startTime,
        endTime,
      };
    }
  } else if (formData.has("contactNo")) {
    const nature = text(formData, "nature");

    const isOther =
      (await getNatures()).find((n) => n.id === nature)?.other ?? false;

    next = {
      ...draft,
      contactNo: text(formData, "contactNo"),
      nature,
      natureOther: isOther ? text(formData, "natureOther") : "",
      occupants: text(formData, "occupants"),
      program: text(formData, "program"),
      description: text(formData, "description"),
    };
  }

  if (next !== draft) await writeDraft(next);
  redirect(targetPath);
}

export async function startBooking(formData: FormData) {
  await requireUser();
  const roomId = text(formData, "roomId");
  if (!isId(roomId) || !(await getRoom(roomId))) redirect("/booking");

  if (!(await writeDraft({ ...EMPTY_DRAFT, roomId }))) redirect("/booking");
  redirect(STEPS[0].path);
}

export async function startEdit(requestId: number) {
  const user = await requireUser();
  if (!Number.isInteger(requestId)) redirect("/booking-status");

  const req = await getEditableRequest(requestId, user.email.toLowerCase());
  if (!req) redirect("/booking-status");

  const ok = await writeDraft({
    requestId: String(requestId),
    roomId: String(req.roomId),
    date: req.date,
    startTime: req.startTime.slice(0, 5),
    endTime: req.endTime.slice(0, 5),
    contactNo: req.contactDetails,
    nature: String(req.activityTypeId),
    natureOther: req.natureOther ?? "",
    occupants: String(req.occupants),
    program: req.program ?? "",
    description: req.details ?? "",
  });
  if (!ok) redirect("/booking-status");

  redirect(STEPS[2].path);
}

export async function getDateAvailability(date: string): Promise<{
  booked: Slot[];
  error: string | null;
}> {
  await requireUser();

  const { room } = await requireStep(1);

  const error = validateDate(date) ?? (await getDayBlock(date));

  if (error) {
    return { booked: [], error };
  }

  const booked = await getBusySlots(room.roomId, date);

  return { booked, error: null };
}

export async function saveDateTime(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();

  const { draft, room } = await requireStep(1);

  const date = text(formData, "date");
  const startTime = text(formData, "startTime");
  const endTime = text(formData, "endTime");

  const error =
    validateDate(date) ??
    (await getDayBlock(date)) ??
    validateTime(date, startTime, endTime);

  if (error) {
    return { error };
  }

  const booked = await getBusySlots(room.roomId, date);

  const clash = findOverlap(booked, startTime, endTime);

  if (clash) {
    return { error: overlapMessage(clash) };
  }

  const next = {
    ...draft,
    date,
    startTime,
    endTime,
  };

  if (!(await writeDraft(next))) {
    return TOO_LONG;
  }

  redirect(draft.requestId ? STEPS[2].path : STEPS[1].path);
}

export async function saveDetails(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();
  const { draft, room, natures } = await requireStep(2);

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

  const errors = validateDetails(next, {
    maxCapacity: room.maxCapacity,
    natures,
  });
  if (hasErrors(errors))
    return { error: Object.values(errors)[0] ?? "Please check your details." };

  if (!(await writeDraft(next))) return TOO_LONG;
  redirect(STEPS[2].path);
}

export async function submitBooking(_prev: FormState): Promise<FormState> {
  const user = await requireUser();
  const { draft, room, natures } = await requireStep(3);
  const nature = natures.find((n) => n.id === draft.nature);
  if (!nature || (await getDayBlock(draft.date)))
    return { error: "This request is no longer valid. Please go back." };

  const email = user.email.toLowerCase();
  const requestor = user.name || email;

  let createdId: number | null = null;

  try {
    if (draft.requestId) {
      await updateRequest({
        requestId: Number(draft.requestId),
        email,
        draft,
        nature,
        roomId: room.roomId,
      });
    } else {
      createdId = await createRequest({
        email,
        requestor,
        draft,
        nature,
        roomId: room.roomId,
      });
    }
  } catch (err) {
    if (err instanceof BookingError) return { error: err.message };
    console.error("submitBooking failed:", err);
    return { error: "We couldn't submit your request. Please try again." };
  }

  // Liaisons are told about new bookings so they can review them. The requestor
  // is deliberately not notified of their own submission.
  if (createdId !== null) await notifyBookingSubmitted(createdId, user);

  return { error: null, submitted: true };
}

export async function finishBooking() {
  await requireUser();
  await clearDraft();
  redirect("/booking-status?submitted=1");
}
