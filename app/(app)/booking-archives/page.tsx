import { requireRole } from "@/lib/auth";
import ArchiveTable from "./archive-table";
import { getArchiveRows } from "./queries";

export default async function BookingArchivesPage() {
  await requireRole("admin_liaison", "admin_supervisor");

  const rows = await getArchiveRows();

  return (
    <main className="flex h-full min-h-0 flex-col gap-6 px-8 py-5">
      <h1 className="text-4xl font-bold">Booking Archives</h1>
      <ArchiveTable rows={rows} />
    </main>
  );
}
