import { requireRole } from "@/lib/auth";
import ArchiveTable from "./archive-table";
import { getArchiveRows } from "./queries";

export default async function BookingArchivesPage() {
  await requireRole("admin_liaison", "admin_supervisor");
  const rows = await getArchiveRows();

  return (
    <main className="box-border flex flex-col h-screen px-8 py-5">
      <h1 className="text-4xl font-bold pb-5">Booking Archives</h1>

      <ArchiveTable rows={rows} />
    </main>
  );
}
