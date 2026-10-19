"use client";

import { useRef, useState } from "react";
import { FcGoogle } from "react-icons/fc";
import { authClient } from "@/lib/auth-client";

const SCHOOL_EMAIL = /^[^\s@]+@iacademy\.edu\.ph$/i;
const HINT = 'Please sign in with your "@iacademy.edu.ph" account';
const INPUT =
  "mt-1 block h-10 w-full rounded-md border border-accent-4 bg-container px-3 font-normal outline-none focus:border-accent-1";

export function LoginForm({ next, failed }: { next: string; failed: boolean }) {
  const [askEmail, setAskEmail] = useState(false);
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState(failed ? 'Sign-in failed. Use your "@iacademy.edu.ph" account.' : "");
  const emailRef = useRef<HTMLInputElement>(null);

  const callbackURL = next ? `/auth/continue?next=${encodeURIComponent(next)}` : "/auth/continue";

  async function goToGoogle(loginHint: string) {
    setPending(true);
    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL,
      errorCallbackURL: "/login?error=1",
      additionalParams: { login_hint: loginHint },
    });
    if (error) {
      setMessage("Could not start Google sign-in. Please try again.");
      setPending(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    if (!askEmail) {
      setAskEmail(true);
      setTimeout(() => emailRef.current?.focus(), 0);
      return;
    }

    const address = email.trim();
    if (!SCHOOL_EMAIL.test(address)) {
      setMessage('Only "@iacademy.edu.ph" emails are allowed.');
      return;
    }
    void goToGoogle(address.toLowerCase());
  }

  return (
    <form onSubmit={onSubmit} noValidate className="mt-12 flex w-[21.5rem] flex-col items-center gap-6">
      {askEmail && (
        <label className="w-full text-sm font-semibold">
          iACADEMY Cebu Email
          <input
            ref={emailRef}
            name="email"
            type="email"
            autoComplete="username"
            placeholder="name@iacademy.edu.ph"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={INPUT}
          />
        </label>
      )}

      <button
        type="submit"
        disabled={pending}
        className="flex w-4/5 items-center justify-center gap-2 rounded-full border border-gray-300 bg-white py-3 text-sm font-semibold text-black hover:bg-gray-50 disabled:opacity-50"
      >
        <FcGoogle size={18} />
        {pending ? "Please wait" : "Sign in with Google"}
      </button>

      <p
        className={`w-full border-b border-gray-300 pb-1 text-center text-xs ${message ? "text-accent-2" : "text-gray-400"}`}
        role={message ? "alert" : undefined}
      >
        {message || HINT}
      </p>
    </form>
  );
}