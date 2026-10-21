import { requireStep } from "../flow";
import { getBusySlots } from "../queries";
import { formatDate } from "../rules";
import { StepFrame } from "../step-page";
import { TimeForm } from "./time-form";

export default async function SelectTimePage() {
  const { draft, room } = await requireStep(2);
  const booked = await getBusySlots(room.roomId, draft.date);

  return (
    <StepFrame step={2} subtitle={<>Room: {room.name} · Date: {formatDate(draft.date)}</>}>
      <TimeForm date={draft.date} initialStart={draft.startTime} initialEnd={draft.endTime} booked={booked} />
    </StepFrame>
  );
}