"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { BsThreeDots } from "react-icons/bs";
import { cancelRequest } from "./actions";
import type { BookingStatus } from "@/lib/definitions";
import { startEdit } from "../booking/actions";

export default function RowActions({
  id,
  status,
}: {
  id: number;
  status: BookingStatus;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const [pending, startTransition] = useTransition();
  const [showCancel, setShowCancel] = useState(false);
  const [reason, setReason] = useState("");
  const [cancelError, setCancelError] = useState("");
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const canCancel = status === "pending" || status === "reviewed";
  const canEdit = status === "pending";

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !btnRef.current?.contains(t)) close;
    };
    const onKey = (e: KeyboardEvent) => e.key === "escape" && close();

    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  function toggle() {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
    }
    setOpen((o) => !o);
  }

  function openCancel() {
    setOpen(false);
    setReason("");
    setCancelError("");
    setShowCancel(true);
  }

  function submitCancel() {
    if (reason.trim().length < 3) {
      setCancelError("Please enter a reason.");
      return;
    }
    startTransition(async () => {
      const res = await cancelRequest(id, reason);
      if (res?.error) {
        setCancelError(res.error);
        return;
      }
      setShowCancel(false);
    });
  }

  function onEdit() {
    setOpen(false);
    startTransition(async () => {
      await startEdit(id);
    });
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-label="Actions"
        aria-haspopup="menu"
        aria-expanded={open}
        className="rounded-full hover:bg-gray-400 disabled:opacity-50"
      >
        <BsThreeDots size={18} />
      </button>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          style={{ top: pos.top, right: pos.right }}
          className="fixed z-50 w-36 overflow-hidden rounded-lg-border border-gray-200 bg-white text-left text-sm shadow-lg"
        >
          {canEdit && (
            <button
              type="button"
              role="menuitem"
              onClick={onEdit}
              className="block w-full px-4 py-2 text-left hover:bg-gray-100"
            >
              Edit
            </button>
          )}
          {canCancel && (
            <button
              type="button"
              role="menuitem"
              onClick={openCancel}
              className="block w-full px-4 py-2 text-left text-red-600 hover:bg-gray-100"
            >
              Cancel Request
            </button>
          )}
        </div>
      )}
      {showCancel && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !pending && setShowCancel(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-title"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-white p-6 text-left shadow-xl"
          >
            <h2 id="cancel-title" className="text-xl font-bold">
              Cancel this request?
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Please tell us why you're cancelling.
            </p>

            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              rows={4}
              autoFocus
              className="mt-4 w-full rounded-md border border-gray-300 p-3 text-sm outline-none focus:border-blue-900"
              placeholder="Reason for cancellation"
            />
            {cancelError && (
              <p className="mt-2 text-sm text-red-600" role="alert">
                {cancelError}
              </p>
            )}

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCancel(false)}
                disabled={pending}
                className="rounded-full px-5 py-2 font-semibold hover:bg-gray-100 disabled:opacity-50"
              >
                Keep request
              </button>
              <button
                type="button"
                onClick={submitCancel}
                disabled={pending}
                className="rounded-full bg-red-600 px-5 py-2 font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {pending ? "Cancelling..." : "Confirm cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
