"use client";

import { useActionState } from "react";
import { authenticate } from "./actions";

const INPUT =
  "mt-1 block h-10 w-full rounded-md border border-accent-4 bg-container px-3 font-normal outline-none focus:border-accent-1";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(authenticate, { message: "", email: "" });

  return (
    <form action={action} className="mt-10 flex w-72 flex-col gap-4">
      <input type="hidden" name="next" value={next} />

      <label className="text-sm font-semibold">
        Student Number or Email Address
        <input name="email" type="text" autoComplete="username" defaultValue={state.email} required className={INPUT} />
      </label>

      <label className="text-sm font-semibold">
        Password
        <input name="password" type="password" autoComplete="current-password" required className={INPUT} />
      </label>

      {state.message && <p className="text-sm text-accent-2">{state.message}</p>}

      <button
        disabled={pending}
        className="mt-4 w-3/5 self-center rounded-xl bg-accent-1 py-3 text-sm font-semibold text-white disabled:opacity-50"
      >
        {pending ? "Please wait" : "Log in"}
      </button>
    </form>
  );
}
