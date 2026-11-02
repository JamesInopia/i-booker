"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ArchiveRow } from "@/lib/definitions";
import DeleteDialog from "./delete-dialog";
import type { ArchiveAction } from "./options";
import RowMenu from "./row-menu";
import { tr } from "zod/locales";

const BTN =
  "rounded-lg px-6 py-2 font-semibold text-white hover:brightness-110";
const TH = "border-l border-black px-3 py-3 text-lg font-bold";
const TD = "border-l border-black px-3 py-2";

export default function ArchiveTable({
  initialRows,
}: {
  initialRows: ArchiveRow[];
}) {
  const [rows, setRows] = useState(initialRows); //temporary
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [dialog, setDialog] = useState<{
    type: ArchiveAction;
    ids: number[];
  } | null>(null);

  const chosen = useMemo(
    () => rows.filter((r) => selected.has(r.id)).map((r) => r.id),
    [rows, selected],
  );
  const allSelected = rows.length > 0 && chosen.length === rows.length;

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));
  }

  function confirmDelete() {
    if (!dialog) return;
    const gone = new Set(dialog.ids);
    setRows((prev) => prev.filter((r) => !gone.has(r.id)));
    setSelected(new Set());
    setDialog(null);
  }

  return (
    <>
      <div className="min-h-0 flex-1 overflow-auto rounded-2xl bg-white">
        <table className="min-w-full border-collapse text-center">
          <thead>
            <tr className="border-b border-black">
              <th className="w-12 px-3 py-3">
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
              <th className={TH}>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-3 py-2">
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
                <td className={TD}>
                  <RowMenu
                    id={r.id}
                    onAction={(type) => setDialog({ type, ids: [r.id] })}
                  />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="py-10 text-gray-500">
                  No archived requests at the moment...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex min-h-11 items-center justify-between">
        {chosen.length > 1 && (
          <>
            <div className="flex gap-4">
              <Link
                href={`/booking-archives/view?ids=${chosen.join(",")}`}
                className={`${BTN} bg-accent-1`}
              >
                View Booking Details
              </Link>
              <button
                type="button"
                onClick={() => setDialog({ type: "print", ids: chosen })}
                className={`${BTN} bg-accent-1`}
              >
                Print Booking Details
              </button>
              <button
                type="button"
                onClick={() => setDialog({ type: "download", ids: chosen })}
                className={`${BTN} bg-accent-1`}
              >
                Download Booking Details
              </button>
            </div>
            <button
              type="button"
              onClick={() => setDialog({ type: "delete", ids: chosen })}
              className={`${BTN} bg-accent-2`}
            >
              Delete
            </button>
          </>
        )}
      </div>

      {dialog?.type === "delete" && (
        <DeleteDialog
          count={dialog.ids.length}
          onClose={() => setDialog(null)}
          onConfirm={confirmDelete}
        />
      )}
      {/* dialogs for print and download here */}
    </>
  );
}
