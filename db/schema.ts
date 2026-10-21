import { sql } from "drizzle-orm";
import { boolean, check, date, index, integer, pgEnum, pgTable, primaryKey, text, time, timestamp, uuid } from "drizzle-orm/pg-core";
import { ROLES } from "../lib/session";

export * from "./auth-schema";

export const appRole = pgEnum("app_role", ROLES);
export const requestStatus = pgEnum("request_status", ["pending", "reviewed", "approved", "rejected", "cancelled"]);
export const userRole = pgEnum("user_role", ["requestor", "admin_liaison", "admin_supervisor"]);
export const userStatus = pgEnum("user_status", ["active", "suspended"]);

export const roleAssignments = pgTable("role_assignments", {
  email: text("email").primaryKey(),
  role: appRole("role").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const appUsers = pgTable("users", {
  userId: uuid("user_id").primaryKey(),
  name: text("name").notNull().default(""),
  course: text("course"),
  email: text("email").notNull(),
  role: userRole("role").notNull().default("requestor"),
  status: userStatus("status").notNull().default("active"),
  suspendedUntil: timestamp("suspended_until", { withTimezone: true }),
  suspensionReason: text("suspension_reason"),
});

export const rooms = pgTable("room", {
  roomId: integer("room_id").primaryKey().generatedByDefaultAsIdentity(),
  name: text("room_name").notNull().unique(),
  description: text("description"),
  maxCapacity: integer("max_capacity"),
  prohibitions: text("prohibitions"),
  thumbnail: text("thumbnail"),
  status: text("status").notNull().default("available"),
});

export const activityTypes = pgTable("activity_type", {
  activityTypeId: integer("activity_type_id").primaryKey().generatedByDefaultAsIdentity(),
  symbolId: integer("symbol_id").notNull(),
  name: text("name").notNull(),
  isFormOption: boolean("is_form_option").notNull().default(false),
});

export const reservationRequests = pgTable(
  "reservation_request",
  {
    requestId: integer("request_id").primaryKey().generatedByDefaultAsIdentity(),
    userId: uuid("user_id").notNull().references(() => appUsers.userId, { onDelete: "restrict" }),
    reviewedBy: uuid("reviewed_by").references(() => appUsers.userId, { onDelete: "set null" }),
    decidedBy: uuid("decided_by").references(() => appUsers.userId, { onDelete: "set null" }),
    activityTypeId: integer("activity_type_id").notNull().references(() => activityTypes.activityTypeId),
    natureOther: text("nature_other"),
    requestor: text("requestor").notNull(),
    contactDetails: text("contact_details").notNull(),
    program: text("program"),
    requestDate: timestamp("request_date", { withTimezone: true }).notNull().defaultNow(),
    status: requestStatus("status").notNull().default("pending"),
    liaisonRemarks: text("liaison_remarks"),
    supervisorRemarks: text("supervisor_remarks"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancelReason: text("cancel_reason"),
  },
  (t) => [index("reservation_request_user_id_idx").on(t.userId), index("reservation_request_status_idx").on(t.status)],
);

export const reservationSlots = pgTable(
  "reservation_slot",
  {
    slotId: integer("slot_id").primaryKey().generatedByDefaultAsIdentity(),
    requestId: integer("request_id").notNull().references(() => reservationRequests.requestId, { onDelete: "cascade" }),
    dateOfActivity: date("date_of_activity", { mode: "string" }).notNull(),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
    occupantQuantity: integer("occupant_quantity").notNull(),
    detailsOfActivity: text("details_of_activity"),
  },
  (t) => [
    index("reservation_slot_date_of_activity_idx").on(t.dateOfActivity),
    check("reservation_slot_occupant_quantity_check", sql`${t.occupantQuantity} > 0`),
    check("reservation_slot_time_chk", sql`${t.endTime} > ${t.startTime}`),
  ],
);

export const reservationSlotRooms = pgTable(
  "reservation_slot_room",
  {
    slotId: integer("slot_id").notNull().references(() => reservationSlots.slotId, { onDelete: "cascade" }),
    roomId: integer("room_id").notNull().references(() => rooms.roomId, { onDelete: "restrict" }),
  },
  (t) => [primaryKey({ columns: [t.slotId, t.roomId] })],
);