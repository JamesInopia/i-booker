import { getRooms } from "@/lib/rooms";
import BookingPage from "./booking_page";

export default async function Page() {
  const rooms = await getRooms();

  return <BookingPage rooms={rooms} />;
}
