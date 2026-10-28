export const ROLES = ["requestor", "admin_liaison", "admin_supervisor"] as const;
export type Role = (typeof ROLES)[number];

export const ADMIN_ROLES: Role[] = ["admin_liaison", "admin_supervisor"];

export const ROLE_LABEL: Record<Role, string> = {
  requestor: "Requestor",
  admin_liaison: "Admin Liaison",
  admin_supervisor: "Admin Supervisor",
};

export const ROLE_HOME: Record<Role, string> = {
  requestor: "/booking",
  admin_liaison: "/admin-dashboard",
  admin_supervisor: "/admin-dashboard",
};

export const isRole = (value: unknown): value is Role => typeof value === "string" && (ROLES as readonly string[]).includes(value);

export function safeNext(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return null;
  if (value === "/login" || value.startsWith("/login?") || value.startsWith("/login/")) return null;
  return value;
}
