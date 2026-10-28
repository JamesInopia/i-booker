import { ADMIN_ROLES, type Role } from "./session";

const EVERYONE: Role[] = ["requestor", ...ADMIN_ROLES];

export const NAV_ITEMS: { href: string; label: string; roles: Role[] }[] = [
  { href: "/admin-dashboard", label: "Admin Dashboard", roles: ADMIN_ROLES },
  { href: "/booking", label: "Booking", roles: EVERYONE },
  { href: "/booking-status", label: "Booking Status", roles: EVERYONE },
  { href: "/reservation-archives", label: "Booking Archives", roles: ADMIN_ROLES },
];

export type PageTab = { id: string; label: string; roles: Role[] };
export type PageTabGroup = { path: string; tabs: PageTab[] };

export const PAGE_TABS: PageTabGroup[] = [
  {
    path: "/admin-dashboard",
    tabs: [
      { id: "schedule", label: "Schedule", roles: ADMIN_ROLES },
      { id: "review", label: "Review", roles: ADMIN_ROLES },
      { id: "accounts", label: "Accounts", roles: ADMIN_ROLES },
    ],
  },
  {
    path: "/booking",
    tabs: [
      { id: "booking", label: "Booking", roles: EVERYONE },
      { id: "manage-rooms", label: "Manage Rooms", roles: ADMIN_ROLES },
    ],
  },
];

export function tabGroupsFor(role: Role): PageTabGroup[] {
  return PAGE_TABS.map((g) => ({ path: g.path, tabs: g.tabs.filter((t) => t.roles.includes(role)) })).filter(
    (g) => g.tabs.length > 1,
  );
}

export function resolveTab(path: string, role: Role, requested?: string | null): PageTab {
  const group = PAGE_TABS.find((g) => g.path === path);
  if (!group) throw new Error(`No tabs configured for ${path}`);
  const allowed = group.tabs.filter((t) => t.roles.includes(role));
  return allowed.find((t) => t.id === requested) ?? allowed[0];
}
