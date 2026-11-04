"use client";

import { useEffect, useState } from "react";
import { Planner } from "./planner";
import { TermSidebar } from "./term-sidebar";
import type { ClassRow, TermRow } from "./types";

export function ScheduleWorkspace({ terms, selected, rooms, classes }: {
  terms: TermRow[];
  selected: TermRow;
  rooms: { roomId: string; name: string }[];
  classes: ClassRow[];
}) {
  // The planner holds the unsaved draft; the sidebar needs to know about it so it can warn before navigating away.
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <Planner key={selected.id} term={selected} rooms={rooms} classes={classes} onDirtyChange={setDirty} />
      <TermSidebar terms={terms} selectedId={selected.id} dirty={dirty} />
    </div>
  );
}
