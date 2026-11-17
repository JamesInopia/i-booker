"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useFormStatus } from "react-dom";
import { LoadingScreen } from "./loading-screen";

/*
 * One loading overlay for every in-between process (saving, booking, deleting, switching
 * tabs, ...). Anything that is "busy" holds the overlay; it shows while at least one holder
 * exists. Use `usePendingScreen(pending)`, `<FormPendingSignal />` or `useTrackedRouter()`.
 *
 * - The overlay waits SHOW_DELAY before appearing, so instant actions do not flash it.
 * - Once shown it stays at least MIN_VISIBLE, so it never flickers.
 * - While a route-level fallback (`(app)/loading.tsx`) is on screen the overlay stays hidden,
 *   so there are never two loaders on top of each other.
 */
const SHOW_DELAY = 120;
const MIN_VISIBLE = 600;
const NAV_TIMEOUT = 15_000;

type Holder = () => () => void;
type LoadingContextValue = { hold: Holder; holdRoute: Holder };
const LoadingContext = createContext<LoadingContextValue | null>(null);

function useCounter(): [number, Holder] {
  const [count, setCount] = useState(0);
  const hold = useCallback(() => {
    setCount((n) => n + 1);
    return () => setCount((n) => Math.max(0, n - 1));
  }, []);
  return [count, hold];
}

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [busy, hold] = useCounter();
  const [route, holdRoute] = useCounter();
  const [visible, setVisible] = useState(false);
  const shownAt = useRef(0);

  const wanted = busy > 0;
  useEffect(() => {
    if (wanted === visible) return;
    if (wanted) {
      const timer = setTimeout(() => {
        shownAt.current = Date.now();
        setVisible(true);
      }, SHOW_DELAY);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(
      () => setVisible(false),
      Math.max(0, shownAt.current + MIN_VISIBLE - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [wanted, visible]);

  const value = useMemo(() => ({ hold, holdRoute }), [hold, holdRoute]);

  return (
    <LoadingContext.Provider value={value}>
      {children}
      <Suspense fallback={null}>
        <NavigationTracker />
      </Suspense>
      {visible && route === 0 && <LoadingScreen />}
    </LoadingContext.Provider>
  );
}

/** Keep the loading overlay up while `pending` is true. */
export function usePendingScreen(pending: boolean) {
  const ctx = useContext(LoadingContext);
  useEffect(() => {
    if (!pending || !ctx) return;
    return ctx.hold();
  }, [pending, ctx]);
}

/** Drop inside a <form>: any action the form submits (including per-button formAction) shows the overlay. */
export function FormPendingSignal() {
  const { pending } = useFormStatus();
  usePendingScreen(pending);
  return null;
}

/** Used by (app)/loading.tsx so the overlay steps aside while the route fallback is visible. */
export function RouteLoadingScreen() {
  const ctx = useContext(LoadingContext);
  useLayoutEffect(() => ctx?.holdRoute(), [ctx]);
  return <LoadingScreen />;
}

/**
 * Drop-in for `useRouter()`: same methods, but push/replace/refresh run in a transition and
 * show the overlay until the navigation has finished.
 */
export function useTrackedRouter() {
  const router = useRouter();
  const [pending, start] = useTransition();
  usePendingScreen(pending);

  return useMemo(
    () => ({
      ...router,
      push: (...args: Parameters<typeof router.push>) => start(() => router.push(...args)),
      replace: (...args: Parameters<typeof router.replace>) => start(() => router.replace(...args)),
      refresh: () => start(() => router.refresh()),
    }),
    [router],
  );
}

/**
 * Shows the overlay from the click on an in-app link until the URL changes, which covers every
 * <Link>/<a> without touching each one (tabs, month pickers, table links, ...).
 * Opt a link out with data-loading="off" (e.g. links that only open a dialog).
 */
function NavigationTracker() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const here = search ? `${pathname}?${search}` : pathname;

  // `from` is the URL the user was on when they clicked; reset as soon as the URL changes.
  const [state, setState] = useState<{ here: string; from: string | null }>({ here, from: null });
  if (state.here !== here) setState({ here, from: null });
  const pending = state.from !== null && state.from === here;

  const hereRef = useRef(here);
  useEffect(() => {
    hereRef.current = here;
  }, [here]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link || link.dataset.loading === "off" || link.hasAttribute("download")) return;
      if (link.target && link.target !== "_self") return;

      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname.startsWith("/api/")) return;
      const target = url.search ? `${url.pathname}${url.search}` : url.pathname;
      if (target === hereRef.current) return;

      setState((s) => ({ ...s, from: hereRef.current }));
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // Safety net: never leave the overlay up if a navigation was cancelled or never happened.
  useEffect(() => {
    if (!pending) return;
    const timer = setTimeout(() => setState((s) => ({ ...s, from: null })), NAV_TIMEOUT);
    return () => clearTimeout(timer);
  }, [pending]);

  usePendingScreen(pending);
  return null;
}
