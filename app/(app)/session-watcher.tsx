"use client";

import { useEffect } from "react";
import { SESSION_POLL_MS } from "@/lib/session";

export function SessionWatcher() {
  useEffect(() => {
    let done = false;

    async function check() {
      if (done) return;

      try {
        const res = await fetch("/api/session-status", { cache: "no-store" });
        if (res.status === 403) {
          done = true;
          window.location.replace("/login?suspended=1");
        } else if (res.status === 409) {
          // Another device logged in. The login page shows "Logging in with different device".
          done = true;
          window.location.replace("/login?displaced=1");
        } else if (res.status === 401) {
          done = true;
          window.location.replace("/login");
        }
      } catch {
        // either the user is offline or the server is restarting
      }
    }

    void check();
    const id = window.setInterval(check, SESSION_POLL_MS);
    const onVisible = () =>
      document.visibilityState === "visible" && void check();
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
