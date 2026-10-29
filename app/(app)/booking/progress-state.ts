import "server-only";
import { readDraft } from "./draft";
import { getNatures, getRoom } from "./queries";
import { furthestStep } from "./rules";

export async function getMaxStep(): Promise<number> {
  const draft = await readDraft();
  if (!draft) return 1;
  if (draft.requestId) return 4;

  const [room, natures] = await Promise.all([
    getRoom(draft.roomId),
    getNatures(),
  ]);
  return furthestStep(draft, {
    maxCapacity: room?.maxCapacity ?? null,
    natures,
  });
}
