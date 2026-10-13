// DEV ONLY
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { ACCOUNTS } from "../lib/accounts";

if (process.env.NODE_ENV === "production") {
  console.error("Refusing to seed mock accounts with NODE_ENV=production.");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
if (!url || !secretKey) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env first.");
  process.exit(1);
}

const supabase = createClient(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });

async function findUserId(email: string): Promise<string | null> {
  const perPage = 200;
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (hit) return hit.id;
    if (data.users.length < perPage) return null;
  }
}

async function main() {
  for (const account of ACCOUNTS) {
    if (!account.password) {
      console.log(`skipped ${account.email} (no password set in lib/accounts.ts)`);
      continue;
    }

    const name = account.email.split("@")[0].replace(/^./, (c) => c.toUpperCase());
    const attributes = { password: account.password, email_confirm: true, user_metadata: { full_name: name } };

    let id = await findUserId(account.email);
    if (id) {
      const { error } = await supabase.auth.admin.updateUserById(id, attributes);
      if (error) throw error;
    } else {
      const { data, error } = await supabase.auth.admin.createUser({ email: account.email, ...attributes });
      if (error) throw error;
      id = data.user.id;
    }
    
    const { error } = await supabase
      .from("users")
      .upsert({ user_id: id, email: account.email, name, role: account.role }, { onConflict: "user_id" });
    if (error) throw error;

    console.log(`ok  ${account.email}  ->  ${account.role}`);
  }
}

main().catch((err) => {
  console.error("Seeding failed:", err?.message ?? err);
  process.exit(1);
});
