import { blocksBooking, type DayMarks } from "../../calendar/day-marks";

import { getDayMarks } from "../../calendar/day-marks-queries";

import { requireStep } from "../flow";
import { getBusySlots } from "../queries";

import { addDays, manilaNow, MAX_ADVANCE_DAYS } from "../rules";

import { StepFrame } from "../step-page";
import { DateForm } from "./date-form";

export default async function SelectDatePage() {
  const { draft, room } = await requireStep(1);

  const today = manilaNow().date;
  const max = addDays(today, MAX_ADVANCE_DAYS);

  const marks = await getDayMarks(today, max);

  const closed: DayMarks = Object.fromEntries(
    Object.entries(marks).filter(([, mark]) => blocksBooking(mark.kind)),
  );

  const initialDate =
    draft.date >= today && draft.date <= max && !closed[draft.date]
      ? draft.date
      : "";

  const initialBooked = initialDate
    ? await getBusySlots(room.roomId, initialDate)
    : [];

  return (
    <StepFrame step={1} subtitle={<>Room: {room.name}</>}>
      <DateForm
        initialDate={initialDate}
        initialStart={initialDate ? draft.startTime : ""}
        initialEnd={initialDate ? draft.endTime : ""}
        initialBooked={initialBooked}
        min={today}
        max={max}
        closed={closed}
      />
    </StepFrame>
  );
}
