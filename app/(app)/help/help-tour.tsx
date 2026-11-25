"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FiHelpCircle, FiX } from "react-icons/fi";
import { usePageLoading } from "../../components/loading-provider";
import { tourFor, type Placement, type Tour, type TourStep } from "./tours";

const SEEN_PREFIX = "ibooker:tour-seen:";
const SPOT_PAD = 6; 
const GAP = 14; 
const MARGIN = 12; 

type Box = { top: number; left: number; width: number; height: number };
type Size = { w: number; h: number };

function readSeen(id: string) {
  try {
    return localStorage.getItem(SEEN_PREFIX + id) === "1";
  } catch {
    return false;
  }
}

function writeSeen(id: string) {
  try {
    localStorage.setItem(SEEN_PREFIX + id, "1");
  } catch {
  }
}

function findTarget(selector: string): HTMLElement | null {
  for (const el of document.querySelectorAll<HTMLElement>(selector)) {
    // Below lg the sidebar is a slide-in drawer (position: fixed) that is closed while the tour runs,
    // so anything inside it is off-screen. When it is docked (sticky) its items are fair game.
    const drawer = el.closest<HTMLElement>("[data-nav-drawer]");
    if (drawer && getComputedStyle(drawer).position === "fixed") continue;

    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

function toBox(r: DOMRect): Box {
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(n, Math.max(min, max)));

function place(box: Box | null, size: Size, preferred?: Placement) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (!box) return { top: (vh - size.h) / 2, left: (vw - size.w) / 2 };

  const t = box.top - SPOT_PAD;
  const l = box.left - SPOT_PAD;
  const w = box.width + SPOT_PAD * 2;
  const h = box.height + SPOT_PAD * 2;
  const centerLeft = clamp(l + w / 2 - size.w / 2, MARGIN, vw - size.w - MARGIN);
  const centerTop = clamp(t + h / 2 - size.h / 2, MARGIN, vh - size.h - MARGIN);

  const options: Record<Placement, { top: number; left: number; fits: boolean }> = {
    bottom: { top: t + h + GAP, left: centerLeft, fits: t + h + GAP + size.h <= vh - MARGIN },
    top: { top: t - size.h - GAP, left: centerLeft, fits: t - size.h - GAP >= MARGIN },
    right: { top: centerTop, left: l + w + GAP, fits: l + w + GAP + size.w <= vw - MARGIN },
    left: { top: centerTop, left: l - size.w - GAP, fits: l - size.w - GAP >= MARGIN },
  };

  const order: Placement[] = [preferred, "bottom", "top", "right", "left"].filter(
    (p, i, all): p is Placement => Boolean(p) && all.indexOf(p) === i,
  );
  for (const p of order) if (options[p].fits) return options[p];

  // The highlighted area fills the screen: tuck the tooltip into the bottom-right corner.
  return { top: vh - size.h - 16, left: vw - size.w - 16 };
}

function TourOverlay({ tour, onClose }: { tour: Tour; onClose: () => void }) {
  // Steps whose element isn't on the page right now are left out, so the tour only shows what exists.
  const [steps] = useState<TourStep[]>(() => tour.steps.filter((s) => !s.target || findTarget(s.target)));
  const [index, setIndex] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const [size, setSize] = useState<Size>({ w: 340, h: 200 });
  const popRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);

  const step = steps[index];
  const last = index === steps.length - 1;

  const next = useCallback(() => (last ? onClose() : setIndex((i) => i + 1)), [last, onClose]);
  const back = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  // Bring the highlighted element into view, and keep the highlight on it while the page moves.
  useEffect(() => {
    if (!step) return;
    const el = step.target ? findTarget(step.target) : null;
    if (el) {
      const tall = el.getBoundingClientRect().height > window.innerHeight * 0.6;
      el.scrollIntoView({ block: tall ? "start" : "center", inline: "nearest" });
      if (tall) window.scrollBy(0, -80); // clear the sticky header
    }

    let frame = 0;
    const measure = () => {
      const target = step.target ? findTarget(step.target) : null;
      setBox(target ? toBox(target.getBoundingClientRect()) : null);
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
    };
  }, [step]);

  // Measure the tooltip so it can be placed without overflowing the screen.
  useLayoutEffect(() => {
    const el = popRef.current;
    if (el) setSize({ w: el.offsetWidth, h: el.offsetHeight });
  }, [index]);

  // Move keyboard focus into the tooltip on every step.
  useEffect(() => {
    primaryRef.current?.focus({ preventScroll: true });
  }, [index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        back();
      } else if (e.key === "Tab") {
        // Keep Tab inside the tooltip while the tour is open.
        const items = popRef.current?.querySelectorAll<HTMLElement>("button:not(:disabled)");
        if (!items || items.length === 0) return;
        const first = items[0];
        const lastItem = items[items.length - 1];
        const active = document.activeElement;
        if (e.shiftKey && (active === first || !popRef.current?.contains(active))) {
          e.preventDefault();
          lastItem.focus();
        } else if (!e.shiftKey && (active === lastItem || !popRef.current?.contains(active))) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [next, back, onClose]);

  if (!step) return null;

  const pos = place(box, size, step.placement);
  const secondary =
    "rounded-lg border border-accent-6 px-4 py-2 text-sm font-semibold hover:bg-accent-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-1";

  return createPortal(
    <div className="fixed inset-0 z-100">
      {/* Catches clicks so nothing on the page changes while the tour is open. Dimmed only when no element is highlighted. */}
      <div className={`absolute inset-0 ${box ? "" : "bg-black/55"}`} />

      {box && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed rounded-lg ring-2 ring-white shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] transition-[top,left,width,height] duration-200 motion-reduce:transition-none"
          style={{
            top: box.top - SPOT_PAD,
            left: box.left - SPOT_PAD,
            width: box.width + SPOT_PAD * 2,
            height: box.height + SPOT_PAD * 2,
          }}
        />
      )}

      <div
        ref={popRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-body"
        className="fixed w-85 max-w-[calc(100vw-1.5rem)] rounded-xl bg-container p-5 shadow-2xl ring-1 ring-black/10"
        style={{ top: pos.top, left: pos.left }}
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent-1">
            Step {index + 1} of {steps.length}
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close tour"
            className="-mr-1 rounded-full p-1 text-accent-3 hover:bg-accent-4 focus-visible:outline-2 focus-visible:outline-accent-1"
          >
            <FiX aria-hidden="true" />
          </button>
        </div>

        <h2 id="tour-title" className="mt-2 text-lg font-bold">
          {step.title}
        </h2>
        <p id="tour-body" className="mt-1 text-sm leading-relaxed text-accent-3">
          {step.body}
        </p>

        <div className="mt-5 flex items-center justify-between gap-3">
          {last ? (
            <span />
          ) : (
            <button type="button" onClick={onClose} className="text-sm font-semibold text-accent-3 hover:underline">
              Skip tour
            </button>
          )}
          <div className="flex gap-2">
            {index > 0 && (
              <button type="button" onClick={back} className={secondary}>
                Back
              </button>
            )}
            <button
              ref={primaryRef}
              type="button"
              onClick={next}
              className="rounded-lg bg-accent-1 px-5 py-2 text-sm font-semibold text-white hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-1"
            >
              {last ? "Done" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** The sidebar's Help button. On demand, it walks the person through the page they're on. */
export function HelpButton({ onStart }: { onStart?: () => void }) {
  const pathname = usePathname();
  const search = useSearchParams();
  const tour = useMemo(() => tourFor(pathname, search), [pathname, search]);
  const key = `${pathname}?${search.toString()}`;

  // The tour belongs to the page it was opened on: moving to another page or tab closes it.
  const [openFor, setOpenFor] = useState<string | null>(null);
  const open = openFor === key;

  // Until the person has opened this page's tour once, the button carries a small dot.
  const [seen, setSeen] = useState(true);
  useEffect(() => setSeen(readSeen(tour.id)), [tour.id]);

  const buttonRef = useRef<HTMLButtonElement>(null);

  // The tour points at things on the page, so it can't start until the page is ready: still loading, or
  // not yet interactive (before the page has hydrated).
  const loading = usePageLoading();
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const disabled = loading || !ready;

  const close = useCallback(() => {
    setOpenFor(null);
    buttonRef.current?.focus();
  }, []);

  const start = () => {
    if (disabled) return;
    writeSeen(tour.id);
    setSeen(true);
    setOpenFor(key);
    onStart?.();
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        data-tour="help-button"
        aria-haspopup="dialog"
        aria-expanded={open}
        title={disabled ? "Available once the page has finished loading" : "Take a quick tour of this page"}
        onClick={start}
        disabled={disabled}
        className="relative ml-3 flex w-[calc(100%-0.75rem)] items-center gap-3 rounded-l-full py-3 pl-6 pr-3 text-left text-xl font-bold leading-tight text-white hover:bg-white/10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
      >
        <span className="relative">
          <FiHelpCircle aria-hidden="true" className="h-6 w-6" />
          {!seen && (
            <span
              aria-hidden="true"
              className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-accent-7 ring-2 ring-heading-to"
            />
          )}
        </span>
        Help
        {!seen && <span className="sr-only">(new: take a tour of this page)</span>}
      </button>

      {open && <TourOverlay key={tour.id} tour={tour} onClose={close} />}
    </>
  );
}
