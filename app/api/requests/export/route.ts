import JSZip from "jszip";
import { requireUser } from "@/lib/auth";
import { buildRequestsPdf } from "@/lib/activity-form-pdf";
import { buildRequestsDocx } from "@/lib/activity-form-docx";
import { getArchiveDetails } from "@/lib/request-details";
import { canPrint } from "@/lib/booking-status";

const DOCX_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

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
  const format = sp.get("format") === "docx" ? "docx" : "pdf";
  const inline = sp.get("inline") === "1" && format === "pdf";

  const all = await getArchiveDetails(ids);
  const items = all.filter((d) => canPrint(d.status));
  if (items.length === 0)
    return new Response(
      "Only approved, rejected or cancelled requests can be downloaded or printed",
      { status: 403 },
    );

  const build = (list: typeof items) =>
    format === "docx" ? buildRequestsDocx(list) : buildRequestsPdf(list);

  if (mode === "separate" && items.length > 1) {
    const zip = new JSZip();
    for (const d of items) {
      zip.file(`activity-request-${d.id}.${format}`, await build([d]));
    }
    const buf = await zip.generateAsync({ type: "uint8array" });
    return new Response(buf as BodyInit, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="activity-requests.zip"',
      },
    });
  }

  const file = await build(items);
  const name =
    items.length === 1
      ? `activity-request-${items[0].id}.${format}`
      : `activity-requests.${format}`;
  return new Response(file as BodyInit, {
    headers: {
      "Content-Type": format === "docx" ? DOCX_TYPE : "application/pdf",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${name}"`,
    },
  });
}
