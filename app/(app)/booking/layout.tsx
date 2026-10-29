import { BookingShell } from "./progress";
import { getMaxStep } from "./progress-state";

export default async function BookingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const maxStep = await getMaxStep();
  return <BookingShell maxStep={maxStep}>{children}</BookingShell>;
}
