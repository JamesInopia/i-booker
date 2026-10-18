"use client";

import { useState } from "react";
import { FcGoogle } from "react-icons/fc";
import { authClient } from "@/lib/auth-client";

const DOMAIN = "@iacademy.edu.ph";
const INPUT =
  "mt-1 block h-10 w-full rounded-md border border-accent-4 bg-container px-3 font-normal outline-none focus:border-accent-1";

export function LoginForm({ next, failed }: { next: string; failed: boolean }) {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState(failed ? `Sign-in failed. Use your ${DOMAIN} account.` : "");

  const callbackURL = next ? `/auth/continue?next=${encodeURIComponent(next)}` : "/auth/continue";

  async function goToGoogle(loginHint?: string) {
    setMessage("");
    setPending(true);

    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL,
      errorCallbackURL: "/login?error=1",
      ...(loginHint ? { additionalParams: { login_hint: loginHint } } : {}),
    });

    if (error) {
      setMessage("Could not start Google sign-in. Please try again.");
      setPending(false);
    }
  }

  function logIn(e: React.FormEvent) {
    e.preventDefault();
    const address = email.trim().toLowerCase();
    if (!address.endsWith(DOMAIN)) {
      setMessage(`Use your ${DOMAIN} email.`);
      return;
    }
    void goToGoogle(address);
  }

  return (
    <form onSubmit={logIn} className="mt-10 flex w-72 flex-col gap-4">
      <label className="text-sm font-semibold">
        iAcademy Email
        <input
          name="email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className={INPUT}
        />
      </label>

      <label className="text-sm font-semibold">
        Password
        <input type="password" autoComplete="off" className={INPUT} />
      </label>

      {message && <p className="text-sm text-accent-2">{message}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-4 w-3/4 self-center rounded-full bg-accent-1 py-3 text-sm font-semibold text-white disabled:opacity-50"
      >
        {pending ? "Please wait" : "Log in"}
      </button>

      <div className="mt-2 flex items-center gap-3 text-sm text-gray-400">
        <span className="h-px flex-1 bg-gray-300" />
        or
        <span className="h-px flex-1 bg-gray-300" />
      </div>

      <button
        type="button"
        onClick={() => void goToGoogle()}
        disabled={pending}
        className="flex w-3/4 items-center justify-center gap-2 self-center rounded-full border border-gray-300 bg-white py-3 text-sm font-semibold text-black hover:bg-gray-50 disabled:opacity-50"
      >
        <FcGoogle size={18} />
        Sign in with Google
      </button>
    </form>
  );
}