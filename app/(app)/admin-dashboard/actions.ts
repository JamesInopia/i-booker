"use server";

import { sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { requireRole } from "@/lib/auth";
import { ADMIN_ROLES } from "@/lib/session";
import { CLASS_CANCELLED_NAME, needsNote } from "../calendar/day-marks";
import { parseDate } from "../calendar/dates";

type DayTypeDef = { description: string; isClassDay: boolean; allowBooking: boolean; color: string; aliases?: string[] };
const DAY_TYPES: Record<"holiday" | "class_cancelled" | "no_classes" | "no_booking", DayTypeDef> = {
  holiday: { description: "Holiday", isClassDay: false, allowBooking: false, color: "#d8463b" },
  class_cancelled: { description: CLASS_CANCELLED_NAME, isClassDay: false, allowBooking: true, color: "#ffac4e" },
  no_classes: { description: "No Classes", isClassDay: false, allowBooking: true, color: "#9ca3af" },
  no_booking: { description: "No Booking", isClassDay: true, allowBooking: false, color: "#7c3aed", aliases: ["No Booking Allowed"] },
};

const MAX_NOTE = 120;
const NOTE_REQUIRED = { holiday: "Enter the holiday's name.", class_cancelled: "Enter the reason classes are cancelled." } as const;

export async function markDay(formData: FormData): Promise<{ error?: string }> {
  await requireRole(...ADMIN_ROLES);

  const date = parseDate(String(formData.get("date") ?? ""));
  if (!date) return { error: "That date isn't valid." };

  const kind = String(formData.get("kind") ?? "");

  try {
    if (kind === "clear") {
      await db.execute(sql`delete from calendar_day where calendar_date = ${date}::date`);
      revalidatePath("/admin-dashboard");
      return {};
    }

    if (!(kind in DAY_TYPES)) return { error: "Choose how to mark this day." };
    const key = kind as keyof typeof DAY_TYPES;
    const type = DAY_TYPES[key];

    const note = needsNote(key) ? String(formData.get("note") ?? "").trim() : "";
    if (needsNote(key) && !note) return { error: NOTE_REQUIRED[key as keyof typeof NOTE_REQUIRED] };
    if (note.length > MAX_NOTE) return { error: `Keep it under ${MAX_NOTE} characters.` };

    const names = [type.description, ...(type.aliases ?? [])];

    await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(74611)`);

      let dayTypeId = (
        await tx.execute<{ id: number }>(sql`
          select day_type_id as id from day_type
          where description in (${sql.join(names.map((n) => sql`${n}::text`), sql`, `)})
            and is_class_day = ${type.isClassDay}::boolean
            and allow_booking = ${type.allowBooking}::boolean
          order by day_type_id limit 1`)
      ).rows[0]?.id;

      if (dayTypeId === undefined) {
        let symbolId = (
          await tx.execute<{ id: number }>(sql`
            select symbol_id as id from symbol where name = ${type.description}::text order by symbol_id limit 1`)
        ).rows[0]?.id;

        if (symbolId === undefined) {
          symbolId = (
            await tx.execute<{ id: number }>(sql`
              insert into symbol (symbol_id, name, color) overriding system value
              values ((select coalesce(max(symbol_id), 0) + 1 from symbol), ${type.description}::text, ${type.color}::text)
              returning symbol_id as id`)
          ).rows[0].id;
          await syncIdentity(tx, "symbol", "symbol_id");
        }

        dayTypeId = (
          await tx.execute<{ id: number }>(sql`
            insert into day_type (day_type_id, symbol_id, description, is_class_day, allow_booking) overriding system value
            values ((select coalesce(max(day_type_id), 0) + 1 from day_type), ${symbolId}::int, ${type.description}::text,
                    ${type.isClassDay}::boolean, ${type.allowBooking}::boolean)
            returning day_type_id as id`)
        ).rows[0].id;
        await syncIdentity(tx, "day_type", "day_type_id");
      }

      await tx.execute(sql`
        insert into calendar_day (calendar_date, day_type_id, remarks)
        values (${date}::date, ${dayTypeId}::int, ${note || null}::text)
        on conflict (calendar_date) do update set day_type_id = excluded.day_type_id, remarks = excluded.remarks`);
    });

    revalidatePath("/admin-dashboard");
    return {};
  } catch (err) {
    const reason = (err as { cause?: { message?: string } })?.cause?.message ?? (err as Error)?.message ?? "unknown error";
    console.error("markDay failed:", err);
    return { error: `Couldn't save the change (${reason}).` };
  }
}

async function syncIdentity(tx: Pick<typeof db, "execute">, table: "symbol" | "day_type", column: "symbol_id" | "day_type_id") {
  await tx.execute(
    sql.raw(`
      select setval(s, (select max(${column}) from ${table}))
      from (select pg_get_serial_sequence('public.${table}', '${column}') as s) q
      where s is not null`),
  );
}
