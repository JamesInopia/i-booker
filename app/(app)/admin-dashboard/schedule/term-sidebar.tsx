"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DeleteTermDialog, Footer, NewTermDialog, Shell } from "./dialogs";
import type { TermRow } from "./types";

export function TermSidebar({ terms, selectedId, dirty = false }: { terms: TermRow[]; selectedId: number | null; dirty?: boolean }) {
  const router = useRouter();
  const [dialog, setDialog] = useState<"new" | "delete" | null>(null);
  const [leaving, setLeaving] = useState<(() => void) | null>(null);
  const guard = (go: () => void) => (dirty ? setLeaving(() => go) : go());
  const selected = terms.find((t) => t.id === selectedId) ?? null;

  return (
    <aside className="flex w-full flex-col rounded-lg bg-container p-4 shadow-sm lg:sticky lg:top-20 lg:h-[calc(100vh-6rem)] lg:w-64 lg:shrink-0 lg:self-start lg:overflow-y-auto">
      <div className="flex flex-col gap-2">
        <button type="button" onClick={() => guard(() => setDialog("new"))} className="rounded-md bg-accent-1 py-2 font-bold text-white hover:opacity-90">
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

      <hr className="mt-4 border-neutral-300" />

      <h2 className="mt-4 text-lg font-bold">Terms set:</h2>
      <ul className="mt-3 flex flex-1 flex-col gap-2">
        {terms.map((t) => {
          const active = t.id === selectedId;
          return (
            <li key={t.id}>
              <Link
                href={{ pathname: "/admin-dashboard", query: { tab: "schedule", term: t.id } }}
                aria-current={active ? "true" : undefined}
                onClick={(e) => {
                  if (dirty && !active) {
                    e.preventDefault();
                    guard(() => router.push(`/admin-dashboard?tab=schedule&term=${t.id}`));
                  }
                }}
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

      {leaving && (
        <Shell
          title="Leave without saving?"
          description="You have unsaved changes to this term. If you continue, they'll be discarded."
          onClose={() => setLeaving(null)}
          pending={false}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const go = leaving;
              setLeaving(null);
              go();
            }}
          >
            <Footer pending={false} error="" onClose={() => setLeaving(null)} confirmLabel="Discard and continue" pendingLabel="" tone="danger" />
          </form>
        </Shell>
      )}
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
