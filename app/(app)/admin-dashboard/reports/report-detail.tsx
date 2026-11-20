"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useTrackedRouter as useRouter } from "../../../components/loading-provider";
import { REPORT_PRIORITIES, type ReportPriority } from "@/lib/report";
import { ConfirmDialog } from "../accounts/account-dialogs";
import { resolveReports, setReportPriority } from "./actions";
import { PRIORITY_BADGE, PRIORITY_LABEL, reporterLabel, type ReportRow } from "./types";

const btnPrimary = "rounded-md bg-accent-1 px-5 py-2 text-sm font-semibold text-white hover:opacity-90";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="mt-0.5 text-base">{value}</dd>
    </div>
  );
}

const CHOICES: { value: ReportPriority | null; label: string }[] = [
  ...REPORT_PRIORITIES,
  { value: null, label: "Unmarked" },
];

export function ReportDetail({
  report,
  imageUrls,
  backHref,
}: {
  report: ReportRow;
  imageUrls: string[];
  backHref: string;
}) {
  const router = useRouter();
  const [resolving, setResolving] = useState(false);
  const [saving, startSaving] = useTransition();
  const [error, setError] = useState("");
  const level = report.priority ?? "unmarked";

  function choose(priority: ReportPriority | null) {
    if (priority === report.priority) return;
    setError("");
    startSaving(async () => {
      const res = await setReportPriority([report.id], priority);
      if (!res.ok) setError(res.error);
    });
  }

  return (
    <section data-tour="report-details" className="flex min-h-112 flex-col rounded-lg bg-container p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href={backHref} className="text-sm font-semibold text-accent-1 hover:underline">
            ← Back to reports
          </Link>
          <h2 className="mt-2 text-2xl font-bold">
            Report #{report.id} · {report.natureLabel}
          </h2>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${PRIORITY_BADGE[level]}`}>
          {PRIORITY_LABEL[level]} priority
        </span>
      </div>

      <dl className="mt-6 grid gap-x-8 gap-y-4 md:grid-cols-3">
        <Field label="Reported by" value={reporterLabel(report)} />
        <Field label="Email" value={report.reporterEmail ?? "-"} />
        <Field label="Date reported" value={report.createdAtLabel} />
      </dl>

      <div className="mt-6">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Priority</h3>
        <div role="group" aria-label="Set priority" className="mt-2 inline-flex overflow-hidden rounded-md border border-accent-6">
          {CHOICES.map((c) => {
            const active = c.value === report.priority;
            return (
              <button
                key={c.label}
                type="button"
                aria-pressed={active}
                disabled={saving}
                onClick={() => choose(c.value)}
                className={`border-r border-accent-6 px-4 py-2 text-sm font-semibold last:border-r-0 disabled:opacity-60 ${
                  active ? "bg-accent-1 text-white" : "bg-container hover:bg-accent-4"
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
        {error && (
          <p role="alert" className="mt-2 text-sm text-red-600">
            {error}
          </p>
        )}
      </div>

      <div className="mt-6">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Description</h3>
        <p className="mt-1 whitespace-pre-wrap break-words rounded-md bg-accent-6 p-4 text-base">{report.description}</p>
      </div>

      <div className="mt-6">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Images ({report.attachments.length})</h3>
        {report.attachments.length === 0 ? (
          <p className="mt-1 text-sm text-gray-500">No images were attached.</p>
        ) : imageUrls.length === 0 ? (
          <p className="mt-1 text-sm text-red-600">The images couldn&apos;t be loaded right now. Try again in a moment.</p>
        ) : (
          <ul className="mt-2 flex flex-wrap gap-3">
            {imageUrls.map((url, i) => (
              <li key={url}>
                <a href={url} target="_blank" rel="noopener noreferrer" title="Open full size in a new tab">
                  {/* Signed, short-lived storage links: plain <img>, not next/image. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`Attachment ${i + 1} of report ${report.id}`}
                    className="h-40 w-auto max-w-xs rounded-md border border-accent-6 object-cover"
                  />
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-auto flex flex-wrap items-center justify-end gap-3 pt-6">
        <button type="button" className={btnPrimary} onClick={() => setResolving(true)}>
          Mark as Resolved
        </button>
      </div>

      {resolving && (
        <ConfirmDialog
          title="Mark this report as resolved?"
          description={`This removes the report and its images for good. ${
            report.reporterName ? `${report.reporterName} will be notified that it was resolved.` : "The reporter's account no longer exists, so no one will be notified."
          }`}
          confirmLabel="Mark as resolved"
          pendingLabel="Removing..."
          tone="danger"
          onClose={() => setResolving(false)}
          onConfirm={async () => {
            const res = await resolveReports([report.id]);
            if (res.ok) router.replace(backHref);
            return res;
          }}
        />
      )}
    </section>
  );
}
