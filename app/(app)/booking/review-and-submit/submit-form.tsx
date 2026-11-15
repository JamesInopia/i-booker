"use client";

import { submitBooking } from "../actions";
import { useBookingProgress } from "../progress";
import { StepForm } from "../step-form";
import { useState } from "react";
import { UnsavedChangesGuard } from "@/app/components/unsaved-changes-guard";

export function SubmitForm({ editing }: { editing: boolean }) {
  const { complete } = useBookingProgress();
  const [submitted, setSubmitted] = useState(false);

  return (
    <StepForm
      action={submitBooking}
      backHref="/booking/booking-details"
      canConfirm
      onSubmitted={() => complete(editing)}
    >
      <UnsavedChangesGuard
        dirty={!submitted}
        message={
          editing
            ? "Your changes to this request hasn't been submitted yet. If you leave now, they won't be saved."
            : "Your request hasn't been submitted yet. If you leave now, it won't be sent for review."
        }
      />
    </StepForm>
  );
}
