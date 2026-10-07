"use client";

import { useActionState } from "react";
import { authenticate } from "./actions";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(authenticate, { message: "", email: "" });

  return (
    <form action={action} className="mt-8 flex w-96 flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <input name="email" type="email" defaultValue={state.email} placeholder="Email" required
        className="border px-4 py-2" />
      <input name="password" type="password" placeholder="Password" required className="border px-4 py-2" />
      {state.message && <p className="text-red-700">{state.message}</p>}
      <button disabled={pending} className="bg-neutral-900 px-4 py-2 text-white disabled:opacity-50">
        {pending ? "Please wait" : "Sign in"}
      </button>
    </form>
  );
}
