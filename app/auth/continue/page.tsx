import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { ROLE_HOME, safeNext } from "@/lib/session";

export default async function ContinuePage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const { next } = await searchParams;
  const user = await requireUser();
  redirect(safeNext(Array.isArray(next) ? next[0] : next) ?? ROLE_HOME[user.role]);
}
