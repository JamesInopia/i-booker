import "server-only";
import { redirect } from "next/navigation";
import { readDraft } from "./draft";
import { getBusySlots, getDayBlock, getNatures, getRoom, type Room } from "./queries";
import { findOverlap, furthestStep, type Draft, type Nature } from "./rules";
import { STEPS } from "./steps";

export { STEPS };

export async function requireStep(step: 1 | 2 | 3 | 4): Promise<{ draft: Draft; room: Room; natures: Nature[] }> {
  const draft = await readDraft();
  if (!draft) redirect("/booking");
  const room = await getRoom(draft.roomId);
  if (!room) redirect("/booking");
  const natures = await getNatures();

  let allowed: number = furthestStep(draft, { maxCapacity: room.maxCapacity, natures });

  if (allowed >= 2 && (await getDayBlock(draft.date))) allowed = 1;

  if (allowed >= 3) {
    const busy = await getBusySlots(room.roomId, draft.date);
    if (findOverlap(busy, draft.startTime, draft.endTime)) allowed = 2;
  }

  if (step > allowed) redirect(STEPS[allowed - 1].path);
  return { draft, room, natures };
}