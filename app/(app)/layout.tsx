import { requireUser } from "@/lib/auth";
import { NAV_ITEMS, tabGroupsFor } from "@/lib/nav";
import { getNotifications } from "@/lib/notifications";
import { Header } from "./header";
import { Sidebar } from "./sidebar";
import { SessionWatcher } from "./session-watcher";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  const items = NAV_ITEMS.filter((item) => item.roles.includes(user.role));
  const tabGroups = tabGroupsFor(user.role);
  const notifications = await getNotifications(user.id);

  return (
    <div className="flex min-h-screen">
      <SessionWatcher />
      <Sidebar items={items} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          tabGroups={tabGroups}
          name={user.name || user.email}
          notifications={notifications}
        />
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
