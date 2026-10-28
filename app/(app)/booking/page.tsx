import { requireUser } from "@/lib/auth";
import { resolveTab } from "@/lib/nav";
import { listAllRooms } from "./queries";
import { RoomBrowser } from "./room-browser";

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

  const rooms = await listAllRooms();

  return (
    <main className="px-16 pb-8 pt-2">
      <RoomBrowser rooms={rooms} />
    </main>
  );
}