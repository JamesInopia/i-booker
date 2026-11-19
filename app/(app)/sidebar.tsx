import { Suspense } from "react";
import { HelpButton } from "./help/help-tour";
import { NavLink } from "./nav-link";

export function Sidebar({ items }: { items: { href: string; label: string }[] }) {
  return (
    // One blue gradient behind the whole sidebar; the logo is white with no background, so it sits straight on it.
    <aside className="sticky top-0 flex h-screen w-56 shrink-0 flex-col bg-linear-to-r from-heading-from to-heading-to">
      <div className="px-4 py-6">
        <img
          src="/iacademy-cebu-logo.svg"
          alt="iACADEMY Cebu - Computing Business Design"
          className="mx-auto h-auto w-40"
        />
      </div>

      <nav aria-label="Main" className="flex flex-1 flex-col pt-8">
        <ul className="flex flex-col gap-5">
          {items.map((item) => (
            <li key={item.href}>
              <NavLink href={item.href}>{item.label}</NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Sits at the bottom of the sidebar. Suspense: it reads the URL to pick the right tour. */}
      <div className="pb-8">
        <Suspense fallback={null}>
          <HelpButton />
        </Suspense>
      </div>
    </aside>
  );
}
