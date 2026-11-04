import JSZip from "jszip";
import { requireUser } from "@/lib/auth";
import { buildRequestsPdf } from "@/lib/activity-form";
import { getArchiveDetails } from "@/lib/request-details";

export async function GET(req: Request) {
  const user = await requireUser();
  const isAdmin =
    user.role === "admin_liaison" || user.role === "admin_supervisor";
  if (!isAdmin) return new Response("Forbidden", { status: 403 });

  const sp = new URL(req.url).searchParams;
  const ids = [
    ...new Set(
      (sp.get("ids") ?? "").split(",").map(Number).filter(Number.isInteger),
    ),
  ].slice(0, 50);
  if (ids.length === 0) return new Response("Not Found", { status: 404 });

  const mode = sp.get("mode") === "separate" ? "separate" : "combined";
  const inline = sp.get("inline") === "1";

  const all = await getArchiveDetails(ids);
  const items = all.filter((d) => d.status === "approved");
  if (items.length === 0)
    return new Response("Only approved requests can be downloaded or printed", {
      status: 403,
    });

  if (mode === "separate" && items.length > 1) {
    const zip = new JSZip();
    for (const d of items) {
      zip.file(`activity-request-${d.id}.pdf`, await buildRequestsPdf([d]));
    }
    const buf = await zip.generateAsync({ type: "uint8array" });
    return new Response(buf as BodyInit, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="activity-requests.zip"',
      },
    });
  }

  const pdf = await buildRequestsPdf(items);
  const name =
    items.length === 1
      ? `activity-request-${items[0].id}.pdf`
      : "activity-requests.pdf";
  return new Response(pdf as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${name}"`,
    },
  });
}
