import { weekdayOf } from "../../calendar/dates";
import { blocksBooking, type DayMarks } from "../../calendar/day-marks";

import { getDayMarks } from "../../calendar/day-marks-queries";
import { getDaySymbols } from "../../calendar/day-symbols-queries";
import { getDayAvailability } from "../../calendar/day-availability-queries";

import { requireStep } from "../flow";
import { getBusySlots } from "../queries";

import { addDays, manilaNow, MAX_ADVANCE_DAYS } from "../rules";

import { StepFrame } from "../step-page";
import { DateForm } from "./date-form";

export default async function SelectDatePage() {
  const { draft, room } = await requireStep(1);

  const today = manilaNow().date;
  const max = addDays(today, MAX_ADVANCE_DAYS);

  const [marks, daySymbols, allAvailability] = await Promise.all([
    getDayMarks(today, max),
    getDaySymbols(today, max),
    getDayAvailability(today, max, room.roomId),
  ]);

  const closed: DayMarks = Object.fromEntries(
    Object.entries(marks).filter(([, mark]) => blocksBooking(mark.kind)),
  );

  // No indicator on closed days (holidays, no-booking days) or on Sundays unless an admin marked them.
  const availability = Object.fromEntries(
    Object.entries(allAvailability).filter(
      ([day]) => !closed[day] && (weekdayOf(day) !== 0 || marks[day]),
    ),
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
        initialBlocks={initialDate ? draft.blocks : []}
        initialBooked={initialBooked}
        min={today}
        max={max}
        closed={closed}
        daySymbols={daySymbols}
        dayAvailability={availability}
      />
    </StepFrame>
  );
}
