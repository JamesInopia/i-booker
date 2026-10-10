import { startBooking } from "./actions";

export default function BookingPage() {
  return (
    <main className="px-16 py-8">
      <h1 className="text-4xl font-bold">Booking page</h1>
      <form action={startBooking} className="mt-8">
        <button className="bg-neutral-900 px-4 py-2 text-white">Start booking</button>
      </form>
    </main>
  );
}