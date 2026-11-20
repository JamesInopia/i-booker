"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useTrackedRouter as useRouter } from "../../../components/loading-provider";
import { REPORT_PRIORITIES, type ReportPriority } from "@/lib/report";
import { ConfirmDialog } from "../accounts/account-dialogs";
import { resolveReports, setReportPriority } from "./actions";
import { reportsHref, type ReportsQuery } from "./filters";
import { PRIORITY_BADGE, PRIORITY_LABEL, reporterLabel, type ReportRow } from "./types";

const th = "px-3 py-3 text-left text-sm font-bold";
const td = "px-3 py-3 text-sm";
const buttonPrimary =
  "rounded-md bg-accent-1 px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40";

export function ReportsTable({ reports, query }: { reports: ReportRow[]; query: ReportsQuery }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [resolving, setResolving] = useState(false);
  const [saving, startSaving] = useTransition();
  const [error, setError] = useState("");
  const allRef = useRef<HTMLInputElement>(null);

  // Only keep selections that are still in the list (filters change, reports get resolved).
  const chosen = useMemo(() => reports.filter((r) => selected.has(r.id)), [reports, selected]);
  const allSelected = reports.length > 0 && chosen.length === reports.length;
  const someSelected = chosen.length > 0 && !allSelected;

  useEffect(() => {
    if (allRef.current) allRef.current.indeterminate = someSelected;
  }, [someSelected]);

  const toggle = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(reports.map((r) => r.id)));

  function applyPriority(value: string) {
    if (!value) return;
    const priority = value === "unmarked" ? null : (value as ReportPriority);
    setError("");
    startSaving(async () => {
      const res = await setReportPriority(chosen.map((r) => r.id), priority);
      if (!res.ok) setError(res.error);
    });
  }

  return (
    <section data-tour="table" className="rounded-lg bg-container p-4 shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="border-b border-black">
              <th scope="col" className="w-10 px-3 py-3">
                <input
                  ref={allRef}
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  disabled={reports.length === 0}
                  aria-label="Select all reports"
                />
              </th>
              <th scope="col" className={th}>Priority</th>
              <th scope="col" className={th}>Nature</th>
              <th scope="col" className={th}>Description</th>
              <th scope="col" className={th}>Reported By</th>
              <th scope="col" className={th}>Date Reported</th>
              <th scope="col" className={`${th} text-center`}>Images</th>
            </tr>
          </thead>
          <tbody>
            {reports.length === 0 && (
              <tr>
                <td colSpan={7} className="py-10 text-center text-gray-500">
                  No reports match your filters.
                </td>
              </tr>
            )}
            {reports.map((r) => {
              const isSelected = selected.has(r.id);
              const open = () => router.push(reportsHref(query, r.id));
              const level = r.priority ?? "unmarked";
              return (
                <tr
                  key={r.id}
                  tabIndex={0}
                  onClick={open}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.target === e.currentTarget) open();
                  }}
                  aria-label={`Open report ${r.id} from ${reporterLabel(r)}`}
                  className={`cursor-pointer border-b border-accent-6 hover:bg-accent-4 focus-visible:bg-accent-4 focus-visible:outline-none ${
                    isSelected ? "bg-accent-4" : ""
                  }`}
                >
                  <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggle(r.id)}
                      aria-label={`Select report ${r.id}`}
                    />
                  </td>
                  <td className={td}>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${PRIORITY_BADGE[level]}`}>
                      {PRIORITY_LABEL[level]}
                    </span>
                  </td>
                  <td className={`${td} whitespace-nowrap`}>{r.natureLabel}</td>
                  <td className={`${td} max-w-md`}>
                    <span className="line-clamp-2">{r.description}</span>
                  </td>
                  <td className={td}>{reporterLabel(r)}</td>
                  <td className={`${td} whitespace-nowrap`}>{r.createdAtLabel}</td>
                  <td className={`${td} text-center`}>{r.attachments.length || "-"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {chosen.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-end gap-3 border-t border-accent-6 pt-4">
          <span className="mr-auto text-sm text-gray-600">{chosen.length} selected</span>
          {error && (
            <span role="alert" className="text-sm text-red-600">
              {error}
            </span>
          )}
          <label className="flex items-center gap-2 text-sm font-semibold">
            Set priority
            <select
              value=""
              disabled={saving}
              onChange={(e) => applyPriority(e.target.value)}
              className="h-9 rounded-md border border-accent-6 bg-container px-2 text-sm outline-none focus:border-accent-1 disabled:opacity-50"
            >
              <option value="" disabled>
                {saving ? "Saving..." : "Choose..."}
              </option>
              {REPORT_PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
              <option value="unmarked">Unmarked</option>
            </select>
          </label>
          <button type="button" className={buttonPrimary} onClick={() => setResolving(true)}>
            Mark as Resolved
          </button>
        </div>
      )}

      {resolving && (
        <ConfirmDialog
          title={`Mark ${chosen.length} report${chosen.length === 1 ? "" : "s"} as resolved?`}
          description="This removes the reports and their images for good, and the people who sent them are notified that they were resolved."
          confirmLabel="Mark as resolved"
          pendingLabel="Removing..."
          tone="danger"
          onClose={() => {
            setSelected(new Set());
            setResolving(false);
          }}
          onConfirm={() => resolveReports(chosen.map((r) => r.id))}
        />
      )}
    </section>
  );
}
