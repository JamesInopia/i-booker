import { requireUser } from "@/lib/auth";
import { resolveTab } from "@/lib/nav";
import { listAllRooms } from "../booking/queries";
import { Legend } from "../calendar/calendar-parts";
import { addDays, monthGrid, parseDate, parseMonth, startOfWeek, todayISO } from "../calendar/dates";
import { getDayMarks } from "../calendar/day-marks-queries";
import { AccountsContent } from "./accounts/accounts-content";
import { ReviewContent } from "./review/review-content";
import { listWeekClasses } from "./schedule/queries";
import { ScheduleContent } from "./schedule/schedule-content";
import { SummaryCounts } from "./summary-counts";
import { CalendarView, TimetableView } from "./timeline";

const TABS_WITH_SUMMARY = ["timeline", "review"];

type Params = {
  tab?: string | string[];
  view?: string | string[];
  month?: string | string[];
  week?: string | string[];
  sort?: string | string[];
  show?: string | string[];
  q?: string | string[];
  request?: string | string[];
  term?: string | string[];
};

const first = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v);

export default async function AdminDashboardPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const user = await requireUser();
  const tab = resolveTab("/admin-dashboard", user.role, first(params.tab));

  const inReviewDetail = tab.id === "review" && Boolean(first(params.request));
  const showSummary = TABS_WITH_SUMMARY.includes(tab.id) && !inReviewDetail;

  return (
    <main className="space-y-4 px-16 pb-8 pt-2">
      {showSummary && <SummaryCounts />}
      {tab.id === "timeline" ? (
        <TimelineContent params={params} />
      ) : tab.id === "review" ? (
        <ReviewContent
          role={user.role}
          params={{ sort: first(params.sort), show: first(params.show), q: first(params.q), request: first(params.request) }}
        />
      ) : tab.id === "schedule" ? (
        <ScheduleContent params={{ term: first(params.term) }} />
      ) : tab.id === "accounts" ? (
        <AccountsContent params={{ show: first(params.show), q: first(params.q) }} />
      ) : (
        <TabHeading label={tab.label} />
      )}
    </main>
  );
}

async function TimelineContent({ params }: { params: Params }) {
  const isTimetable = first(params.view) === "b";
  const today = todayISO();

  const month = parseMonth(first(params.month)) ?? `${today.slice(0, 7)}-01`;
  const sunday = startOfWeek(parseDate(first(params.week)) ?? today);
  const [rooms, classes] = isTimetable ? await Promise.all([listAllRooms(), listWeekClasses(sunday)]) : [[], []];

  const grid = monthGrid(month);
  const marks = isTimetable ? await getDayMarks(sunday, addDays(sunday, 6)) : await getDayMarks(grid[0], grid[grid.length - 1]);

  if (isTimetable) {
    return (
      <div className="flex flex-col gap-3">
        <Legend compact />
        <TimetableView sunday={sunday} rooms={rooms} marks={marks} classes={classes} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <div className="min-w-0 flex-1">
        <CalendarView month={month} marks={marks} />
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