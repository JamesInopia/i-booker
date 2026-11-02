import ArchiveTable from "./archive-table";
import { SAMPLE_ROWS } from "./sample-data";

export default function BookingArchivesPage() {
  // TODO: add require_role here (during back-end)

  return (
    <main className="flex h-full min-h-0 flex-col gap-6 px-8 py-5">
      <h1 className="text-4xl font-bold">Booking Archives</h1>
      <ArchiveTable initialRows={SAMPLE_ROWS} />
    </main>
  );
}
