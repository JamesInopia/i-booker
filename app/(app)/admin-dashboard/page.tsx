import { requireUser } from "@/lib/auth";
import { resolveTab } from "@/lib/nav";
import { listAllRooms } from "../booking/queries";
import { Legend } from "../calendar/calendar-parts";
import { parseDate, parseMonth, startOfWeek, todayISO } from "../calendar/dates";
import { SummaryCounts } from "./summary-counts";
import { CalendarView, TimetableView } from "./timeline";

const TABS_WITH_SUMMARY = ["timeline"];

type Params = {
  tab?: string | string[];
  view?: string | string[];
  month?: string | string[];
  week?: string | string[];
};

const first = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v);

export default async function AdminDashboardPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const user = await requireUser();
  const tab = resolveTab("/admin-dashboard", user.role, first(params.tab));

  const showSummary = TABS_WITH_SUMMARY.includes(tab.id);

  return (
    <main className="space-y-4 px-16 pb-8 pt-2">
      {showSummary && <SummaryCounts />}
      {tab.id === "timeline" ? <TimelineContent params={params} /> : <TabHeading label={tab.label} />}
    </main>
  );
}

async function TimelineContent({ params }: { params: Params }) {
  const isTimetable = first(params.view) === "b";
  const today = todayISO();

  const month = parseMonth(first(params.month)) ?? `${today.slice(0, 7)}-01`;
  const sunday = startOfWeek(parseDate(first(params.week)) ?? today);
  const rooms = isTimetable ? await listAllRooms() : [];

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <div className="min-w-0 flex-1">
        {isTimetable ? <TimetableView sunday={sunday} rooms={rooms} /> : <CalendarView month={month} />}
      </div>
      <Legend />
    </div>
  );
}

function TabHeading({ label }: { label: string }) {
  return (
    <>
      <h1 className="text-4xl font-bold">Admin dashboard page</h1>
      <section className="mt-6">
        <h2 className="text-2xl font-semibold">{label} tab</h2>
      </section>
    </>
  );
}
