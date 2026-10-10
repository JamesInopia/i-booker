import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NAV_ITEMS } from "@/lib/nav";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";
import { Sidebar } from "./sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) redirect("/login");

  const items = NAV_ITEMS.filter((item) => item.roles.includes(session.role));

  return (
    <div className="flex min-h-screen">
      <Sidebar items={items} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}