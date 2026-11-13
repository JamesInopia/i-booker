"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { saveTermChanges } from "./actions";
import { ClassDialog, type ClassDialogState } from "./dialogs";
import {
  MAX_TERM_NAME,
  TIME_ROWS,
  WEEK_COLUMNS,
  formatLongDate,
  type ClassFormFields,
  type ClassRow,
  type DraftClass,
  type TermRow,
} from "./types";

type Room = { roomId: string; name: string };

const ROW_H = 45;
const GRID_COLUMNS = "5.5rem repeat(7, minmax(0, 1fr))";

const toDraft = (c: ClassRow): DraftClass => ({
  id: c.id,
  roomId: c.roomId,
  dayOfWeek: c.dayOfWeek,
  start: c.start,
  end: c.end,
  title: c.title,
});

const sameClass = (a: DraftClass, b: DraftClass) =>
  a.roomId === b.roomId && a.dayOfWeek === b.dayOfWeek && a.start === b.start && a.end === b.end && a.title === b.title;

const signature = (term: TermRow, classes: ClassRow[]) =>
  JSON.stringify([term.name, term.startDate, term.endDate, classes.map((c) => [c.id, c.roomId, c.dayOfWeek, c.start, c.end, c.title])]);

export function Planner({ term, rooms, classes, onDirtyChange }: {
  term: TermRow;
  rooms: Room[];
  classes: ClassRow[];
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(term.name);
  const [start, setStart] = useState(term.startDate);
  const [end, setEnd] = useState(term.endDate);
  const [draft, setDraft] = useState<DraftClass[]>(() => classes.map(toDraft));
  const [roomId, setRoomId] = useState(rooms[0]?.roomId ?? "");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [refreshing, startRefresh] = useTransition();
  const [dialog, setDialog] = useState<ClassDialogState | null>(null);
  const nextTempId = useRef(-1);
  const chipRefs = useRef(new Map<string, HTMLButtonElement>());
  const headRef = useRef<HTMLDivElement>(null);

  const sig = signature(term, classes);
  const [seenSig, setSeenSig] = useState(sig);
  if (seenSig !== sig) {
    setSeenSig(sig);
    setName(term.name);
    setStart(term.startDate);
    setEnd(term.endDate);
    setDraft(classes.map(toDraft));
  }

  const busy = saving || refreshing;
  const room = rooms.find((r) => r.roomId === roomId) ?? rooms[0];

  const diff = useMemo(() => {
    const original = new Map(classes.map((c) => [c.id, toDraft(c)]));
    const draftIds = new Set(draft.map((c) => c.id));
    const added = draft.filter((c) => c.id < 0);
    const edited = draft.filter((c) => {
      const o = original.get(c.id);
      return c.id > 0 && o !== undefined && !sameClass(o, c);
    });
    const deleted = classes.filter((c) => !draftIds.has(c.id));
    const touchedRooms = new Set<string>([...added, ...edited, ...deleted].map((c) => c.roomId));
    for (const c of edited) touchedRooms.add(original.get(c.id)!.roomId);
    return { added, edited, deleted, changedIds: new Set([...added, ...edited].map((c) => c.id)), touchedRooms };
  }, [classes, draft]);

  const termChanged = name !== term.name || start !== term.startDate || end !== term.endDate;
  const changeCount = diff.added.length + diff.edited.length + diff.deleted.length + (termChanged ? 1 : 0);
  const dirty = changeCount > 0;

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);

  const roomKey = room?.roomId;
  useEffect(() => {
    if (roomKey) chipRefs.current.get(roomKey)?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [roomKey]);

  const touch = () => {
    setError("");
    setNotice("");
  };

  async function save() {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const res = await saveTermChanges({
        termId: term.id,
        name,
        startDate: start,
        endDate: end,
        deletedIds: diff.deleted.map((c) => c.id),
        classes: [...diff.edited, ...diff.added].map((c) => ({
          id: c.id > 0 ? c.id : undefined,
          roomId: c.roomId,
          dayOfWeek: c.dayOfWeek,
          start: c.start,
          end: c.end,
          title: c.title,
        })),
      });
      if (res.ok) {
        setNotice("Changes saved.");
        startRefresh(() => router.refresh());
      } else {
        setError(res.error);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function discard() {
    setName(term.name);
    setStart(term.startDate);
    setEnd(term.endDate);
    setDraft(classes.map(toDraft));
    setError("");
    setNotice("");
  }

  function applyClass(values: ClassFormFields, existingId?: number) {
    touch();
    if (existingId !== undefined) {
      setDraft((d) =>
        d.map((c) =>
          c.id === existingId
            ? { ...c, roomId: values.roomId, dayOfWeek: values.days[0], start: values.start, end: values.end, title: values.title }
            : c,
        ),
      );
    } else {
      const created = values.days.map((day): DraftClass => ({
        id: nextTempId.current--,
        roomId: values.roomId,
        dayOfWeek: day,
        start: values.start,
        end: values.end,
        title: values.title,
      }));
      setDraft((d) => [...d, ...created]);
    }
    setRoomId(values.roomId);
    setDialog(null);
  }

  function removeClass(id: number) {
    touch();
    setDraft((d) => d.filter((c) => c.id !== id));
    setDialog(null);
  }

  function stepRoom(delta: number) {
    if (!room) return;
    const i = rooms.findIndex((r) => r.roomId === room.roomId);
    const next = rooms[(i + delta + rooms.length) % rooms.length];
    if (next) setRoomId(next.roomId);
  }

  const roomClasses = room ? draft.filter((c) => c.roomId === room.roomId) : [];
  const countByRoom = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of draft) m.set(c.roomId, (m.get(c.roomId) ?? 0) + 1);
    return m;
  }, [draft]);

  const input = "rounded-md border border-gray-300 px-2 py-1 text-sm shadow-sm outline-none focus:border-accent-1";
  const gridHeight = ROW_H * TIME_ROWS.length;

  return (
    <div className="min-w-0 flex-1 overflow-clip rounded-lg bg-container shadow-sm">
      <div className="sticky top-[calc(4rem-1px)] z-[9] bg-container shadow-sm">
      <div className="bg-linear-to-r from-heading-from to-heading-to px-3 py-2 text-sm font-bold text-white">
        {name.trim() || "Untitled term"}
        {dirty && <span className="ml-2 rounded bg-white/20 px-1.5 py-0.5 text-xs font-semibold">Unsaved changes</span>}
      </div>

      <div className="space-y-2 border-b border-neutral-300 p-3">
       <div className="flex flex-wrap items-end gap-3 md:flex-nowrap">
        <label className="flex flex-col gap-1 text-xs font-semibold">
          Term name
          <input
            value={name}
            maxLength={MAX_TERM_NAME}
            onChange={(e) => {
              setName(e.target.value);
              touch();
            }}
            className={`${input} w-44`}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold">
          Start term
          <input
            type="date"
            value={start}
            max={end || undefined}
            onChange={(e) => {
              setStart(e.target.value);
              touch();
            }}
            className={input}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold">
          End term
          <input
            type="date"
            value={end}
            min={start || undefined}
            onChange={(e) => {
              setEnd(e.target.value);
              touch();
            }}
            className={input}
          />
        </label>
        <div className="ml-auto flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => room && setDialog({ defaultRoomId: room.roomId })}
            disabled={rooms.length === 0 || busy}
            className="whitespace-nowrap rounded-md border border-accent-1 px-3 py-1.5 text-sm font-bold text-accent-1 hover:bg-blue-50 disabled:opacity-50"
          >
            + Add class
          </button>
          <button type="button" onClick={save} disabled={!dirty || busy} className="whitespace-nowrap rounded-md bg-accent-1 px-3 py-1.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50">
            {busy ? "Saving..." : "Save Changes"}
          </button>
          <button type="button" onClick={discard} disabled={!dirty || busy} className="whitespace-nowrap rounded-md bg-accent-2 px-3 py-1.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50">
            Discard Changes
          </button>
        </div>
       </div>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        {notice && !error && <p role="status" className="text-sm text-green-700">{notice}</p>}
        <p className="text-xs text-gray-500">
          Classes repeat weekly from {formatLongDate(start)} to {formatLongDate(end)}. Use <b>+ Add class</b> to add one, or click a class to edit it.
          {dirty ? ` ${changeCount} unsaved change${changeCount === 1 ? "" : "s"}. Nothing is stored until you press Save Changes.` : ""}
        </p>
      </div>

        {rooms.length > 0 && (
          <div className="flex items-center gap-2 border-b border-neutral-300 bg-white px-2 py-2">
            <button
              type="button"
              onClick={() => stepRoom(-1)}
              aria-label="Previous room"
              disabled={rooms.length < 2}
              className="shrink-0 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-bold hover:bg-gray-50 disabled:opacity-40"
            >
              ‹
            </button>
            <div
              role="tablist"
              aria-label="Rooms"
              className="flex min-w-0 flex-1 gap-2 overflow-x-auto scroll-smooth py-0.5"
              onKeyDown={(e) => {
                if (e.key === "ArrowRight") stepRoom(1);
                else if (e.key === "ArrowLeft") stepRoom(-1);
                else return;
                e.preventDefault();
              }}
            >
              {rooms.map((r) => {
                const active = r.roomId === room?.roomId;
                const count = countByRoom.get(r.roomId) ?? 0;
                return (
                  <button
                    key={r.roomId}
                    ref={(el) => {
                      if (el) chipRefs.current.set(r.roomId, el);
                      else chipRefs.current.delete(r.roomId);
                    }}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    tabIndex={active ? 0 : -1}
                    onClick={() => setRoomId(r.roomId)}
                    className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-semibold ${
                      active ? "border-accent-1 bg-accent-1 text-white" : "border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {r.name}
                    {count > 0 && (
                      <span className={`rounded-full px-1.5 text-xs ${active ? "bg-white/25" : "bg-gray-200 text-gray-700"}`}>{count}</span>
                    )}
                    {diff.touchedRooms.has(r.roomId) && (
                      <span aria-label="Unsaved changes in this room" title="Unsaved changes in this room" className="size-2 rounded-full bg-accent-7" />
                    )}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => stepRoom(1)}
              aria-label="Next room"
              disabled={rooms.length < 2}
              className="shrink-0 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-bold hover:bg-gray-50 disabled:opacity-40"
            >
              ›
            </button>
          </div>
        )}

        {rooms.length > 0 && (
          <>
            <p className="bg-white p-1 text-center text-sm font-semibold">Course planner · {room?.name}</p>
            <div ref={headRef} className="overflow-hidden">
              <div className="min-w-[56rem] select-none text-xs" style={{ display: "grid", gridTemplateColumns: GRID_COLUMNS }}>
                <div className="border border-neutral-300 bg-blue-100 p-1.5 text-center font-bold">TIME</div>
                {WEEK_COLUMNS.map((d) => (
                  <div key={d.iso} className="border border-l-0 border-neutral-300 bg-blue-100 p-1.5 text-center font-bold uppercase">
                    {d.label}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {rooms.length === 0 ? (
        <p className="p-6 text-center text-sm text-neutral-500">No rooms yet. Add rooms in Booking → Manage Rooms first.</p>
      ) : (
        <>
          <div className="overflow-x-auto" onScroll={(e) => headRef.current && (headRef.current.scrollLeft = e.currentTarget.scrollLeft)}>
            <div className="min-w-[56rem] select-none text-xs" style={{ display: "grid", gridTemplateColumns: GRID_COLUMNS }}>
              <div className="border-x border-neutral-300">
                {TIME_ROWS.map((row) => (
                  <div
                    key={row.start}
                    style={{ height: ROW_H }}
                    className="flex items-center justify-center border-b border-neutral-300 bg-white"
                  >
                    {row.label}
                  </div>
                ))}
              </div>

              {WEEK_COLUMNS.map((d) => (
                <div key={d.iso} className="relative border-r border-neutral-300" style={{ height: gridHeight }}>
                  {/* Empty cells are plain, non-interactive background rows. */}
                  {TIME_ROWS.map((row) => (
                    <div key={row.start} style={{ height: ROW_H }} className="border-b border-neutral-200" />
                  ))}

                  {roomClasses
                    .filter((c) => c.dayOfWeek === d.iso)
                    .map((c) => {
                      const first = TIME_ROWS.findIndex((r) => r.start === c.start);
                      const last = TIME_ROWS.findIndex((r) => r.end === c.end);
                      if (first < 0 || last < first) return null;
                      const span = last - first + 1;
                      const unsaved = diff.changedIds.has(c.id);
                      // Use the whole block: titles wrap instead of truncating,
                      // and only clamp once they would run out of height.
                      const inner = span * ROW_H - 2 - 8;
                      const showTime = span >= 2;
                      const reserved = showTime ? 14 + 2 : 0;
                      const titleLines = Math.max(1, Math.floor((inner - reserved) / 20));
                      const clamp = (lines: number) =>
                        ({ display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: lines, overflow: "hidden" }) as const;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setDialog({ existing: c, defaultRoomId: c.roomId })}
                          title={`${c.title} · ${c.start}–${c.end}${unsaved ? " (unsaved)" : ""}`}
                          aria-label={`Edit ${c.title}, ${d.label} ${c.start} to ${c.end}`}
                          style={{ top: first * ROW_H + 1, height: span * ROW_H - 2 }}
                          className={`absolute inset-x-px flex cursor-pointer flex-col items-center justify-center gap-0.5 overflow-hidden rounded-sm border px-1 text-center ${
                            unsaved
                              ? "border-dashed border-accent-7 bg-amber-50 hover:bg-amber-100"
                              : "border-blue-200 bg-blue-50 hover:bg-blue-100"
                          }`}
                        >
                          <span style={clamp(titleLines)} className="w-full break-words text-sm font-bold uppercase leading-5 [overflow-wrap:anywhere]">{c.title}</span>
                          {showTime && <span className="text-[10px] leading-[14px] text-gray-500">{c.start} – {c.end}</span>}
                        </button>
                      );
                    })}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {dialog && (
        <ClassDialog
          state={dialog}
          rooms={rooms}
          classes={draft}
          termEnd={formatLongDate(end)}
          onSave={applyClass}
          onDelete={removeClass}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}
