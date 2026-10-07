import { cookies } from "next/headers";
import { SESSION_COOKIE, safeNext, verifySessionToken } from "@/lib/session";
import { signOut } from "./actions";
import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const { next } = await searchParams;
  const session = await verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value);

  return (
    <main className="px-16 py-8">
      <h1 className="text-4xl font-bold">Login page</h1>
      {session && (
        <form action={signOut} className="mt-4">
          <span className="mr-4 text-neutral-500">
            Signed in as {session.email} ({session.role})
          </span>
          <button className="underline">Sign out</button>
        </form>
      )}
      <LoginForm next={safeNext(Array.isArray(next) ? next[0] : next) ?? ""} />
    </main>
  );
}
