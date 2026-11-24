"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ArchiveRow } from "@/lib/definitions";
import DeleteDialog from "./delete-dialog";
import type { ArchiveAction } from "./options";
import RowMenu from "./row-menu";
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
const TH = "max-lg:whitespace-nowrap border-l border-black px-3 py-3 text-sm font-bold md:text-base xl:text-lg";
const TD = "border-l border-black px-3 py-2";
// Below lg the table keeps all its columns and scrolls sideways. The checkbox column stays pinned on the left and the
// action menu on the right, so the row can always be selected and acted on.
const PIN_L = "max-lg:sticky max-lg:left-0 max-lg:z-10 max-lg:bg-white";
const PIN_R = "max-lg:sticky max-lg:right-0 max-lg:z-10 max-lg:bg-white max-lg:shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.25)]";

export default function ArchiveTable({ rows }: { rows: ArchiveRow[] }) {
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

      <div data-tour="table" className="@container min-h-0 flex-1 overflow-auto rounded-2xl bg-white">
        <table className="min-w-5xl border-collapse text-center lg:min-w-full">
          <thead>
            <tr className="border-b border-black">
              <th className={`w-12 px-3 py-3 ${PIN_L}`}>
                <input
                  type="checkbox"
                  aria-label="Select All"
                  checked={allSelected}
                  onChange={toggleAll}
                />
              </th>
              <th className={TH}>Booking ID</th>
              <th className={TH}>Requestor Name</th>
              <th className={TH}>Purpose of Booking</th>
              <th className={TH}>Room Name</th>
              <th className={TH}>Date of Request</th>
              <th className={TH}>Scheduled Date</th>
              <th className={TH}>Status</th>
              <th className={`${TH} ${PIN_R}`}>Action</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id}>
                <td className={`px-3 py-2 ${PIN_L}`}>
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
                <td className={`${TD} ${PIN_R}`}>
                  <RowMenu
                    id={r.id}
                    status={r.status}
                    onAction={(a) =>
                      a === "print"
                        ? printRequests([r.id])
                        : setDialog({ type: a, ids: [r.id] })
                    }
                  />
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={9} className="py-10 text-gray-500">
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
      </div>

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
