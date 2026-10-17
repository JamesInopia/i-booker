"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { signOut } from "@/app/login/actions";
import type { PageTabGroup } from "@/lib/nav";

function Tabs({ groups }: { groups: PageTabGroup[] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const group = groups.find((g) => g.path === pathname);
  if (!group) return null;

  const requested = searchParams.get("tab");
  const activeId = group.tabs.find((t) => t.id === requested)?.id ?? group.tabs[0].id;

  return (
    <nav aria-label="Page tabs" className="flex gap-12">
      {group.tabs.map((t) => {
        const active = t.id === activeId;
        return (
          <Link
            key={t.id}
            href={{ pathname: group.path, query: { tab: t.id } }}
            aria-current={active ? "page" : undefined}
            className={`border-b-2 pb-1 text-2xl ${
              active
                ? "border-accent-1 font-bold text-accent-1"
                : "border-transparent text-black hover:text-accent-1"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

function ProfileMenu({ name }: { name: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
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

  return (
    <div ref={ref} className="relative ml-auto flex items-center gap-4">
      <span className="text-lg font-bold uppercase">{name}</span>
      <button
        type="button"
        aria-label="Profile menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="rounded-full focus:outline-2 focus:outline-offset-2 focus:outline-accent-1"
      >
        <svg viewBox="0 0 24 24" className="h-9 w-9" aria-hidden="true">
          <circle cx="12" cy="12" r="12" fill="currentColor" />
          <circle cx="12" cy="9.5" r="3.6" fill="white" />
          <path d="M5.2 19.2c1.2-3.3 3.9-5 6.8-5s5.6 1.7 6.8 5A11.9 11.9 0 0 1 12 24a11.9 11.9 0 0 1-6.8-4.8Z" fill="white" />
        </svg>
      </button>

      {open && (
        <div role="menu" className="absolute right-0 top-full z-20 mt-2 w-44 rounded-lg bg-container py-1 shadow-lg ring-1 ring-black/10">
          <form action={signOut}>
            <button role="menuitem" className="block w-full px-4 py-2 text-left text-sm hover:bg-accent-4">
              Log out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export function Header({ tabGroups, name }: { tabGroups: PageTabGroup[]; name: string }) {
  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between gap-8 bg-container px-10">
      <Suspense fallback={<div />}>
        <Tabs groups={tabGroups} />
      </Suspense>
      <ProfileMenu name={name} />
    </header>
  );
}