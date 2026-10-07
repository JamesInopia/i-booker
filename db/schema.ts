import { sql } from "drizzle-orm";
import { numeric, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const customers = pgTable("customers", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  balance: numeric("balance", { precision: 10, scale: 2, mode: "number" }).notNull().default(0),
  lastPaid: text("last_paid").notNull().default("never"),
}).enableRLS();

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull(),
  role: text("role").notNull().default("client"),
}, (table) => [
  uniqueIndex("profiles_one_admin").on(table.role).where(sql`${table.role} = 'admin'`),
]).enableRLS();

export const entries = pgTable("entries", {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: text("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    amount: numeric("amount", { precision: 10, scale: 2, mode: "number" }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
}).enableRLS();