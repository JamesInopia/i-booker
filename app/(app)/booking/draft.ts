import "server-only";
import { cookies } from "next/headers";
import { parseDraft, type Draft } from "./rules";

const COOKIE = "booking_draft";
const MAX_AGE_SECONDS = 60 * 60 * 2;
const MAX_ENCODED_LENGTH = 3800;

export async function readDraft(): Promise<Draft | null> {
  return parseDraft((await cookies()).get(COOKIE)?.value);
}

export async function writeDraft(draft: Draft): Promise<boolean> {
  const value = JSON.stringify(draft);
  if (encodeURIComponent(value).length > MAX_ENCODED_LENGTH) return false;
  (await cookies()).set(COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
  return true;
}

export async function clearDraft() {
  (await cookies()).delete(COOKIE);
}
