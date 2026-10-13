import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { isRole, ROLE_HOME, type Role } from "@/lib/session";

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

export const getClaims = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims().catch(() => ({ data: null }));
  return data?.claims ?? null;
});


export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const claims = await getClaims();
  if (!claims) return null;

  const supabase = await createClient();
  const { data: row } = await supabase.from("users").select("name, role").eq("user_id", claims.sub).maybeSingle();
  if (!row || !isRole(row.role)) return null;

  return { id: claims.sub, email: claims.email ?? "", name: row.name, role: row.role };
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(...roles: Role[]): Promise<CurrentUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect(ROLE_HOME[user.role]);
  return user;
}
