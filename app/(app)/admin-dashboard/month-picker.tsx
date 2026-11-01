"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function MonthPicker({ month }: { month: string }) {
  const currentYear = Number(month.slice(0, 4));
  const currentMonth = Number(month.slice(5, 7));
  const label = new Date(Date.UTC(currentYear, currentMonth - 1, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(currentYear);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = () => {
    setYear(currentYear);
    setOpen((o) => !o);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="rounded px-2 py-1 text-lg font-bold hover:bg-white/10"
      >
        {label} <span aria-hidden>▾</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Choose month and year"
          className="absolute left-1/2 top-full z-10 mt-2 w-64 -translate-x-1/2 rounded-lg bg-container p-3 text-neutral-900 shadow-lg"
        >
          <div className="mb-2 flex items-center justify-between">
            <button type="button" onClick={() => setYear((y) => y - 1)} aria-label="Previous year" className="rounded px-2 py-1 hover:bg-blue-100">
              ‹
            </button>
            <span className="font-semibold">{year}</span>
            <button type="button" onClick={() => setYear((y) => y + 1)} aria-label="Next year" className="rounded px-2 py-1 hover:bg-blue-100">
              ›
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {MONTHS.map((name, i) => {
              const selected = year === currentYear && i + 1 === currentMonth;
              return (
                <Link
                  key={name}
                  href={{
                    pathname: "/admin-dashboard",
                    query: { tab: "timeline", view: "a", month: `${year}-${String(i + 1).padStart(2, "0")}` },
                  }}
                  onClick={() => setOpen(false)}
                  aria-current={selected ? "true" : undefined}
                  className={`rounded px-2 py-2 text-center text-sm ${selected ? "bg-accent-1 text-white" : "hover:bg-blue-100"}`}
                >
                  {name}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
