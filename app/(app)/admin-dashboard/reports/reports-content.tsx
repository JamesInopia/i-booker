import { requireRole } from "@/lib/auth";
import { signAttachmentUrls } from "@/lib/report-storage";
import { REPORT_ROLES } from "@/lib/session";
import { applyQuery, parseQuery, reportsHref } from "./filters";
import { getReports } from "./queries";
import { ReportDetail } from "./report-detail";
import { ReportsFilters } from "./reports-filters";
import { ReportsTable } from "./reports-table";

export type ReportsParams = { sort?: string; priority?: string; nature?: string; q?: string; report?: string };

export async function ReportsContent({ params }: { params: ReportsParams }) {
  // Developers and supervisors only (supervisors reach this by address; the tab isn't in their bar).
  await requireRole(...REPORT_ROLES);

  const query = parseQuery(params);
  const all = await getReports();

  const reportId = /^\d+$/.test(params.report ?? "") ? Number(params.report) : null;
  const current = reportId === null ? null : all.find((r) => r.id === reportId);

  if (current) {
    const imageUrls = await signAttachmentUrls(current.attachments);
    return <ReportDetail key={current.id} report={current} imageUrls={imageUrls} backHref={reportsHref(query)} />;
  }

  return (
    <div className="space-y-4">
      <ReportsFilters query={query} />
      <ReportsTable reports={applyQuery(all, query)} query={query} />
    </div>
  );
}
