"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { longDateLabel } from "../calendar/dates";
import { MARK_OPTIONS, needsNote, type DayMark, type MarkChoice } from "../calendar/day-marks";
import { markDay } from "./actions";

const POPOVER_WIDTH = 176;
const GAP = 12;
const EDGE = 8;

type Pos = { top: number; left: number; tailOn: "left" | "right"; tailY: number };

function placePopover(rect: DOMRect, height: number): Pos {
  const fitsRight = window.innerWidth - rect.right >= POPOVER_WIDTH + GAP + EDGE;
  const left = fitsRight ? rect.right + GAP : Math.max(EDGE, rect.left - GAP - POPOVER_WIDTH);
  const center = rect.top + rect.height / 2;
  const top = Math.min(Math.max(EDGE, center - height / 2), window.innerHeight - height - EDGE);
  return { top, left, tailOn: fitsRight ? "left" : "right", tailY: Math.min(Math.max(18, center - top), height - 18) };
}

export function DayMenu({
  date,
  mark,
  weekHref,
  className,
  children,
}: {
  date: string;
  mark: DayMark | null;
  weekHref?: string;
  className: string;
  children: React.ReactNode;
}) {
  const stored = mark && !mark.implicit ? mark : null;
  const direct = !weekHref;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const [pos, setPos] = useState<Pos | null>(null);
  const [markOpen, setMarkOpen] = useState(false);
  const [kind, setKind] = useState<MarkChoice>("holiday");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const closePopover = () => setPos(null);

  useEffect(() => {
    if (!pos) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (popoverRef.current?.contains(t) || triggerRef.current?.contains(t)) return;
      setPos(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPos(null);
    };
    const onMove = () => setPos(null);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [pos]);

  useEffect(() => {
    if (!markOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMarkOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [markOpen]);

  const toggle = () => {
    if (direct) return openMarkDialog();
    if (pos) return closePopover();
    if (!triggerRef.current) return;
    setError(null);
    setPos(placePopover(triggerRef.current.getBoundingClientRect(), weekHref ? 128 : 84));
  };

  const openMarkDialog = () => {
    closePopover();
    setKind(stored && MARK_OPTIONS.some((o) => o.kind === stored.kind) ? (stored.kind as MarkChoice) : "holiday");
    setNote(stored?.note ?? "");
    setError(null);
    setMarkOpen(true);
  };

  const run = (fd: FormData, onDone: () => void) => {
    fd.set("date", date);
    setError(null);
    start(async () => {
      const result = await markDay(fd);
      if (result.error) setError(result.error);
      else onDone();
    });
  };

  const removeMark = () => {
    const fd = new FormData();
    fd.set("kind", "clear");
    run(fd, () => {
      closePopover();
      setMarkOpen(false);
    });
  };

  const option = MARK_OPTIONS.find((o) => o.kind === kind);
  const noteLabel = option && "noteLabel" in option ? option.noteLabel : "";
  const notePlaceholder = option && "notePlaceholder" in option ? option.notePlaceholder : "";

  const popoverButton =
    "rounded-xl border border-accent-6 bg-container px-3 py-2 text-center font-semibold hover:bg-accent-5 disabled:opacity-50";
  const dialogButton = "rounded-lg border border-accent-6 px-4 py-2 text-sm font-semibold hover:bg-accent-5 disabled:opacity-50";

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={direct ? markOpen : pos !== null}
        aria-label={`${longDateLabel(date)}: options`}
        className={className}
      >
        {children}
      </button>

      {pos && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label={`Options for ${longDateLabel(date)}`}
          style={{ position: "fixed", top: pos.top, left: pos.left, width: POPOVER_WIDTH }}
          className="z-50 rounded-2xl border border-accent-6 bg-container px-3 pb-3 pt-8 text-left text-sm font-normal normal-case text-neutral-900 shadow-lg"
        >
          <button
            type="button"
            onClick={closePopover}
            aria-label="Close"
            className="absolute right-2 top-1.5 flex h-6 w-6 items-center justify-center rounded-full text-lg leading-none text-neutral-500 hover:bg-accent-5"
          >
            ×
          </button>

          <div className="flex flex-col gap-2">
            {weekHref && (
              <Link href={weekHref} onClick={closePopover} className={popoverButton}>
                View week
              </Link>
            )}
            {stored ? (
              <button type="button" onClick={removeMark} disabled={pending} className={popoverButton}>
                {pending ? "Removing…" : "Remove mark"}
              </button>
            ) : (
              <button type="button" onClick={openMarkDialog} className={popoverButton}>
                Mark day
              </button>
            )}
          </div>

          {error && (
            <p role="alert" className="mt-2 text-xs text-accent-2">
              {error}
            </p>
          )}

          <span
            aria-hidden
            style={{ top: pos.tailY - 6, [pos.tailOn]: -7 }}
            className={`absolute h-3 w-3 rotate-45 border-accent-6 bg-container ${pos.tailOn === "left" ? "border-b border-l" : "border-r border-t"}`}
          />
        </div>
      )}

      {markOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 text-left text-sm font-normal normal-case text-neutral-900"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setMarkOpen(false);
          }}
        >
          <div role="dialog" aria-modal="true" aria-label={`Mark ${longDateLabel(date)}`} className="w-full max-w-sm rounded-xl bg-container p-6 shadow-lg">
            <h2 className="text-lg font-bold">{longDateLabel(date)}</h2>
            <p className="mt-1 text-neutral-600">{stored ? `Currently marked: ${stored.label}` : mark?.implicit ? "Sundays have no classes by default" : "Not marked"}</p>

            <form
              className="mt-5"
              onSubmit={(e) => {
                e.preventDefault();
                run(new FormData(e.currentTarget), () => setMarkOpen(false));
              }}
            >
              <fieldset className="space-y-2">
                <legend className="sr-only">Mark day as</legend>
                {MARK_OPTIONS.map((o) => (
                  <label key={o.kind} className="flex cursor-pointer items-start gap-2 rounded-lg border border-accent-6 p-2 has-[:checked]:border-accent-1 has-[:checked]:bg-blue-50">
                    <input type="radio" name="kind" value={o.kind} checked={kind === o.kind} onChange={() => setKind(o.kind)} className="mt-1" />
                    <span>
                      <span className="block font-semibold">{o.label}</span>
                      <span className="block text-xs text-neutral-600">{o.hint}</span>
                    </span>
                  </label>
                ))}
              </fieldset>

              {needsNote(kind) && (
                <label className="mt-3 block font-semibold">
                  {noteLabel}
                  <input
                    name="note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    maxLength={120}
                    required
                    placeholder={notePlaceholder}
                    className="mt-1 block h-10 w-full rounded-md border border-accent-6 bg-container px-3 font-normal outline-none focus:border-accent-1"
                  />
                </label>
              )}

              {error && (
                <p role="alert" className="mt-3 text-xs text-accent-2">
                  {error}
                </p>
              )}

              <div className="mt-5 flex justify-end gap-3">
                {stored && (
                  <button type="button" onClick={removeMark} disabled={pending} className={`${dialogButton} mr-auto text-accent-2`}>
                    Remove mark
                  </button>
                )}
                <button type="button" onClick={() => setMarkOpen(false)} disabled={pending} className={dialogButton}>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-lg bg-accent-1 px-5 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60"
                >
                  {pending ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
