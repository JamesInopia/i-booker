import { requireUser } from "@/lib/auth";
import { requireStep } from "../flow";
import { formatDate } from "../rules";
import { StepFrame } from "../step-page";
import { DetailsForm } from "./details-form";

export default async function BookingDetailsPage() {
  const user = await requireUser();
  const { draft, room, natures } = await requireStep(3);

  return (
    <StepFrame step={3} subtitle={<>Room: {room.name} · Date: {formatDate(draft.date)}</>}>
      <DetailsForm
        requestorName={user.name || user.email}
        maxCapacity={room.maxCapacity}
        natures={natures}
        initial={{
          contactNo: draft.contactNo,
          nature: draft.nature,
          natureOther: draft.natureOther,
          occupants: draft.occupants,
          program: draft.program,
          description: draft.description,
        }}
      />
    </StepFrame>
  );
}