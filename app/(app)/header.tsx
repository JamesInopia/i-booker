"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { signOut } from "@/app/login/actions";
import type { PageTabGroup } from "@/lib/nav";
import type { NotificationsPayload } from "@/lib/notification-types";
import { FormPendingSignal } from "../components/loading-provider";
import { NotificationBell } from "./notification-bell";
import { createPortal } from "react-dom";
import { FiMenu } from "react-icons/fi";
import { MdLogout, MdWarning } from "react-icons/md";
import { useNavDrawer } from "./nav-drawer";
import { ReportDialog } from "./report/report-dialog";

function Tabs({
  groups,
  variant,
}: {
  groups: PageTabGroup[];
  /** `inline`: inside the header bar (lg and up). `strip`: a row under the bar that scrolls sideways (below lg). */
  variant: "inline" | "strip";
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const group = groups.find((g) => g.path === pathname);
  if (!group) return null;

  const requested = searchParams.get("tab");
  // On a tab they can open but isn't in their tab bar, none of the visible tabs is highlighted.
  const activeId =
    group.tabs.find((t) => t.id === requested)?.id ??
    (requested && group.hidden.includes(requested) ? null : group.tabs[0].id);

  const strip = variant === "strip";

  return (
    <nav
      aria-label="Page tabs"
      className={
        strip
          ? "flex gap-6 overflow-x-auto border-t border-accent-4 px-4 pt-2 sm:gap-10 sm:px-6 lg:hidden"
          : "hidden gap-12 lg:flex"
      }
    >
      {group.tabs.map((t) => {
        const active = t.id === activeId;
        return (
          <Link
            key={t.id}
            href={{ pathname: group.path, query: { tab: t.id } }}
            aria-current={active ? "page" : undefined}
            className={`shrink-0 whitespace-nowrap border-b-2 pb-1 ${strip ? "text-lg" : "text-2xl"} ${
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
  const [reporting, setReporting] = useState(false);
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
    <div ref={ref} className="relative flex min-w-0 items-center gap-2 sm:gap-4">
      <span className="min-w-0 max-w-44 truncate text-xs font-bold uppercase sm:max-w-64 sm:text-sm lg:max-w-none lg:text-lg">
        {name}
      </span>
      <button
        type="button"
        aria-label="Profile menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="shrink-0 rounded-full focus:outline-2 focus:outline-offset-2 focus:outline-accent-1"
      >
        <svg viewBox="0 0 24 24" className="h-8 w-8 sm:h-9 sm:w-9" aria-hidden="true">
          <circle cx="12" cy="12" r="12" fill="currentColor" />
          <circle cx="12" cy="9.5" r="3.6" fill="white" />
          <path
            d="M5.2 19.2c1.2-3.3 3.9-5 6.8-5s5.6 1.7 6.8 5A11.9 11.9 0 0 1 12 24a11.9 11.9 0 0 1-6.8-4.8Z"
            fill="white"
          />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-2 w-52 rounded-lg bg-container py-1 shadow-lg ring-1 ring-black/10"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              setReporting(true);
            }}
            className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-accent-2 hover:bg-accent-4"
          >
            <MdWarning aria-hidden="true" className="h-5 w-5 shrink-0" />
            Report a Problem
          </button>
          <form action={signOut}>
            <FormPendingSignal />
            <button
              role="menuitem"
              className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm hover:bg-accent-4"
            >
              <MdLogout aria-hidden="true" className="h-5 w-5 shrink-0" />
              Log out
            </button>
          </form>
        </div>
      )}

      {reporting &&
        createPortal(
          <ReportDialog onClose={() => setReporting(false)} />,
          document.body,
        )}
    </div>
  );
}

export function Header({
  tabGroups,
  name,
  notifications,
}: {
  tabGroups: PageTabGroup[];
  name: string;
  notifications: NotificationsPayload;
}) {
  const { open, toggle, triggerRef } = useNavDrawer();

  return (
    <header className="sticky top-0 z-30 shrink-0 bg-container">
      <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:gap-8 lg:px-10">
        {/* Opens the sidebar drawer. Only exists below lg; from lg up the sidebar is always on screen. */}
        <button
          ref={triggerRef}
          type="button"
          data-tour="menu-button"
          aria-label="Open menu"
          aria-controls="app-nav"
          aria-expanded={open}
          onClick={toggle}
          className="-ml-2 grid h-10 w-10 shrink-0 place-items-center rounded-full text-2xl hover:bg-accent-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-1 lg:hidden"
        >
          <FiMenu aria-hidden="true" />
        </button>

        <Suspense fallback={<div />}>
          <Tabs groups={tabGroups} variant="inline" />
        </Suspense>
        <div className="relative ml-auto flex min-w-0 items-center gap-2 sm:gap-5">
          <NotificationBell initial={notifications} />
          <ProfileMenu name={name} />
        </div>
      </div>

      {/* Below lg the page tabs get their own row so they have room (nothing renders on pages without tabs). */}
      <Suspense fallback={null}>
        <Tabs groups={tabGroups} variant="strip" />
      </Suspense>
    </header>
  );
}
