"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { createTerm, deleteTerm } from "./actions";
import {
  END_OPTIONS,
  MAX_ADVISER,
  MAX_COURSE_TITLE,
  MAX_TERM_NAME,
  START_OPTIONS,
  WEEK_COLUMNS,
  validateClassFields,
  findClash,
  validateTermFields,
  type ClassFormFields,
  type DraftClass,
  type ScheduleResult,
} from "./types";
import { formatTime } from "../../booking/rules";

const input = "mt-1 w-full rounded-md border border-gray-300 p-2 text-sm outline-none focus:border-accent-1";

export function Shell({ title, description, onClose, pending, children }: {
  title: string;
  description?: string;
  onClose: () => void;
  pending: boolean;
  children: React.ReactNode;
}) {
  const titleId = useId();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pending) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, pending]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !pending && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-container p-6 text-left shadow-xl"
      >
        <h2 id={titleId} className="text-xl font-bold">{title}</h2>
        {description && <p className="mt-1 text-sm text-gray-600">{description}</p>}
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function Footer({ pending, error, onClose, confirmLabel, pendingLabel, tone = "primary", extra }: {
  pending: boolean;
  error: string;
  onClose: () => void;
  confirmLabel: string;
  pendingLabel: string;
  tone?: "primary" | "danger";
  extra?: React.ReactNode;
}) {
  return (
    <>
      {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
      <div className="mt-5 flex items-center justify-end gap-3">
        {extra && <div className="mr-auto">{extra}</div>}
        <button type="button" onClick={onClose} disabled={pending} className="rounded-full px-5 py-2 font-semibold hover:bg-gray-100 disabled:opacity-50">
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          className={`rounded-full px-5 py-2 font-semibold text-white disabled:opacity-50 ${tone === "danger" ? "bg-red-600 hover:bg-red-700" : "bg-accent-1 hover:opacity-90"}`}
        >
          {pending ? pendingLabel : confirmLabel}
        </button>
      </div>
    </>
  );
}

function useSubmit(onDone: (res: Extract<ScheduleResult, { ok: true }>) => void) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function run(action: () => Promise<ScheduleResult>) {
    setPending(true);
    setError("");
    try {
      const res = await action();
      if (res.ok) onDone(res);
      else setError(res.error);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }
  return { pending, error, setError, run };
}

export function NewTermDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const { pending, error, setError, run } = useSubmit((res) => {
    onClose();
    router.push(`/admin-dashboard?tab=schedule&term=${res.id}`);
  });
  const ids = [useId(), useId(), useId()];

  return (
    <Shell title="New term" description="Set the term's name and its start and end dates." onClose={onClose} pending={pending}>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          const problem = validateTermFields(name, start, end);
          if (problem) return setError(problem);
          run(() => createTerm(name, start, end));
        }}
      >
        <label htmlFor={ids[0]} className="mt-4 block text-sm font-semibold">Term name</label>
        <input id={ids[0]} className={input} value={name} maxLength={MAX_TERM_NAME} placeholder="e.g. AY26-27, T3, 2YR" onChange={(e) => setName(e.target.value)} autoFocus />
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label htmlFor={ids[1]} className="block text-sm font-semibold">Start date</label>
            <input id={ids[1]} type="date" className={input} value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div>
            <label htmlFor={ids[2]} className="block text-sm font-semibold">End date</label>
            <input id={ids[2]} type="date" className={input} value={end} min={start || undefined} onChange={(e) => setEnd(e.target.value)} />
          </div>
        </div>
        <Footer pending={pending} error={error} onClose={onClose} confirmLabel="Create term" pendingLabel="Creating..." />
      </form>
    </Shell>
  );
}

export function DeleteTermDialog({ term, onClose }: { term: { id: number; name: string }; onClose: () => void }) {
  const router = useRouter();
  const { pending, error, run } = useSubmit(() => {
    onClose();
    router.push("/admin-dashboard?tab=schedule");
  });
  return (
    <Shell
      title={`Delete ${term.name}?`}
      description="This removes the term and every class schedule in it. Rooms in those periods become bookable again. This can't be undone."
      onClose={onClose}
      pending={pending}
    >
      <form onSubmit={(e) => { e.preventDefault(); run(() => deleteTerm(term.id)); }}>
        <Footer pending={pending} error={error} onClose={onClose} confirmLabel="Delete term" pendingLabel="Deleting..." tone="danger" />
      </form>
    </Shell>
  );
}

export type ClassDialogState = {
  existing?: DraftClass;
  defaultRoomId: string;
};

const dayName = (iso: number) => WEEK_COLUMNS.find((d) => d.iso === iso)?.label ?? "That day";

export function ClassDialog({ state, rooms, classes, termEnd, onSave, onDelete, onClose }: {
  state: ClassDialogState;
  rooms: { roomId: string; name: string }[];
  classes: DraftClass[];
  termEnd: string;
  onSave: (values: ClassFormFields, existingId?: number) => void;
  onDelete: (id: number) => void;
  onClose: () => void;
}) {
  const { existing, defaultRoomId } = state;
  const [roomId, setRoomId] = useState(existing?.roomId ?? defaultRoomId ?? rooms[0]?.roomId ?? "");
  const [days, setDays] = useState<number[]>(existing ? [existing.dayOfWeek] : []);
  const [start, setStart] = useState(existing?.start ?? "");
  const [end, setEnd] = useState(existing?.end ?? "");
  const [title, setTitle] = useState(existing?.title ?? "");
  const [adviser, setAdviser] = useState(existing?.adviser ?? "");
  const [error, setError] = useState("");
  const ids = [useId(), useId(), useId(), useId(), useId()];

  const toggleDay = (iso: number) =>
    setDays((d) => (existing ? [iso] : d.includes(iso) ? d.filter((x) => x !== iso) : [...d, iso]));

  return (
    <Shell
      title={existing ? "Edit class schedule" : "Add class schedule"}
      description={`Repeats every week until the term ends on ${termEnd}. These periods can't be booked. Changes only apply once you save the term.`}
      onClose={onClose}
      pending={false}
    >
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          const values = { roomId, days, start, end, title: title.trim(), adviser: adviser.trim() };
          const problem = validateClassFields(values);
          if (problem) return setError(problem);

          for (const day of days) {
            const clash = findClash(classes, { id: existing?.id ?? 0, roomId, dayOfWeek: day, start, end });
            if (clash) {
              const room = rooms.find((r) => r.roomId === roomId)?.name ?? "this room";
              return setError(
                `${dayName(day)} ${formatTime(clash.start)} – ${formatTime(clash.end)} is already taken by ${clash.title || "another class"} in ${room}.`,
              );
            }
          }
          onSave(values, existing?.id);
        }}
      >
        <label htmlFor={ids[0]} className="mt-4 block text-sm font-semibold">Room</label>
        <select id={ids[0]} className={input} value={roomId} onChange={(e) => setRoomId(e.target.value)}>
          {rooms.map((r) => <option key={r.roomId} value={r.roomId}>{r.name}</option>)}
        </select>

        <fieldset className="mt-4">
          <legend className="text-sm font-semibold">{existing ? "Day" : "Days (pick one or more)"}</legend>
          <div className="mt-1 flex flex-wrap gap-2">
            {WEEK_COLUMNS.map((d) => (
              <button
                key={d.iso}
                type="button"
                aria-pressed={days.includes(d.iso)}
                onClick={() => toggleDay(d.iso)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${days.includes(d.iso) ? "border-accent-1 bg-accent-1 text-white" : "border-gray-300 hover:bg-gray-100"}`}
              >
                {d.label.slice(0, 3)}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label htmlFor={ids[1]} className="block text-sm font-semibold">Start time</label>
            <select id={ids[1]} className={input} value={start} onChange={(e) => setStart(e.target.value)}>
              <option value="">Select</option>
              {START_OPTIONS.map((t) => <option key={t} value={t}>{formatTime(t)}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor={ids[2]} className="block text-sm font-semibold">End time</label>
            <select id={ids[2]} className={input} value={end} onChange={(e) => setEnd(e.target.value)}>
              <option value="">Select</option>
              {END_OPTIONS.filter((t) => !start || t > start).map((t) => <option key={t} value={t}>{formatTime(t)}</option>)}
            </select>
          </div>
        </div>

        <label htmlFor={ids[3]} className="mt-4 block text-sm font-semibold">Course title</label>
        <input id={ids[3]} className={input} value={title} maxLength={MAX_COURSE_TITLE} placeholder="e.g. FUNDPROG" onChange={(e) => setTitle(e.target.value)} />

        <label htmlFor={ids[4]} className="mt-4 block text-sm font-semibold">Course adviser</label>
        <input id={ids[4]} className={input} value={adviser} maxLength={MAX_ADVISER} placeholder="e.g. John Doe" onChange={(e) => setAdviser(e.target.value)} />

        <Footer
          pending={false}
          error={error}
          onClose={onClose}
          confirmLabel={existing ? "Update class" : "Add class"}
          pendingLabel="Saving..."
          extra={
            existing && (
              <button
                type="button"
                onClick={() => onDelete(existing.id)}
                className="rounded-full px-4 py-2 font-semibold text-red-600 hover:bg-red-50"
              >
                Delete
              </button>
            )
          }
        />
      </form>
    </Shell>
  );
}
