import type { Role } from "@/lib/session";

export type AccountRow = {
  email: string;
  shortId: string;
  name: string;
  role: Role;
  suspended: boolean;
  suspendedUntilLabel: string | null;
  suspensionReason: string | null;
};

export const LEVEL_LABEL: Record<Role, string> = {
  admin_supervisor: "Admin - Supervisor",
  admin_liaison: "Admin - Liaison",
  requestor: "Requestor",
};

export const LEVEL_COLOR: Record<Role, string> = {
  admin_supervisor: "text-purple-600",
  admin_liaison: "text-sky-500",
  requestor: "text-black",
};

export const MAX_SUSPENSION_DAYS = 365;
