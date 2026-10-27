import { createClient } from "@/lib/supabase/server";

export type Room = {
  room_id: number;
  room_name: string;
  description: string | null;
  max_capacity: number | null;
  prohibitions: string | null;
  thumbnail: string | null;
  status: string;
};

export async function getRooms(): Promise<Room[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("room")
    .select(
      "room_id, room_name, description, max_capacity, prohibitions, thumbnail, status",
    )
    .eq("status", "available")
    .order("room_name", { ascending: true });

  if (error) {
    throw new Error(`Failed to load rooms: ${error.message}`);
  }

  return data ?? [];
}
