//sample only

import type { ArchiveRow } from "@/lib/definitions";

export const SAMPLE_ROWS: ArchiveRow[] = [
  {
    id: 5,
    requestor: "Kim Rondrique",
    purpose: "Study Session",
    room: "Lecture Room 2",
    requestDate: "02-11-2026",
    scheduledDate: "08-11-2026",
    status: "approved",
  },
  {
    id: 4,
    requestor: "James Inopia",
    purpose: "Dance Practice",
    room: "Lecture Room 2",
    requestDate: "28-10-2026",
    scheduledDate: "04-11-2026",
    status: "approved",
  },
  {
    id: 3,
    requestor: "Harvey Ablen",
    purpose: "Make-up Class",
    room: "Lecture Room 2",
    requestDate: "13-10-2026",
    scheduledDate: "17-10-2026",
    status: "approved",
  },
  {
    id: 2,
    requestor: "Noah Lonoy",
    purpose: "Others",
    room: "Animation Studio",
    requestDate: "28-9-2026",
    scheduledDate: "5-10-2026",
    status: "rejected",
  },
  {
    id: 1,
    requestor: "Jezcois Garganza",
    purpose: "Study Session",
    room: "Digital Cinematic",
    requestDate: "6-9-2026",
    scheduledDate: "10-9-2026",
    status: "cancelled",
  },
];
