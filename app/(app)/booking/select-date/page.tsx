import { requireStep } from "../flow";
import { addDays, manilaNow, MAX_ADVANCE_DAYS } from "../rules";
import { StepFrame } from "../step-page";
import { DateForm } from "./date-form";

export default async function SelectDatePage() {
  const { draft, room } = await requireStep(1);
  const today = manilaNow().date;

  return (
    <StepFrame step={1} subtitle={<>Room: {room.name}</>}>
      <DateForm initialDate={draft.date} min={today} max={addDays(today, MAX_ADVANCE_DAYS)} />
    </StepFrame>
  );
}
