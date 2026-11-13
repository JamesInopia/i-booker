"use client";

import { useEffect } from "react";

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
        } else if (res.status === 401) {
          done = true;
          window.location.replace("/login");
        }
      } catch {
        // either the user is offline or the serveris restarting
      }
    }

    const id = window.setInterval(check, 30_000);
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
