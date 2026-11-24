"use client";

import { Suspense, useEffect, useRef } from "react";
import { FiX } from "react-icons/fi";
import { HelpButton } from "./help/help-tour";
import { NavLink } from "./nav-link";
import { useNavDrawer } from "./nav-drawer";

export function Sidebar({ items }: { items: { href: string; label: string }[] }) {
  const { open, close } = useNavDrawer();
  const closeRef = useRef<HTMLButtonElement>(null);

  // Opening the drawer moves keyboard focus into it.
  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  return (
    <>
      {/* Dimmed backdrop behind the drawer. Tapping it closes the drawer. Not rendered visibly on lg+. */}
      <div
        aria-hidden="true"
        onClick={() => close(true)}
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-200 motion-reduce:transition-none lg:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/*
        lg and up: docked and sticky, as before.
        Below lg: a drawer fixed to the left edge, off-screen and `invisible` (so its links are not
        focusable) until opened. `data-nav-drawer` lets the help tour tell the two modes apart.
        One blue gradient behind the whole sidebar; the logo is white with no background, so it sits straight on it.
      */}
      <aside
        id="app-nav"
        data-nav-drawer
        data-open={open ? "" : undefined}
        className="invisible fixed inset-y-0 left-0 z-50 flex w-60 max-w-[85vw] -translate-x-full flex-col overflow-y-auto bg-linear-to-r from-heading-from to-heading-to transition-[transform,visibility] duration-200 data-open:visible data-open:translate-x-0 motion-reduce:transition-none lg:visible lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:w-56 lg:max-w-none lg:shrink-0 lg:translate-x-0 lg:overflow-visible lg:transition-none"
      >
        <div className="relative px-4 pb-6 pt-14 lg:pt-6">
          <button
            ref={closeRef}
            type="button"
            onClick={() => close(true)}
            aria-label="Close menu"
            className="absolute left-3 top-3 grid h-10 w-10 place-items-center rounded-full text-2xl text-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white lg:hidden"
          >
            <FiX aria-hidden="true" />
          </button>
          <img
            src="/iacademy-cebu-logo.svg"
            alt="iACADEMY Cebu - Computing Business Design"
            className="mx-auto h-auto w-40"
          />
        </div>

        <nav aria-label="Main" className="flex flex-1 flex-col pt-4 lg:pt-8">
          <ul className="flex flex-col gap-5">
            {items.map((item) => (
              <li key={item.href}>
                <NavLink href={item.href}>{item.label}</NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Sits at the bottom of the sidebar (and of the drawer). Suspense: it reads the URL to pick the right tour. */}
        <div className="pb-8 pt-6">
          <Suspense fallback={null}>
            {/* The tour highlights the page, so the drawer steps aside first. */}
            <HelpButton onStart={() => close()} />
          </Suspense>
        </div>
      </aside>
    </>
  );
}
