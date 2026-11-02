import { notFound } from "next/navigation";
import { SAMPLE_DETAILS } from "../sample-details";
import DetailViewer from "./detail-viewer";

export default async function ViewBookingPage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  // TODO: add require_role here (during back-end)

  const { ids = "" } = await searchParams;
  const wanted = [...new Set(ids.split(",").map(Number))]
    .filter(Number.isInteger)
    .slice(0, 50);

  const items = wanted
    .map((id) => SAMPLE_DETAILS.find((d) => d.id === id))
    .filter((d): d is NonNullable<typeof d> => Boolean(d));

  if (items.length === 0) notFound();

  return <DetailViewer initial={items} />;
}
