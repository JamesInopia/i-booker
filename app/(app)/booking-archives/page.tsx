import { requireRole } from "@/lib/auth";
import ArchiveTable from "./archive-table";
import { getArchiveRows } from "./queries";

export default async function BookingArchivesPage() {
  await requireRole("admin_liaison", "admin_supervisor");
  const rows = await getArchiveRows();

  return (
    <main className="box-border flex min-h-[calc(100dvh-var(--header-h))] flex-col px-4 py-4 sm:px-6 lg:h-[calc(100dvh-var(--header-h))] lg:min-h-0 lg:px-8 lg:py-5">
      <h1 className="pb-3 text-2xl font-bold sm:text-3xl lg:pb-5 lg:text-4xl">Booking Archives</h1>

      <ArchiveTable rows={rows} />
    </main>
  );
}
