import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { resolveTab } from "@/lib/nav";

const VIEWS = [
  { id: "a", label: "View A" },
  { id: "b", label: "View B" },
] as const;

type Params = { tab?: string | string[]; view?: string | string[] };

const first = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v);

export default async function AdminDashboardPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const user = await requireUser();
  const tab = resolveTab("/admin-dashboard", user.role, first(params.tab));
  const view = VIEWS.find((v) => v.id === first(params.view)) ?? VIEWS[0];

  return (
    <main className="px-16 pb-8 pt-2">
      <h1 className="text-4xl font-bold">Admin dashboard page</h1>

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
