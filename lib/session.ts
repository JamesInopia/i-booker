export const ROLES = ["requestor", "admin_liaison", "admin_supervisor", "admin_developer"] as const;
export type Role = (typeof ROLES)[number];

/** Run the bookings side of the system: review, schedule, mark days, archives, manage rooms. */
export const ADMIN_ROLES: Role[] = ["admin_liaison", "admin_supervisor"];
/** May open the admin dashboard at all. Which tabs they get is decided in lib/nav.ts. */
export const DASHBOARD_ROLES: Role[] = [...ADMIN_ROLES, "admin_developer"];
/** May open the Accounts tab. Who they may change is decided by `canModifyAccount`. */
export const ACCOUNT_MANAGER_ROLES: Role[] = ["admin_supervisor", "admin_developer"];
/** May open the Reports tab (bug reports sent in through "Report a Problem"). */
export const REPORT_ROLES: Role[] = ["admin_developer", "admin_supervisor"];

const MODIFIABLE: Partial<Record<Role, Role[]>> = {
  admin_supervisor: ["admin_developer", "admin_liaison", "requestor"],
  admin_developer: ["admin_liaison", "requestor"],
};
const GRANTABLE: Partial<Record<Role, Role[]>> = {
  admin_supervisor: ["admin_developer", "admin_liaison"],
  admin_developer: ["admin_liaison"],
};
export const canModifyAccount = (actor: Role, target: Role): boolean => MODIFIABLE[actor]?.includes(target) ?? false;
export const canGrantRole = (actor: Role, role: Role): boolean => GRANTABLE[actor]?.includes(role) ?? false;

export const ROLE_LABEL: Record<Role, string> = {
  requestor: "Requestor",
  admin_liaison: "Admin Liaison",
  admin_supervisor: "Admin Supervisor",
  admin_developer: "Admin Developer",
};

export const ROLE_HOME: Record<Role, string> = {
  requestor: "/booking",
  admin_liaison: "/admin-dashboard",
  admin_supervisor: "/admin-dashboard",
  admin_developer: "/admin-dashboard",
};

export const isRole = (value: unknown): value is Role => typeof value === "string" && (ROLES as readonly string[]).includes(value);

export function safeNext(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return null;
  if (value === "/login" || value.startsWith("/login?") || value.startsWith("/login/")) return null;
  return value;
}

// Session security (see lib/session-rotation.ts and lib/better-auth.ts).
/** A session token is replaced once it is this old (checked on every status poll). */
export const SESSION_ROTATE_AFTER_MS = 3 * 60 * 1000;
/** The previous token keeps working this long after a rotation, so in-flight requests don't fail. */
export const SESSION_ROTATE_GRACE_MS = 60 * 1000;
/** A login can never last longer than this, however much it is rotated. */
export const SESSION_MAX_MS = 7 * 24 * 60 * 60 * 1000;
/** How often an open page asks the server whether it is still the active device. */
export const SESSION_POLL_MS = 15 * 1000;
