import { PDFDocument, StandardFonts } from "pdf-lib";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ArchiveDetail } from "@/lib/definitions";

const PAGE_H = 792;
const Y = (top: number) => PAGE_H - top;

const NATURE_BOXES: [number, number][] = [
  [50.3, 155.8],
  [209.3, 155.8],
  [332, 155.8],
  [486, 155.8],
  [50.3, 174],
  [209.3, 174],
  [332, 174],
];
const NATURE_KEYS = [
  "special",
  "academic",
  "institution",
  "adcomm",
  "independent",
  "extracurricular",
];

const COLS = {
  date: [45.6, 119.9],
  start: [125.2, 181.3],
  end: [188.8, 241.2],
  venue: [248.3, 308.8],
  pax: [316.5, 358.6],
  details: [365.9, 549.4],
} as const;
const HDR = {
  requestor: [79.8, 195.7],
  contact: [246.5, 332.9],
  program: [409.2, 478.8],
  filed: [505.3, 548.8],
} as const;

function natureIndex(nature: string) {
  const n = nature.toLowerCase();
  const i = NATURE_KEYS.findIndex((k) => n.includes(k));
  return i === -1 ? 6 : i;
}

const clip = (s: string, n: number) =>
  s.length > n ? s.slice(0, n).trimEnd() + "\u2026" : s;

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const shortMonth = (s: string) =>
  MONTHS.reduce((out, m) => out.replace(m, m.slice(0, 3)), s);

async function fillOne(
  out: PDFDocument,
  templateBytes: Uint8Array,
  d: ArchiveDetail,
) {
  const [page] = await out.copyPages(
    await PDFDocument.load(templateBytes),
    [0],
  );
  out.addPage(page);
  const font = await out.embedFont(StandardFonts.Helvetica);
  const bold = await out.embedFont(StandardFonts.HelveticaBold);

  const safe = (s: string) =>
    String(s ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .split("")
      .map((c) => {
        try {
          font.encodeText(c);
          return c;
        } catch {
          return "?";
        }
      })
      .join("");
  const W = (t: string, sz: number) => font.widthOfTextAtSize(t, sz);

  const text = (
    raw: string,
    x: number,
    top: number,
    w: number,
    size = 7,
    minSize = 5,
    wrap = true,
    center = false,
  ) => {
    const t = safe(raw),
      maxW = w - 7;
    let sz = size;
    while (sz > minSize && W(t, sz) > maxW) sz -= 0.5;
    if (W(t, sz) <= maxW) {
      page.drawText(t, {
        x: center ? x + (w - W(t, sz)) / 2 : x + 4,
        y: Y(top + 0.36 * sz),
        font,
        size: sz,
      });
      return;
    }
    if (!wrap) {
      let c = t;
      while (c.length > 1 && W(c + "\u2026", sz) > maxW) c = c.slice(0, -1);
      page.drawText(c + "\u2026", {
        x: x + 4,
        y: Y(top + 0.36 * sz),
        font,
        size: sz,
      });
      return;
    }

    sz = minSize;
    const words = t.split(" ");
    let l1 = "";
    while (words.length && W((l1 + " " + words[0]).trim(), sz) <= maxW)
      l1 = (l1 + " " + words.shift()).trim();
    if (!l1) {
      l1 = words.shift() ?? "";
      while (l1.length > 1 && W(l1, sz) > maxW) l1 = l1.slice(0, -1);
    }
    const full = words.join(" ");
    let l2 = full;
    while (l2.length > 1 && W(l2 + (l2 !== full ? "\u2026" : ""), sz) > maxW)
      l2 = l2.slice(0, -1);
    if (l2 !== full) l2 += "\u2026";
    page.drawText(l1, {
      x: x + 4,
      y: Y(top - 2.7 + 0.36 * sz),
      font,
      size: sz,
    });
    page.drawText(l2, {
      x: x + 4,
      y: Y(top + 2.7 + 0.36 * sz),
      font,
      size: sz,
    });
  };

  const idx = natureIndex(d.nature);
  const [cx, cy] = NATURE_BOXES[idx];
  page.drawText("X", { x: cx - 3, y: Y(cy) - 3, font: bold, size: 9 });
  if (idx === 6)
    text(clip(d.natureOther || d.nature, 70), 429.1, 173, 112.7, 7, 5);

  const time = `${d.startTime} - ${d.endTime}`;

  for (const [h, r] of [
    [210.5, 242.8],
    [464.2, 496.4],
  ]) {
    text(
      d.requestor,
      HDR.requestor[0],
      h,
      HDR.requestor[1] - HDR.requestor[0],
      7,
      5,
      false,
    );
    text(
      d.contactDetails,
      HDR.contact[0],
      h,
      HDR.contact[1] - HDR.contact[0],
      7,
      5,
      false,
    );
    text(
      d.program,
      HDR.program[0],
      h,
      HDR.program[1] - HDR.program[0],
      7,
      5,
      false,
    );
    text(
      shortMonth(d.dateFiled),
      HDR.filed[0],
      h,
      HDR.filed[1] - HDR.filed[0],
      6,
      4.5,
      false,
    );
    const row: [keyof typeof COLS, string][] = [
      ["date", shortMonth(d.dateOfActivity)],
      ["start", d.startTime],
      ["end", d.endTime],
      ["venue", d.venue],
      ["pax", String(d.participants)],
      ["details", clip(d.details, 140)],
    ];
    for (const [k, v] of row)
      text(
        v,
        COLS[k][0],
        r,
        COLS[k][1] - COLS[k][0],
        6.5,
        k === "details" ? 4.5 : 5,
        true,
        k === "start" || k === "end",
      );
  }

  text(d.requestor, 78, 340.5, 135, 7, 5, false);
  text(d.venue, 66, 350, 147, 7, 5, false);
  text(
    `${shortMonth(d.dateOfActivity)}  ${time}`,
    122,
    359.7,
    92,
    6.5,
    4.5,
    false,
  );
}

export async function buildRequestsPdf(details: ArchiveDetail[]) {
  const tpl = await readFile(
    path.join(process.cwd(), "public/forms/activity-request-format.pdf"),
  );
  const out = await PDFDocument.create();
  for (const d of details) await fillOne(out, tpl, d);
  return out.save();
}
