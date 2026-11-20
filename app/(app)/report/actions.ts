"use server";

import { randomUUID } from "node:crypto";
import { db } from "@/db";
import { reports } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { notifyReportSubmitted } from "@/lib/notifications";
import { storageClient as storage } from "@/lib/report-storage";
import {
  REPORT_MAX_LENGTH,
  REPORT_NATURES,
  REPORT_BUCKET,
  REPORT_IMAGES_TYPES,
  REPORT_MAX_TOTAL_BYTES,
  REPORT_MAX_FILES,
} from "@/lib/report";

export type ReportResult = { ok: true } | { ok: false; error: string };

function looksLikeImage(mime: string, b: Buffer): boolean {
  if (mime === "image/png")
    return (
      b.length >= 8 &&
      b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    );
  if (mime === "image/jpeg")
    return b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  if (mime === "image/gif")
    return b.length >= 4 && b.subarray(0, 4).toString("ascii") === "GIF8";
  if (mime === "image/webp")
    return (
      b.length >= 12 &&
      b.subarray(0, 4).toString("ascii") === "RIFF" &&
      b.subarray(8, 12).toString("ascii") === "WEBP"
    );
  return false;
}

export async function submitReport(formData: FormData): Promise<ReportResult> {
  const user = await requireUser();
  const nature = String(formData.get("nature") ?? "");
  const description = String(formData.get("description") ?? "");

  if (!REPORT_NATURES.some((n) => n.value === nature))
    return { ok: false, error: "Choose the nature of the report." };
  if (!description) return { ok: false, error: "Describe the problem." };
  if (description.length > REPORT_MAX_LENGTH)
    return {
      ok: false,
      error: `Description is too long. (max ${REPORT_MAX_LENGTH} characters).`,
    };

  const files = formData
    .getAll("attachments")
    .filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > REPORT_MAX_FILES)
    return {
      ok: false,
      error: `You can attach up to ${REPORT_MAX_FILES} images.`,
    };
  if (files.reduce((sum, f) => sum + f.size, 0) > REPORT_MAX_TOTAL_BYTES)
    return {
      ok: false,
      error: `Attachments are too large (max ${REPORT_MAX_TOTAL_BYTES} MB in total).`,
    };

  const prepared: { path: string; bytes: Buffer; mime: string }[] = [];
  for (const file of files) {
    const ext = REPORT_IMAGES_TYPES[file.type];
    const bytes = Buffer.from(await file.arrayBuffer());
    if (!ext || !looksLikeImage(file.type, bytes))
      return {
        ok: false,
        error: "Only PNG, JPEG, WebP and GIF images can be attached.",
      };
    prepared.push({
      path: `${user.id}/${randomUUID()}.${ext}`,
      bytes,
      mime: file.type,
    });
  }

  const uploaded: string[] = [];
  try {
    if (prepared.length) {
      const client = storage();
      for (const p of prepared) {
        const { error } = await client.storage
          .from(REPORT_BUCKET)
          .upload(p.path, p.bytes, { contentType: p.mime, upsert: false });
        if (error) throw new Error(error.message);
        uploaded.push(p.path);
      }
    }
    const [created] = await db
      .insert(reports)
      .values({ userId: user.id, nature, description, attachments: uploaded })
      .returning({ id: reports.reportId });
    // Best effort: failing to notify must never make the report look like it failed to send.
    await notifyReportSubmitted({ id: created.id, nature, description }, user);
  } catch (err) {
    console.error("submitReport failed:", err);
    if (uploaded.length)
      await storage()
        .storage.from(REPORT_BUCKET)
        .remove(uploaded)
        .catch(() => {});
    return {
      ok: false,
      error: "Could not send your report. Please try again...",
    };
  }

  return { ok: true };
}
