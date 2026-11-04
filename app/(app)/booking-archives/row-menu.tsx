"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BsThreeDots } from "react-icons/bs";
import type { ArchiveAction } from "./options";
import type { ArchiveRow } from "@/lib/definitions";

const ITEM = "block w-full px-4 py-2 text-left hover:bg-gray-100";

export default function RowMenu({
  id,
  status,
  onAction,
}: {
  id: number;
  status: ArchiveRow["status"];
  onAction: (a: ArchiveAction) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !btnRef.current?.contains(t))
        close();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();

    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onDown);
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

  function pick(a: ArchiveAction) {
    setOpen(false);
    onAction(a);
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        aria-label="Actions"
        aria-haspopup="menu"
        aria-expanded={open}
        className="rounded-full p-2 hover:bg-gray-100"
      >
        <BsThreeDots size={18} />
      </button>
      {open && (
        <div
          ref={menuRef}
          role="menu"
          style={{ top: pos.top, right: pos.right }}
          className="fixed z-50 w-auto overflow-hidden rounded-lg border border-gray-200 bg-white text-left text-sm shadow-lg"
        >
          <Link
            href={`/booking-archives/view?ids=${id}`}
            role="menuitem"
            className={ITEM}
          >
            View Details
          </Link>
          {status === "approved" && (
            <>
              <button
                type="button"
                role="menuitem"
                onClick={() => pick("print")}
                className={ITEM}
              >
                Print Details
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => pick("download")}
                className={ITEM}
              >
                Download Details
              </button>
            </>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={() => pick("delete")}
            className={`${ITEM} text-red-600`}
          >
            Delete
          </button>
        </div>
      )}
    </>
  );
}
