import { requireUser } from "@/lib/auth";
import { resolveTab } from "@/lib/nav";
import { startBooking } from "./actions";

type Params = { tab?: string | string[] };

const first = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v);

export default async function BookingPage({ searchParams }: { searchParams: Promise<Params> }) {
  const user = await requireUser();
  const params = await searchParams;
  const tab = resolveTab("/booking", user.role, first(params.tab));

  if (tab.id === "manage-rooms") {
    return (
      <main className="px-16 pb-8 pt-2">
        <h1 className="text-4xl font-bold">Manage Rooms page</h1>
      </main>
    );
  }

  return (
    <main className="px-16 pb-8 pt-2">
      <h1 className="text-4xl font-bold">Booking page</h1>
      <form action={startBooking} className="mt-8">
        <button className="bg-neutral-900 px-4 py-2 text-white">Start booking</button>
      </form>
    </main>
  );
}
