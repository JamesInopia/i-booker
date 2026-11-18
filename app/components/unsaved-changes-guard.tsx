"use client";

import { useEffect, useState } from "react";
import { useTrackedRouter } from "./loading-provider";

export function UnsavedChangesGuard({
  dirty,
  message = "You have unsaved changes. If you leave now, they will be lost.",
}: {
  dirty: boolean;
  message?: string;
}) {
  const router = useTrackedRouter();
  const [target, setTarget] = useState<string | null>();

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  useEffect(() => {
    if (!dirty) return;
    const onClick = (e: MouseEvent) => {
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      )
        return;
      const link = (e.target as Element | null)?.closest<HTMLAnchorElement>(
        "a[href]",
      );
      if (
        !link ||
        (link.target && link.target !== "_self") ||
        link.hasAttribute("download")
      )
        return;

      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      const here = window.location.pathname + window.location.search;
      if (url.pathname + url.search === here) return;

      // Block the navigation completely. Listening on `window` in the capture phase runs before
      // every document-level listener (including the loading overlay's link tracker) and before
      // React/Next <Link> handlers, so nothing starts navigating or shows a loader behind the dialog.
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      setTarget(url.pathname + url.search + url.hash);
    };
    window.addEventListener("click", onClick, true);
    return () => window.removeEventListener("click", onClick, true);
  }, [dirty]);

  useEffect(() => {
    if (!target) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setTarget(null);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [target]);

  if (!target) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="unsaved-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={() => setTarget(null)}
    >
      <div
        className="w-full max-w-sm rounded-xl bg-container p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="unsaved-title" className="text-lg font-bold">
          Leave without saving?
        </h2>
        <p className="mt-2 text-sm">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            autoFocus
            onClick={() => setTarget(null)}
            className="rounded-lg border border-accent-6 px-5 py-2 text-sm font-semibold hover:bg-accent-5"
          >
            Stay
          </button>
          <button
            type="button"
            onClick={() => {
              const go = target;
              setTarget(null);
              router.push(go);
            }}
            className="rounded-lg bg-accent-2 px-5 py-2 text-sm font-semibold text-white hover:brightness-110"
          >
            Leave
          </button>
        </div>
      </div>
    </div>
  );
}
