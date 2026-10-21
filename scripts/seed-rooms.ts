// DEV ONLY
import "dotenv/config";
import { db } from "../db";
import { rooms } from "../db/schema";

const SAMPLE_ROOMS = [
  { name: "Animation Studio", maxCapacity: 30, description: "Sample room: studio with animation workstations." },
  { name: "Computer Laboratory 1", maxCapacity: 40, description: "Sample room: computer laboratory." },
  { name: "Lecture Room 101", maxCapacity: 45, description: "Sample room: standard lecture room." },
  { name: "Multi-Purpose Room (MPR)", maxCapacity: 150, description: "Sample room: events and large gatherings." },
];

async function main() {
  if (process.env.NODE_ENV === "production") {
    console.error("Refusing to seed sample rooms with NODE_ENV=production.");
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error("Set DATABASE_URL in .env first.");
    process.exit(1);
  }

  const inserted = await db
    .insert(rooms)
    .values(SAMPLE_ROOMS)
    .onConflictDoNothing({ target: rooms.name })
    .returning({ name: rooms.name });
  console.log(inserted.length ? `added: ${inserted.map((r) => r.name).join(", ")}` : "nothing to add (rooms already exist)");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seeding rooms failed:", err?.message ?? err);
  process.exit(1);
});