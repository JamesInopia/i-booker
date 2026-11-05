import JSZip from "jszip";
import {
  AlignmentType,
  Document,
  HorizontalPositionRelativeFrom,
  ImageRun,
  LineRuleType,
  Packer,
  Paragraph,
  Textbox,
  TextRun,
  VerticalPositionRelativeFrom,
} from "docx";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ArchiveDetail } from "./definitions";

const OFF = 12;
const INSET_X = 7.2;
const INSET_Y = 3.6;

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

const tw = (pt: number) => Math.round(pt * 20);
const shortMonth = (s: string) =>
  MONTHS.reduce((o, m) => o.replace(m, m.slice(0, 3)), s);
const clip = (s: string, n: number) =>
  s.length > n ? s.slice(0, n).trimEnd() + "\u2026" : s;
const natureIndex = (n: string) => {
  const i = NATURE_KEYS.findIndex((k) => n.toLowerCase().includes(k));
  return i === -1 ? 6 : i;
};

let fontPromise: Promise<Awaited<ReturnType<PDFDocument["embedFont"]>>> | null =
  null;
const measureFont = () =>
  (fontPromise ??= PDFDocument.create().then((d) =>
    d.embedFont(StandardFonts.Helvetica),
  ));

type Fitted = { lines: string[]; sz: number };

function fit(
  W: (t: string, sz: number) => number,
  t: string,
  w: number,
  size: number,
  minSize: number,
  maxLines: 1 | 2,
): Fitted {
  const maxW = w - 7;
  let sz = size;
  while (sz > minSize && W(t, sz) > maxW) sz -= 0.5;
  if (W(t, sz) <= maxW) return { lines: [t], sz };
  if (maxLines === 1) {
    let c = t;
    while (c.length > 1 && W(c + "\u2026", sz) > maxW) c = c.slice(0, -1);
    return { lines: [c + "\u2026"], sz };
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
  return { lines: [l1, l2], sz };
}

type FieldOpts = {
  size?: number;
  minSize?: number;
  lines?: 1 | 2;
  center?: boolean;
  lift?: number;
};

async function buildPage(d: ArchiveDetail, bg: Uint8Array) {
  const font = await measureFont();
  const W = (t: string, sz: number) => font.widthOfTextAtSize(t, sz);
  const boxes: Textbox[] = [];

  const field = (
    raw: string,
    x: number,
    cy: number,
    w: number,
    o: FieldOpts = {},
  ) => {
    const t = String(raw ?? "")
      .replace(/\s+/g, " ")
      .trim();
    if (!t) return;
    const f = fit(W, t, w, o.size ?? 7, o.minSize ?? 5, o.lines ?? 1);
    const lh = f.sz * 1.15;
    const h = lh * f.lines.length;
    const center = o.center ?? false;
    const lift = f.lines.length === 2 ? (o.lift ?? 0) : 0;
    boxes.push(
      new Textbox({
        style: {
          position: "absolute",
          positionHorizontalRelative: "page",
          positionVerticalRelative: "page",
          left: `${x + OFF + (center ? 0 : 4) - INSET_X}pt`,
          top: `${cy + OFF - h / 2 - INSET_Y - lift}pt`,
          width: `${(center ? w : w - 4) + INSET_X * 2}pt`,
          height: `${h + INSET_Y * 2}pt`,
          zIndex: 5,
        },
        children: [
          new Paragraph({
            alignment: center ? AlignmentType.CENTER : AlignmentType.LEFT,
            spacing: {
              before: 0,
              after: 0,
              line: tw(lh),
              lineRule: LineRuleType.EXACT,
            },
            children: f.lines.map(
              (l, i) =>
                new TextRun({
                  text: l,
                  font: "Arial",
                  size: Math.round(f.sz * 2),
                  break: i ? 1 : 0,
                }),
            ),
          }),
        ],
      }),
    );
  };

  const idx = natureIndex(d.nature);
  const [cx, cy] = NATURE_BOXES[idx];
  field("X", cx - 7, cy, 14, { size: 9, center: true });
  if (idx === 6)
    field(clip(d.natureOther || d.nature, 70), 429.1, 173, 112.7, {
      size: 7,
      minSize: 5,
      lines: 2,
      lift: 2,
    });

  const time = `${d.startTime}-${d.endTime}`;
  for (const [h, r] of [
    [210.5, 242.8],
    [464.2, 496.4],
  ]) {
    field(
      d.requestor,
      HDR.requestor[0],
      h,
      HDR.requestor[1] - HDR.requestor[0],
    );
    field(d.contactDetails, HDR.contact[0], h, HDR.contact[1] - HDR.contact[0]);
    field(d.program, HDR.program[0], h, HDR.program[1] - HDR.program[0]);
    field(
      shortMonth(d.dateFiled),
      HDR.filed[0],
      h,
      HDR.filed[1] - HDR.filed[0],
      { size: 6, minSize: 4.5 },
    );
    const row: [keyof typeof COLS, string][] = [
      ["date", shortMonth(d.dateOfActivity)],
      ["start", d.startTime],
      ["end", d.endTime],
      ["venue", d.venue],
      ["pax", String(d.participants)],
      ["details", clip(d.details, 140)],
    ];

    for (const [k, v] of row) {
      field(v, COLS[k][0], r, COLS[k][1] - COLS[k][0], {
        size: 6.5,
        minSize: k === "details" ? 4.5 : 5,
        lines: k === "venue" || k === "details" ? 2 : 1,
        center: k === "start" || k === "end",
      });
    }
  }
  field(d.requestor, 78, 340.5, 135);
  field(d.venue, 66, 350, 147);
  field(`${shortMonth(d.dateOfActivity)}  ${time}`, 122, 359.7, 92, {
    size: 6.5,
    minSize: 4.5,
  });

  const image = new ImageRun({
    type: "jpg",
    data: bg,
    transformation: { width: 816, height: 1056 },
    floating: {
      horizontalPosition: {
        relative: HorizontalPositionRelativeFrom.PAGE,
        offset: 0,
      },
      verticalPosition: {
        relative: VerticalPositionRelativeFrom.PAGE,
        offset: 0,
      },
      behindDocument: true,
      allowOverlap: true,
    },
  });
  return new Paragraph({
    spacing: { before: 0, after: 0 },
    children: [image, ...boxes],
  });
}

export async function buildRequestsDocx(details: ArchiveDetail[]) {
  const bg = await readFile(
    path.join(process.cwd(), "public/forms/activity-request-format.jpg"),
  );
  const sections = [];
  for (const d of details) {
    sections.push({
      properties: {
        page: {
          size: { width: tw(612), height: tw(792) },
          margin: {
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            header: 0,
            footer: 0,
          },
        },
      },
      children: [await buildPage(d, bg)],
    });
  }
  const buf = await Packer.toBuffer(new Document({ sections }));

  const zip = await JSZip.loadAsync(buf);
  const xml = await zip.file("word/document.xml")!.async("string");
  zip.file(
    "word/document.xml",
    xml.replace(/<v:shape\b/g, '<v:shape stroked="f" filled="f"'),
  );
  return zip.generateAsync({ type: "nodebuffer" });
}
