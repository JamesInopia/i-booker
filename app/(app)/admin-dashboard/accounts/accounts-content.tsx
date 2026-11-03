import { requireRole } from "@/lib/auth";
import { AccountsFilters } from "./accounts-filters";
import { AccountsTable } from "./accounts-table";
import { applyQuery, parseQuery } from "./filters";
import { getAccounts } from "./queries";

export type AccountsParams = { show?: string; q?: string };

export async function AccountsContent({ params }: { params: AccountsParams }) {
  await requireRole("admin_supervisor");

  const query = parseQuery(params);
  const visible = applyQuery(await getAccounts(), query);

  return (
    <div className="space-y-4">
      <AccountsFilters query={query} />
      <AccountsTable accounts={visible} />
    </div>
  );
}
