import "server-only";
import { createClient } from "@supabase/supabase-js";
import { REPORT_BUCKET } from "./report";

/** Server-only Supabase client with the secret key. Never import this from client code. */
export function storageClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) throw new Error("Supabase storage is not configured.");
  return createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } });
}

const URL_TTL_SECONDS = 60 * 60;

/** Short-lived links to the screenshots on a report. Anything that can't be signed is left out. */
export async function signAttachmentUrls(paths: string[]): Promise<string[]> {
  if (paths.length === 0) return [];
  try {
    const { data } = await storageClient().storage.from(REPORT_BUCKET).createSignedUrls(paths, URL_TTL_SECONDS);
    return (data ?? []).flatMap((d) => (d.signedUrl ? [d.signedUrl] : []));
  } catch (err) {
    console.error("signAttachmentUrls failed:", err);
    return [];
  }
}

/** Best effort: a leftover file must never block deleting the report itself. */
export async function removeAttachments(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  try {
    await storageClient().storage.from(REPORT_BUCKET).remove(paths);
  } catch (err) {
    console.error("removeAttachments failed:", err);
  }
}
