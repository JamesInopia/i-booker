import Link from "next/link";

const TABS = [
  { id: "schedule", label: "Schedule" },
  { id: "review", label: "Review" },
  { id: "accounts", label: "Accounts" },
] as const;

const VIEWS = [
  { id: "a", label: "View A" },
  { id: "b", label: "View B" },
] as const;

type Params = { tab?: string | string[]; view?: string | string[] };

const first = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v);

export default async function AdminDashboardPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const tab = TABS.find((t) => t.id === first(params.tab)) ?? TABS[0];
  const view = VIEWS.find((v) => v.id === first(params.view)) ?? VIEWS[0];

  return (
    <main className="px-16 py-8">
      <h1 className="text-4xl font-bold">Admin dashboard page</h1>
      <nav aria-label="Dashboard tabs" className="mt-8 flex gap-8 border-b border-neutral-200">
        {TABS.map((t) => {
          const active = t.id === tab.id;
          return (
            <Link
              key={t.id}
              href={{ pathname: "/admin-dashboard", query: { tab: t.id } }}
              aria-current={active ? "page" : undefined}
              className={`-mb-px border-b-2 py-3 ${
                active ? "border-neutral-900 font-semibold" : "border-transparent text-neutral-500 hover:text-neutral-900"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>

      <section className="mt-6">
        <h2 className="text-2xl font-semibold">{tab.label} tab</h2>
        {tab.id === "schedule" && (
          <>
            <nav aria-label="Schedule views" className="mt-4 flex gap-4">
              {VIEWS.map((v) => {
                const active = v.id === view.id;
                return (
                  <Link
                    key={v.id}
                    href={{ pathname: "/admin-dashboard", query: { tab: "schedule", view: v.id } }}
                    aria-current={active ? "true" : undefined}
                    className={`border px-3 py-1 ${active ? "bg-neutral-900 text-white" : "border-neutral-300"}`}
                  >
                    {v.label}
                  </Link>
                );
              })}
            </nav>
            <p className="mt-4">{view.label}</p>
          </>
        )}
      </section>
    </main>
  );
}
