"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import type { ArchiveDetail } from "@/lib/definitions";
import DeleteDialog from "../delete-dialog";
import { STATUS_LABEL, STATUS_TEXT } from "@/lib/booking-status";
import RequestDetails from "./request-details";
import { DownloadDialog, printRequests } from "@/app/components/export-dialogs";

const btn = "rounded-md px-6 py-2 text-sm font-semibold disabled:opacity-50";
const btnPrimary = `${btn} bg-accent-1 text-white hover:opacity-90`;
const btnOutline = `${btn} border border-accent-1 bg-container text-accent-1 hover:bg-accent-4`;
const btnDanger = `${btn} bg-red-600 text-white hover:bg-red-700`;
const ARROW =
  "flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40";

export default function DetailViewer({
  initial,
}: {
  initial: ArchiveDetail[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [index, setIndex] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [exportType, setExportType] = useState<"print" | "download" | null>(
    null,
  );

  const current = items[index];

  function afterDelete() {
    const next = items.filter((_, i) => i !== index);
    setConfirmDelete(false);
    if (next.length === 0) return router.push("/booking-archives");
    setItems(next);
    setIndex(Math.min(index, next.length - 1));
  }

  return (
    <main className="px-8 py-5">
      <div className="flex items-center justify-between">
        <Link
          href="/booking-archives"
          className="font-semibold text-accent-1 hover:underline"
        >
          {"<"} Back to Archives
        </Link>

        {items.length > 1 && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Previous Request"
              disabled={index === 0}
              onClick={() => setIndex(index - 1)}
              className={ARROW}
            >
              <FiChevronLeft size={22} />
            </button>
            <span className="text-sm font-semibold">
              Request {index + 1} of {items.length}
            </span>
            <button
              type="button"
              aria-label="Next Request"
              disabled={index === items.length - 1}
              onClick={() => setIndex(index + 1)}
              className={ARROW}
            >
              <FiChevronRight size={22} />
            </button>
          </div>
        )}
      </div>

      <section className="mt-4 flex min-h-112 flex-col rounded-lg bg-container p-6 shadow-sm">
        <h1 className={`text-3xl font-bold ${STATUS_TEXT[current.status]}`}>
          {STATUS_LABEL[current.status]}
        </h1>

        <RequestDetails d={current} />

        <div className="mt-auto flex flex-wrap items-center justify-end gap-3 pt-6">
          {current.status === "approved" && (
            <>
              <button
                type="button"
                className={btnPrimary}
                onClick={() => printRequests([current.id])}
              >
                Print Details
              </button>
              <button
                type="button"
                className={btnOutline}
                onClick={() => setExportType("download")}
              >
                Download Details
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className={btnDanger}
          >
            Delete
          </button>
        </div>
      </section>

      {exportType === "download" && (
        <DownloadDialog
          ids={[current.id]}
          onClose={() => setExportType(null)}
        />
      )}
      {confirmDelete && (
        <DeleteDialog
          count={1}
          onClose={() => setConfirmDelete(false)}
          onConfirm={afterDelete}
        />
      )}
    </main>
  );
}
