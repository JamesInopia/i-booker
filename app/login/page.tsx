import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ROLE_HOME, safeNext } from "@/lib/session";
import { Greeting } from "./greeting";
import { LoginCarousel } from "./login-carousel";
import { LoginForm } from "./login-form";

const HEXAGON = "[clip-path:polygon(0_17%,30%_0,65%_0,100%_20%,100%_80%,65%_100%,30%_100%,0_83%)]";

type SearchParams = Promise<{ next?: string | string[]; error?: string | string[] }>;

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const { next, error } = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(safeNext(Array.isArray(next) ? next[0] : next) ?? ROLE_HOME[user.role]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-linear-to-br from-carousel-from to-carousel-to">
      <LoginCarousel />

      <section
        className={`relative z-10 flex min-h-screen w-[44vw] min-w-[26rem] flex-col items-center justify-center bg-container pr-[5%] ${HEXAGON}`}
      >
        <h1 className="text-center text-5xl font-light">
          Welcome to
          <br />
          <strong className="font-bold">iBooker</strong>!
        </h1>

        <Greeting />

        <LoginForm next={safeNext(Array.isArray(next) ? next[0] : next) ?? ""} failed={Boolean(error)} />
      </section>
    </main>
  );
}