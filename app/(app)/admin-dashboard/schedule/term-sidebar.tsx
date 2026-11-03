"use client";

import Link from "next/link";
import { useState } from "react";
import { DeleteTermDialog, NewTermDialog } from "./dialogs";
import type { TermRow } from "./types";

export function TermSidebar({ terms, selectedId }: { terms: TermRow[]; selectedId: number | null }) {
  const [dialog, setDialog] = useState<"new" | "delete" | null>(null);
  const selected = terms.find((t) => t.id === selectedId) ?? null;

  return (
    <aside className="flex w-full flex-col rounded-lg bg-container p-4 shadow-sm lg:w-64 lg:shrink-0">
      <h2 className="text-lg font-bold">Terms set:</h2>
      <ul className="mt-3 flex flex-1 flex-col gap-2">
        {terms.map((t) => {
          const active = t.id === selectedId;
          return (
            <li key={t.id}>
              <Link
                href={{ pathname: "/admin-dashboard", query: { tab: "schedule", term: t.id } }}
                aria-current={active ? "true" : undefined}
                className={`block rounded-md border px-3 py-2 text-center text-sm font-bold shadow-sm ${
                  active ? "border-accent-7 bg-accent-7/20" : "border-gray-300 bg-container hover:bg-gray-50"
                }`}
              >
                {t.name}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-6 flex flex-col gap-2">
        <button type="button" onClick={() => setDialog("new")} className="rounded-md bg-accent-1 py-2 font-bold text-white hover:opacity-90">
          New Term
        </button>
        <button
          type="button"
          disabled={!selected}
          onClick={() => setDialog("delete")}
          className="rounded-md bg-accent-2 py-2 font-bold text-white hover:opacity-90 disabled:opacity-50"
        >
          Delete Term
        </button>
      </div>

      {dialog === "new" && <NewTermDialog onClose={() => setDialog(null)} />}
      {dialog === "delete" && selected && <DeleteTermDialog term={selected} onClose={() => setDialog(null)} />}
    </aside>
  );
}

export function EmptyState() {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex min-h-[24rem] flex-col items-center justify-center gap-4 rounded-lg bg-container p-10 text-center shadow-sm">
      <h2 className="text-2xl font-bold">No terms yet</h2>
      <p className="max-w-sm text-gray-600">Create a term to start building its class schedule. Rooms are blocked from booking during scheduled classes.</p>
      <button type="button" onClick={() => setOpen(true)} className="rounded-md bg-accent-1 px-8 py-2 text-lg font-bold text-white hover:opacity-90">
        New Term
      </button>
      {open && <NewTermDialog onClose={() => setOpen(false)} />}
    </div>
  );
}
