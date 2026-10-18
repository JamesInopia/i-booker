import { pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { ROLES } from "../lib/session";

export * from "./auth-schema";

export const appRole = pgEnum("app_role", ROLES);

export const roleAssignments = pgTable("role_assignments", {
  email: text("email").primaryKey(),
  role: appRole("role").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
