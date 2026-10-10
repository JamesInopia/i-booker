import { cookies } from "next/headers";
import { SESSION_COOKIE, safeNext, verifySessionToken } from "@/lib/session";
import { signOut } from "./actions";
import { LoginForm } from "./login-form";

const HEXAGON = "[clip-path:polygon(0_17%,30%_0,65%_0,100%_20%,100%_80%,65%_100%,30%_100%,0_83%)]";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const { next } = await searchParams;
  const session = await verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value);

  return (
    <main className="min-h-screen bg-linear-to-br from-heading-from to-heading-to">
      <section
        className={`flex min-h-screen w-[52vw] min-w-[26rem] flex-col items-center justify-center bg-container pr-[5%] ${HEXAGON}`}
      >
        <h1 className="text-center text-4xl font-light">
          Welcome to <strong className="font-bold">iBooker</strong>!
        </h1>

        {session && (
          <form action={signOut} className="mt-3 text-sm">
            <span className="mr-3 text-accent-3">Signed in as {session.email}</span>
            <button className="underline">Sign out</button>
          </form>
        )}

        <LoginForm next={safeNext(Array.isArray(next) ? next[0] : next) ?? ""} />
      </section>
    </main>
  );
}
