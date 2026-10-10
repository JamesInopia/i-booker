"use server";
import { redirect } from "next/navigation";
import { clearCurrentStep, getCurrentStep, setCurrentStep, STEPS } from "./flow";

export async function startBooking() {
  await setCurrentStep(1);
  redirect(STEPS[0].path);
}

export async function nextStep() {
  const current = await getCurrentStep();
  if (!current) redirect("/booking");
  if (current >= STEPS.length) redirect(STEPS[current - 1].path);
  await setCurrentStep(current + 1);
  redirect(STEPS[current].path);
}

export async function previousStep() {
  const current = await getCurrentStep();
  if (!current || current === 1) {
    await clearCurrentStep();
    redirect("/booking");
  }
  await setCurrentStep(current - 1);
  redirect(STEPS[current - 2].path);
}

export async function submitBooking() {
  if ((await getCurrentStep()) !== STEPS.length) redirect("/booking");
  await clearCurrentStep();
  redirect("/booking-status");
}
