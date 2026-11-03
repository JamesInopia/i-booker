import { blocksBooking, type DayMarks } from "../../calendar/day-marks";
import { getDayMarks } from "../../calendar/day-marks-queries";
import { requireStep } from "../flow";
import { addDays, manilaNow, MAX_ADVANCE_DAYS } from "../rules";
import { StepFrame } from "../step-page";
import { DateForm } from "./date-form";

export default async function SelectDatePage() {
  const { draft, room } = await requireStep(1);
  const today = manilaNow().date;
  const max = addDays(today, MAX_ADVANCE_DAYS);

  const marks = await getDayMarks(today, max);
  const closed: DayMarks = Object.fromEntries(Object.entries(marks).filter(([, m]) => blocksBooking(m.kind)));

  return (
    <StepFrame step={1} subtitle={<>Room: {room.name}</>}>
      <DateForm initialDate={draft.date} min={today} max={max} closed={closed} />
    </StepFrame>
  );
}
