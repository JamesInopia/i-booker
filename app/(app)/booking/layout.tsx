import { BookingShell } from "./progress";

export default function BookingLayout({ children }: { children: React.ReactNode }) {
  return <BookingShell>{children}</BookingShell>;
}