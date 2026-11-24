"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";

/*
 * Below the `lg` breakpoint the sidebar is a slide-in drawer opened from the header's menu button.
 * From `lg` up it is docked and this state is simply unused. The two ends (button in the header,
 * drawer in the sidebar) live in different components, so they share this context.
 */
type NavDrawer = {
  open: boolean;
  toggle: () => void;
  /** `restoreFocus`: hand keyboard focus back to the menu button (Escape, X, backdrop). Not needed after navigating. */
  close: (restoreFocus?: boolean) => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
};

const NavDrawerContext = createContext<NavDrawer | null>(null);

export function useNavDrawer(): NavDrawer {
  const ctx = useContext(NavDrawerContext);
  if (!ctx) throw new Error("useNavDrawer must be used inside <NavDrawerProvider>");
  return ctx;
}

export function NavDrawerProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Remember which page the drawer was opened on: once the URL changes it counts as closed again,
  // so picking a link closes the drawer without an effect.
  const [state, setState] = useState({ open: false, path: pathname });
  const open = state.open && state.path === pathname;
  const triggerRef = useRef<HTMLButtonElement>(null);

  const close = useCallback((restoreFocus = false) => {
    setState((s) => ({ ...s, open: false }));
    if (restoreFocus) triggerRef.current?.focus();
  }, []);
  const toggle = useCallback(() => setState((s) => ({ open: !(s.open && s.path === pathname), path: pathname })), [pathname]);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(true);
    };
    // Growing past the docked breakpoint (rotating a tablet, resizing a window) leaves nothing to close.
    const docked = window.matchMedia("(min-width: 64rem)");
    const onResize = () => docked.matches && close();
    document.addEventListener("keydown", onKey);
    docked.addEventListener("change", onResize);

    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      docked.removeEventListener("change", onResize);
      document.body.style.overflow = overflow;
    };
  }, [open, close]);

  const value = useMemo(() => ({ open, toggle, close, triggerRef }), [open, toggle, close]);
  return <NavDrawerContext.Provider value={value}>{children}</NavDrawerContext.Provider>;
}
