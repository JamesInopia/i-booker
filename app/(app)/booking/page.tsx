import { requireUser } from "@/lib/auth";
import { resolveTab } from "@/lib/nav";
import { listAllRooms, listManagedRooms } from "./queries";
import { RoomBrowser } from "./room-browser";
import { ManageRooms } from "./manage-rooms";

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

  if (tab.id === "manage-rooms") {
    const rooms = await listManagedRooms();
    return (
      <main className="px-4 pb-8 pt-5 sm:px-8 xl:px-14">
        <ManageRooms initialRooms={rooms} />
      </main>
    );
  }

  const rooms = await listManagedRooms();

  return (
    <main className="px-16 pb-8 pt-2">
      <RoomBrowser rooms={rooms} />
    </main>
  );
}
