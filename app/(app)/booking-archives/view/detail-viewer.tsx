"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import type { ArchiveDetail } from "@/lib/definitions";
import DeleteDialog from "../delete-dialog";
import RequestDetails from "./request-details";

const BTN =
  "rounded-lg px-6 py-2 font-semibold text-white hover:brightness-110";
const ARROW =
  "flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md hover:bg-gray-100 dfisabled:cursor-not-allowed disabled:opacity-40";

export default function DetailViewer({
  initial,
}: {
  initial: ArchiveDetail[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [index, setIndex] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);

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

      <div className="mt-4 rounded-2xl bg-white p-8">
        <div className="flex items-baseline justify-between">
          <h1 className="text-2xl font-bold">
            Booking Details{" "}
            <span className="font-normal text-accent-3">
              #{String(current.id).padStart(5, "0")}
            </span>
          </h1>
          <span className="rounded-full bg-accent-5 px-5 py-1 text-sm font-semibold capitalize">
            {current.status}
          </span>
        </div>

        <RequestDetails d={current} />
      </div>

      <div className="mt-6 flex items-center justify-between">
        <div className="flex gap-4">
          {/* print and download dialogs later */}
          <button type="button" className={`${BTN} bg-accent-1`}>
            Print Details
          </button>
          <button type="button" className={`${BTN} bg-accent-1`}>
            Download Details
          </button>
        </div>
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className={`${BTN} bg-accent-2`}
        >
          Delete
        </button>
      </div>

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
