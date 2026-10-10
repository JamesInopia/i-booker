import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const STEPS = [
  { n: 1, path: "/booking/select-date", title: "Select a date" },
  { n: 2, path: "/booking/select-time", title: "Select a time" },
  { n: 3, path: "/booking/booking-details", title: "Fill out booking details" },
  { n: 4, path: "/booking/review-and-submit", title: "Review and submit" },
] as const;

const COOKIE = "booking_step";

export async function getCurrentStep(): Promise<number | null> {
  const value = Number((await cookies()).get(COOKIE)?.value);
  return Number.isInteger(value) && value >= 1 && value <= STEPS.length ? value : null;
}

export async function setCurrentStep(step: number) {
  (await cookies()).set(COOKIE, String(step), { httpOnly: true, sameSite: "lax", path: "/" });
}

export async function clearCurrentStep() {
  (await cookies()).delete(COOKIE);
}

export async function requireStep(step: number) {
  const current = await getCurrentStep();
  if (current !== step) redirect(current ? STEPS[current - 1].path : "/booking");
}
