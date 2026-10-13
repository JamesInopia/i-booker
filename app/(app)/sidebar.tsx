import { NavLink } from "./nav-link";

export function Sidebar({ items }: { items: { href: string; label: string }[] }) {
  return (
    <aside className="sticky top-0 flex h-screen w-56 shrink-0 flex-col">
      <div className="bg-container px-4 py-6">
        <img
          src="/iacademy-cebu-logo.png"
          alt="iACADEMY Cebu - Computing Business Design"
          className="mx-auto h-auto w-40"
        />
      </div>

      <nav aria-label="Main" className="flex flex-1 flex-col bg-linear-to-r from-heading-from to-heading-to pt-8">
        <ul className="flex flex-col gap-5">
          {items.map((item) => (
            <li key={item.href}>
              <NavLink href={item.href}>{item.label}</NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}