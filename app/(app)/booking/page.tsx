import { requireUser } from "@/lib/auth";
import { resolveTab } from "@/lib/nav";
import { listManagedRooms } from "./queries";
import { ManageRooms } from "./manage-rooms";
import { RoomBrowser } from "./room-browser";

type Params = { tab?: string | string[] };

const first = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v);

export default async function BookingPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const tab = resolveTab("/booking", user.role, first(params.tab));

  const rooms = await listManagedRooms();

  if (tab.id === "manage-rooms") {
    return (
      <main className="px-4 pb-6 pt-2 sm:px-8 lg:px-16 lg:pb-8">
        <ManageRooms initialRooms={rooms} />
      </main>
    );
  }

  return (
    <main className="px-4 pb-6 pt-2 sm:px-8 lg:px-16 lg:pb-8">
      <RoomBrowser rooms={rooms} />
    </main>
  );
}
