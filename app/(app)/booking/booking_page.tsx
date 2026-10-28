"use client";

import { useState } from "react";
import type { Room } from "@/lib/rooms";

export default function BookingPage({ rooms }: { rooms: Room[] }) {
  const [search, setSearch] = useState("");

  const filteredRooms = rooms.filter((room) =>
    room.room_name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <main>
      <h1>i-Booker Room Booking</h1>

      <input
        type="search"
        placeholder="Search for a room"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {filteredRooms.map((room) => (
        <div key={room.room_id}>
          <h2>{room.room_name}</h2>
          <p>Capacity: {room.max_capacity ?? "Not specified"}</p>
          <p>{room.description}</p>
          <button type="button">Book Room</button>
        </div>
      ))}
    </main>
  );
}
