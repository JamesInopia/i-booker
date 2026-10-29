"use client";

import { submitBooking } from "../actions";
import { useBookingProgress } from "../progress";
import { StepForm } from "../step-form";

export function SubmitForm({ editing }: { editing: boolean }) {
  const { complete } = useBookingProgress();
  return (
    <StepForm
      action={submitBooking}
      backHref="/booking/booking-details"
      canConfirm
      onSubmitted={() => complete(editing)}
    />
  );
}
