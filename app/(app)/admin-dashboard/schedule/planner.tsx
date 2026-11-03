"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { updateTermDates } from "./actions";
import { ClassDialog, type ClassDialogState } from "./dialogs";
import { TIME_ROWS, WEEK_COLUMNS, formatLongDate, type ClassRow, type TermRow } from "./types";

type Room = { roomId: string; name: string };

export function Planner({ term, rooms, classes }: { term: TermRow; rooms: Room[]; classes: ClassRow[] }) {
  const router = useRouter();
  const [start, setStart] = useState(term.startDate);
  const [end, setEnd] = useState(term.endDate);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [dialog, setDialog] = useState<ClassDialogState | null>(null);

  const dirty = start !== term.startDate || end !== term.endDate;

  const index = useMemo(() => {
    const m = new Map<string, ClassRow>();
    for (const c of classes) m.set(`${c.roomId}|${c.dayOfWeek}|${c.start}`, c);
    return m;
  }, [classes]);

  const covered = useMemo(() => {
    const s = new Set<string>();
    for (const c of classes) {
      const first = TIME_ROWS.findIndex((r) => r.start === c.start);
      const last = TIME_ROWS.findIndex((r) => r.end === c.end);
      for (let i = first + 1; i <= last; i++) s.add(`${c.roomId}|${c.dayOfWeek}|${TIME_ROWS[i].start}`);
    }
    return s;
  }, [classes]);

  async function save() {
    setPending(true);
    setError("");
    try {
      const res = await updateTermDates(term.id, start, end);
      if (res.ok) router.refresh();
      else setError(res.error);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  function discard() {
    setStart(term.startDate);
    setEnd(term.endDate);
    setError("");
  }

  const dateInput = "rounded-md border border-gray-300 px-2 py-1 text-sm shadow-sm outline-none focus:border-accent-1";

  return (
    <div className="min-w-0 flex-1 overflow-hidden rounded-lg bg-container shadow-sm">
      <div className="bg-linear-to-r from-heading-from to-heading-to px-3 py-2 text-sm font-bold text-white">{term.name}</div>

      <div className="flex flex-wrap items-center gap-3 border-b border-neutral-300 p-3">
        <label className="flex items-center gap-2 text-sm">
          Start term:
          <input type="date" value={start} max={end || undefined} onChange={(e) => setStart(e.target.value)} className={dateInput} />
        </label>
        <label className="flex items-center gap-2 text-sm">
          End term:
          <input type="date" value={end} min={start || undefined} onChange={(e) => setEnd(e.target.value)} className={dateInput} />
        </label>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={() => setDialog({ termId: term.id, rooms })}
            disabled={rooms.length === 0}
            className="rounded-md border border-accent-1 px-4 py-1.5 text-sm font-bold text-accent-1 hover:bg-blue-50 disabled:opacity-50"
          >
            + Add class
          </button>
          <button type="button" onClick={save} disabled={!dirty || pending} className="rounded-md bg-accent-1 px-4 py-1.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50">
            {pending ? "Saving..." : "Save Changes"}
          </button>
          <button type="button" onClick={discard} disabled={!dirty || pending} className="rounded-md bg-accent-2 px-4 py-1.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50">
            Discard Changes
          </button>
        </div>
        {error && <p role="alert" className="w-full text-sm text-red-600">{error}</p>}
        <p className="w-full text-xs text-gray-500">
          Classes repeat weekly from {formatLongDate(term.startDate)} to {formatLongDate(term.endDate)}. Click an empty cell to add a class, or a class to edit it.
        </p>
      </div>

      <p className="bg-white p-1 text-center text-sm font-semibold">Course planner</p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[60rem] table-fixed border-collapse text-center text-xs">
          <thead className="select-none">
            <tr className="bg-blue-100">
              <th className="w-28 border border-neutral-300 p-1">ROOM</th>
              <th className="w-24 border border-neutral-300 p-1">TIME</th>
              {WEEK_COLUMNS.map((d) => (
                <th key={d.iso} className="border border-neutral-300 p-1 uppercase">{d.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rooms.length === 0 && (
              <tr>
                <td colSpan={9} className="border border-neutral-300 p-4 text-neutral-500">No rooms yet. Add rooms in Booking → Manage Rooms first.</td>
              </tr>
            )}
            {rooms.map((room) =>
              TIME_ROWS.map((row, i) => (
                <tr key={`${room.roomId}-${row.start}`}>
                  {i === 0 && (
                    <th rowSpan={TIME_ROWS.length} scope="rowgroup" className="border border-neutral-300 p-1 font-bold uppercase">{room.name}</th>
                  )}
                  <th scope="row" className="border border-neutral-300 p-1 font-normal">{row.label}</th>
                  {WEEK_COLUMNS.map((d) => {
                    const key = `${room.roomId}|${d.iso}|${row.start}`;
                    if (covered.has(key)) return null;
                    const cls = index.get(key);
                    if (cls) {
                      const span = TIME_ROWS.findIndex((r) => r.end === cls.end) - i + 1;
                      return (
                        <td key={d.iso} rowSpan={span} className="border border-neutral-300 bg-blue-50 p-0 align-middle">
                          <button
                            type="button"
                            onClick={() => setDialog({ termId: term.id, rooms, existing: cls })}
                            className="flex h-full w-full flex-col items-center justify-center gap-0.5 p-1 hover:bg-blue-100"
                            title={`${cls.title} · ${cls.adviser} · ${cls.start}–${cls.end}`}
                          >
                            <span className="font-bold uppercase">{cls.title}</span>
                            <span className="text-[10px] text-gray-600">{cls.adviser}</span>
                          </button>
                        </td>
                      );
                    }
                    return (
                      <td key={d.iso} className="h-8 border border-neutral-300 p-0">
                        <button
                          type="button"
                          aria-label={`Add class in ${room.name}, ${d.label} ${row.start}`}
                          onClick={() => setDialog({ termId: term.id, rooms, prefill: { roomId: room.roomId, dayOfWeek: d.iso, start: row.start } })}
                          className="block h-full w-full hover:bg-blue-50"
                        />
                      </td>
                    );
                  })}
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>

      {dialog && <ClassDialog state={dialog} termEnd={formatLongDate(term.endDate)} onClose={() => setDialog(null)} />}
    </div>
  );
}
