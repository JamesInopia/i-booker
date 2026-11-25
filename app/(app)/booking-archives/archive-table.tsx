"use client";

import Link from "next/link";
import { useTrackedRouter as useRouter } from "@/app/components/loading-provider";
import { useMemo, useState } from "react";
import type { ArchiveRow } from "@/lib/definitions";
import DeleteDialog from "./delete-dialog";
import type { ArchiveAction } from "./options";
import { deleteArchived } from "./actions";
import { DownloadDialog, printRequests } from "@/app/components/export-dialogs";
import { barDanger, barPrimary, SelectionBar } from "@/app/components/selection-bar";
import { STATUS_LABEL, STATUS_TEXT, canPrint } from "@/lib/booking-status";
import {
  ARCHIVE_SORTS,
  ListFilters,
  filterRows,
  type SortKey,
} from "@/app/components/list-filters";

const PRINT_HINT =
  "Only approved, rejected or cancelled requests can be downloaded or printed.";
// Same look as the Review tab's table: left-aligned columns, a line under each row, the row lights up on hover.
const TH = "px-3 py-3 text-left text-sm font-bold";
const TD = "px-3 py-3 text-sm";
// Below lg the table keeps all its columns and scrolls sideways; the checkbox column stays pinned on the left.
const PIN_L = "max-lg:sticky max-lg:left-0 max-lg:z-10 max-lg:bg-container max-lg:group-hover:bg-accent-4 max-lg:group-focus-visible:bg-accent-4";

export default function ArchiveTable({ rows }: { rows: ArchiveRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [dialog, setDialog] = useState<{
    type: ArchiveAction;
    ids: number[];
  } | null>(null);

  const [q, setQ] = useState("");
  const [show, setShow] = useState("all");
  const [sort, setSort] = useState<SortKey>("requested_desc");

  const shown = useMemo(
    () =>
      filterRows(rows, q, show, sort, {
        id: (r) => r.id,
        status: (r) => r.status,
        scheduled: (r) => r.scheduledDate,
        requestor: (r) => r.requestor,
        text: (r) => [String(r.id), r.requestor, r.purpose, r.room],
      }),
    [rows, q, show, sort],
  );

  const chosen = useMemo(
    () => shown.filter((r) => selected.has(r.id)).map((r) => r.id),
    [shown, selected],
  );
  const allSelected = shown.length > 0 && chosen.length === shown.length;
  const allPrintable = chosen.every((id) => {
    const row = shown.find((r) => r.id === id);
    return !!row && canPrint(row.status);
  });

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(shown.map((r) => r.id)));
  }

  async function confirmDelete() {
    if (!dialog) return;
    const res = await deleteArchived(dialog.ids);
    if (res.error) return res.error;
    setSelected(new Set());
    setDialog(null);
  }

  return (
    <>
      <div data-tour="filters" className="mb-3">
        <ListFilters
          q={q}
          onQ={setQ}
          placeholder="Search Requests"
          show={show}
          onShow={setShow}
          showOptions={[
            { value: "approved", label: "Approved" },
            { value: "rejected", label: "Rejected" },
            { value: "cancelled", label: "Cancelled" },
          ]}
          sort={sort}
          onSort={setSort}
          sortOptions={ARCHIVE_SORTS}
        />
      </div>

      <section data-tour="table" className="@container min-h-0 flex-1 overflow-auto rounded-lg bg-container p-4 shadow-sm">
        <table className="min-w-5xl border-collapse lg:min-w-full">
          <thead>
            <tr className="border-b border-black">
              <th scope="col" className={`w-10 px-3 py-3 ${PIN_L}`}>
                <input
                  type="checkbox"
                  aria-label="Select All"
                  checked={allSelected}
                  onChange={toggleAll}
                />
              </th>
              <th scope="col" className={TH}>Booking ID</th>
              <th scope="col" className={TH}>Requestor Name</th>
              <th scope="col" className={TH}>Purpose of Booking</th>
              <th scope="col" className={TH}>Room Name</th>
              <th scope="col" className={TH}>Date of Request</th>
              <th scope="col" className={TH}>Scheduled Date</th>
              <th scope="col" className={TH}>Status</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => {
              const open = () => router.push(`/booking-archives/view?ids=${r.id}`);
              return (
                <tr
                  key={r.id}
                  tabIndex={0}
                  onClick={open}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.target === e.currentTarget) open();
                  }}
                  aria-label={`Open request ${r.id} from ${r.requestor}`}
                  className={`group cursor-pointer border-b border-accent-6 hover:bg-accent-4 focus-visible:bg-accent-4 focus-visible:outline-none ${selected.has(r.id) ? "bg-accent-5" : ""}`}
                >
                  <td className={`px-3 py-3 ${PIN_L}`} onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      aria-label={`Select request ${r.id}`}
                      checked={selected.has(r.id)}
                      onChange={() => toggle(r.id)}
                    />
                  </td>
                  <td className={TD}>#{String(r.id).padStart(5, "0")}</td>
                  <td className={TD}>{r.requestor}</td>
                  <td className={TD}>{r.purpose}</td>
                  <td className={TD}>{r.room}</td>
                  <td className={TD}>{r.requestDate}</td>
                  <td className={TD}>{r.scheduledDate}</td>
                  <td className={`${TD} font-semibold ${STATUS_TEXT[r.status]}`}>
                    {STATUS_LABEL[r.status]}
                  </td>
                </tr>
              );
            })}
            {shown.length === 0 && (
              <tr>
                <td colSpan={8} className="py-10 text-center text-gray-500">
                  <div className="sticky left-0 w-[100cqw]">
                    {rows.length === 0
                      ? "No archived requests at the moment..."
                      : "No requests match your search"}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {chosen.length > 0 && (
          <SelectionBar className="mt-3" count={chosen.length} onClear={() => setSelected(new Set())}>
            <Link
              href={`/booking-archives/view?ids=${chosen.join(",")}`}
              className={barPrimary}
            >
              View Details
            </Link>
            <button
              type="button"
              onClick={() => printRequests(chosen)}
              disabled={!allPrintable}
              title={allPrintable ? undefined : PRINT_HINT}
              className={barPrimary}
            >
              Print Details
            </button>
            <button
              type="button"
              onClick={() => setDialog({ type: "download", ids: chosen })}
              disabled={!allPrintable}
              title={allPrintable ? undefined : PRINT_HINT}
              className={barPrimary}
            >
              Download Details
            </button>
            <button
              type="button"
              onClick={() => setDialog({ type: "delete", ids: chosen })}
              className={barDanger}
            >
              Delete
            </button>
          </SelectionBar>
      )}

      {dialog?.type === "delete" && (
        <DeleteDialog
          count={dialog.ids.length}
          onClose={() => setDialog(null)}
          onConfirm={confirmDelete}
        />
      )}
      {dialog?.type === "download" && (
        <DownloadDialog ids={dialog.ids} onClose={() => setDialog(null)} />
      )}
    </>
  );
}
