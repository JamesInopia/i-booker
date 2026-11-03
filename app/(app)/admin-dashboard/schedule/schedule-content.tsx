import { requireRole } from "@/lib/auth";
import { ADMIN_ROLES } from "@/lib/session";
import { listAllRooms } from "../../booking/queries";
import { todayISO } from "../../calendar/dates";
import { Planner } from "./planner";
import { listClasses, listTerms } from "./queries";
import { EmptyState, TermSidebar } from "./term-sidebar";

export async function ScheduleContent({ params }: { params: { term?: string } }) {
  await requireRole(...ADMIN_ROLES);

  const terms = await listTerms();
  if (terms.length === 0) return <EmptyState />;

  const today = todayISO();
  const requested = params.term && /^\d{1,9}$/.test(params.term) ? Number(params.term) : null;
  const selected =
    terms.find((t) => t.id === requested) ??
    terms.find((t) => t.startDate <= today && today <= t.endDate) ??
    terms[0];

  const [rooms, classes] = await Promise.all([listAllRooms(), listClasses(selected.id)]);

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <Planner
        key={`${selected.id}-${selected.startDate}-${selected.endDate}`}
        term={selected}
        rooms={rooms.map((r) => ({ roomId: r.roomId, name: r.name }))}
        classes={classes}
      />
      <TermSidebar terms={terms} selectedId={selected.id} />
    </div>
  );
}
