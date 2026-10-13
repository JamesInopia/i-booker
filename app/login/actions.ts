"use server";
import { redirect } from "next/navigation";
import { isRole, ROLE_HOME, safeNext } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { message: string; email: string };

export async function authenticate(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    if (error?.code === "email_not_confirmed") return { message: "This account's email is not confirmed yet.", email };
    if (!error || error.code === "invalid_credentials") return { message: "Invalid email or password.", email };
    return { message: "Could not sign in. Please try again.", email };
  }

  const { data: profile } = await supabase.from("users").select("role").eq("user_id", data.user.id).maybeSingle();
  if (!profile || !isRole(profile.role)) {
    await supabase.auth.signOut();
    return { message: "This account has no profile yet. Run the mock-account seed or ask an admin.", email };
  }

  redirect(safeNext(form.get("next")) ?? ROLE_HOME[profile.role]);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
