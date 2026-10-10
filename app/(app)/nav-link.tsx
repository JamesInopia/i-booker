"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`ml-3 block rounded-l-full py-3 pl-6 pr-3 text-xl font-bold leading-tight ${
        active ? "bg-background text-black" : "text-white hover:bg-white/10"
      }`}
    >
      {children}
    </Link>
  );
}