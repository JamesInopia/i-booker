import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ROLE_HOME, safeNext } from "@/lib/session";
import { DisplacedOverlay } from "./displaced-overlay";
import { Greeting } from "./greeting";
import { LoginCarousel } from "./login-carousel";
import { LoginForm } from "./login-form";

type SearchParams = Promise<{
  next?: string | string[];
  error?: string | string[];
  suspended?: string | string[];
  displaced?: string | string[];
}>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { next, error, suspended, displaced } = await searchParams;
  const user = await getCurrentUser();
  if (user)
    redirect(
      safeNext(Array.isArray(next) ? next[0] : next) ?? ROLE_HOME[user.role],
    );

  return (
    <main className="login-page relative flex min-h-dvh items-center overflow-hidden bg-linear-to-br from-carousel-from to-carousel-to">
      {displaced && <DisplacedOverlay />}
      <LoginCarousel />

      <section className="login-hex relative z-10 flex flex-col items-center justify-center bg-container">
        <h1 className="login-title text-center font-light">
          Welcome to
          <br />
          <strong className="font-bold">iBooker</strong>!
        </h1>

        <Greeting />

        <LoginForm
          next={safeNext(Array.isArray(next) ? next[0] : next) ?? ""}
          failed={Boolean(error)}
          suspended={Boolean(suspended)}
          displaced={Boolean(displaced)}
        />
      </section>
    </main>
  );
}
