import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("Set DATABASE_URL in .env");

const client = postgres(url, { prepare: false });
export const db = drizzle({ client });
