import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  time,
  timestamp,
} from "drizzle-orm/pg-core";
import { ROLES } from "../lib/session";

import { user } from "./auth-schema";

export * from "./auth-schema";

export const appRole = pgEnum("app_role", ROLES);
export const requestStatus = pgEnum("request_status", [
  "pending",
  "reviewed",
  "approved",
  "rejected",
  "cancelled",
]);
export const roleAssignments = pgTable("role_assignments", {
  email: text("email").primaryKey(),
  role: appRole("role").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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

// Existing Supabase room_pictures table: the primary thumbnail stays in room.thumbnail.
// image_id is assumed to be an integer identity primary key; verify this in Supabase.
export const roomPictures = pgTable("room_pictures", {
  imageId: integer("image_id").primaryKey().generatedByDefaultAsIdentity(),
  roomId: integer("room_id")
    .notNull()
    .references(() => rooms.roomId, { onDelete: "cascade" }),
  imagePath: text("image_path").notNull(),
  sortOrder: integer("sort_order").notNull(),
});

export const activityTypes = pgTable("activity_type", {
  activityTypeId: integer("activity_type_id")
    .primaryKey()
    .generatedByDefaultAsIdentity(),
  symbolId: integer("symbol_id").notNull(),
  name: text("name").notNull(),
  isFormOption: boolean("is_form_option").notNull().default(false),
});

export const reservationRequests = pgTable(
  "reservation_request",
  {
    requestId: integer("request_id")
      .primaryKey()
      .generatedByDefaultAsIdentity(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    reviewedBy: text("reviewed_by").references(() => user.id, {
      onDelete: "set null",
    }),
    decidedBy: text("decided_by").references(() => user.id, {
      onDelete: "set null",
    }),
    activityTypeId: integer("activity_type_id")
      .notNull()
      .references(() => activityTypes.activityTypeId),
    natureOther: text("nature_other"),
    requestor: text("requestor").notNull(),
    contactDetails: text("contact_details").notNull(),
    program: text("program"),
    requestDate: timestamp("request_date", { withTimezone: true })
      .notNull()
      .defaultNow(),
    status: requestStatus("status").notNull().default("pending"),
    liaisonRemarks: text("liaison_remarks"),
    supervisorRemarks: text("supervisor_remarks"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancelReason: text("cancel_reason"),
  },
  (t) => [
    index("reservation_request_user_id_idx").on(t.userId),
    index("reservation_request_status_idx").on(t.status),
  ],
);

export const reservationSlots = pgTable(
  "reservation_slot",
  {
    slotId: integer("slot_id").primaryKey().generatedByDefaultAsIdentity(),
    requestId: integer("request_id")
      .notNull()
      .references(() => reservationRequests.requestId, { onDelete: "cascade" }),
    dateOfActivity: date("date_of_activity", { mode: "string" }).notNull(),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
    occupantQuantity: integer("occupant_quantity").notNull(),
    detailsOfActivity: text("details_of_activity"),
  },
  (t) => [
    index("reservation_slot_date_of_activity_idx").on(t.dateOfActivity),
    check(
      "reservation_slot_occupant_quantity_check",
      sql`${t.occupantQuantity} > 0`,
    ),
    check("reservation_slot_time_chk", sql`${t.endTime} > ${t.startTime}`),
  ],
);

export const reservationSlotRooms = pgTable(
  "reservation_slot_room",
  {
    slotId: integer("slot_id")
      .notNull()
      .references(() => reservationSlots.slotId, { onDelete: "cascade" }),
    roomId: integer("room_id")
      .notNull()
      .references(() => rooms.roomId, { onDelete: "restrict" }),
  },
  (t) => [primaryKey({ columns: [t.slotId, t.roomId] })],
);

export const terms = pgTable(
  "term",
  {
    termId: integer("term_id").primaryKey().generatedByDefaultAsIdentity(),
    name: text("name").notNull(),
    startDate: date("start_date", { mode: "string" }).notNull(),
    endDate: date("end_date", { mode: "string" }).notNull(),
  },
  (t) => [check("term_dates_chk", sql`${t.endDate} >= ${t.startDate}`)],
);

export const classSchedules = pgTable(
  "class_schedule",
  {
    classId: integer("class_schedule_id").primaryKey().generatedByDefaultAsIdentity(),
    termId: integer("term_id").notNull().references(() => terms.termId, { onDelete: "cascade" }),
    roomId: integer("room_id").notNull().references(() => rooms.roomId, { onDelete: "cascade" }),
    activityTypeId: integer("activity_type_id").notNull().references(() => activityTypes.activityTypeId),
    dayOfWeek: integer("day_of_week").notNull(),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
    courseTitle: text("section_code"),
    courseAdviser: text("instructor"),
  },
  (t) => [
    index("class_schedule_term_id_idx").on(t.termId),
    index("class_schedule_room_id_day_of_week_idx").on(t.roomId, t.dayOfWeek),
    check("class_schedule_day_of_week_check", sql`${t.dayOfWeek} between 1 and 7`),
    check("class_schedule_time_chk", sql`${t.endTime} > ${t.startTime}`),
  ],
);
