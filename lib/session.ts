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

// Session security (see lib/session-rotation.ts and lib/better-auth.ts).
/** A session token is replaced once it is this old (checked on every status poll). */
export const SESSION_ROTATE_AFTER_MS = 3 * 60 * 1000;
/** The previous token keeps working this long after a rotation, so in-flight requests don't fail. */
export const SESSION_ROTATE_GRACE_MS = 60 * 1000;
/** A login can never last longer than this, however much it is rotated. */
export const SESSION_MAX_MS = 30 * 24 * 60 * 60 * 1000;
/** How often an open page asks the server whether it is still the active device. */
export const SESSION_POLL_MS = 15 * 1000;
