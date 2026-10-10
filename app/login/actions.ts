"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACCOUNTS } from "@/lib/accounts";
import { createSessionToken, ROLE_HOME, safeNext, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/session";

export type LoginState = { message: string; email: string };

export async function authenticate(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");

  const account = ACCOUNTS.find((a) => a.email.toLowerCase() === email.toLowerCase());
  if (account && !account.password) {
    return { message: "This account has no password yet. Set it in lib/accounts.ts.", email };
  }
  if (!account || account.password !== password) {
    return { message: "Invalid email or password.", email };
  }

  (await cookies()).set(SESSION_COOKIE, await createSessionToken({ email: account.email, role: account.role }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  redirect(safeNext(form.get("next")) ?? ROLE_HOME[account.role]);
}

export async function signOut() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
