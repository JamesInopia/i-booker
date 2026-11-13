import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getArchiveDetails } from "@/lib/request-details";
import DetailViewer from "./detail-viewer";

export default async function ViewBookingPage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  await requireRole("admin_liaison", "admin_supervisor");

  const { ids = "" } = await searchParams;
  const wanted = [...new Set(ids.split(",").map(Number))]
    .filter(Number.isInteger)
    .slice(0, 50);

  const items = await getArchiveDetails(wanted);
  if (items.length === 0) notFound();

  return <DetailViewer initial={items} />;
}
