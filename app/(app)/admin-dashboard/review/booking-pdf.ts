import { STATUS_LABEL, type ReviewBooking } from "./types";

const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN = 56;
const CONTENT_W = PAGE_W - MARGIN * 2;
const LABEL_W = 130;

function sanitize(s: string): string {
  return s
    .replace(/[–—]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, "...")
    .replace(/[\ud800-\udbff][\udc00-\udfff]/g, "?")
    .replace(/\r/g, "")
    .replace(/\t/g, " ")
    .replace(/[^\n\x20-\x7e\xa0-\xff]/g, "?");
}

const escapePdf = (s: string) => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

function charWidth(c: string): number {
  if (c === " ") return 0.278;
  if ("iljtf.,:;'|!I()".includes(c)) return 0.3;
  if ("mwMW".includes(c)) return 0.84;
  if (c >= "A" && c <= "Z") return 0.68;
  if (c >= "0" && c <= "9") return 0.556;
  return 0.54;
}

function textWidth(s: string, size: number, bold: boolean): number {
  let w = 0;
  for (const c of s) w += charWidth(c);
  return w * size * (bold ? 1.06 : 1);
}

function wrap(text: string, size: number, maxWidth: number, bold = false): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const rawWord of paragraph.split(" ")) {
      let word = rawWord;
      while (textWidth(word, size, bold) > maxWidth) {
        let cut = word.length - 1;
        while (cut > 1 && textWidth(word.slice(0, cut), size, bold) > maxWidth) cut--;
        if (line) {
          lines.push(line);
          line = "";
        }
        lines.push(word.slice(0, cut));
        word = word.slice(cut);
      }
      const candidate = line ? `${line} ${word}` : word;
      if (line && textWidth(candidate, size, bold) > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    lines.push(line);
  }
  return lines;
}

class Writer {
  pages: string[][] = [];
  private ops: string[] = [];
  y = 0;

  newPage() {
    this.ops = [];
    this.pages.push(this.ops);
    this.y = PAGE_H - MARGIN;
  }

  ensure(height: number) {
    if (this.y - height < MARGIN) this.newPage();
  }

  text(x: number, size: number, bold: boolean, s: string) {
    this.ops.push(`BT /${bold ? "F2" : "F1"} ${size} Tf ${x} ${this.y.toFixed(2)} Td (${escapePdf(s)}) Tj ET`);
  }

  line(text: string, size: number, bold = false, gapAfter = 0) {
    const lineHeight = size * 1.45;
    this.ensure(bold && size >= 12 ? lineHeight + 60 : lineHeight);
    this.y -= size;
    this.text(MARGIN, size, bold, text);
    this.y -= lineHeight - size + gapAfter;
  }

  gap(h: number) {
    this.y -= h;
  }

  rule() {
    this.ensure(10);
    this.y -= 4;
    this.ops.push(`0.8 w ${MARGIN} ${this.y.toFixed(2)} m ${PAGE_W - MARGIN} ${this.y.toFixed(2)} l S`);
    this.y -= 10;
  }

  field(label: string, value: string) {
    const size = 10.5;
    const lineHeight = size * 1.45;
    const lines = wrap(sanitize(value) || "-", size, CONTENT_W - LABEL_W);
    lines.forEach((l, i) => {
      this.ensure(lineHeight);
      this.y -= size;
      if (i === 0) this.text(MARGIN, size, true, label);
      this.text(MARGIN + LABEL_W, size, false, l);
      this.y -= lineHeight - size;
    });
  }
}

function writeBooking(w: Writer, b: ReviewBooking, generatedOn: string) {
  w.newPage();
  w.line("iACADEMY CEBU", 9, true, 2);
  w.line("Room Reservation - Booking Details", 18, true, 2);
  w.line(`Request No. ${b.id}   |   Status: ${STATUS_LABEL[b.status]}`, 10.5);
  w.rule();

  w.line("Requester", 12.5, true, 3);
  w.field("Name", b.requestor);
  w.field("Email", b.email);
  w.field("Contact No.", b.contact);
  if (b.program) w.field("Program", b.program);

  w.gap(10);
  w.line("Booking", 12.5, true, 3);
  w.field("Purpose", b.purpose);
  w.field("Date of Request", b.requestDate);

  b.slots.forEach((s, i) => {
    w.gap(10);
    w.line(b.slots.length > 1 ? `Schedule ${i + 1} of ${b.slots.length}` : "Schedule", 12.5, true, 3);
    w.field("Date", s.date);
    w.field("Time", s.time);
    w.field("Room", s.rooms.join(", "));
    w.field("No. of Occupants", String(s.occupants));
    w.field("Description", s.details);
  });

  w.gap(10);
  w.line("Approval", 12.5, true, 3);
  w.field("Approved on", b.status === "approved" ? (b.decidedAt ?? "") : "");
  if (b.liaisonRemarks) w.field("Liaison remarks", b.liaisonRemarks);
  if (b.supervisorRemarks) w.field("Supervisor remarks", b.supervisorRemarks);

  w.gap(14);
  w.rule();
  w.line(`Generated on ${generatedOn}`, 9);
}

export function buildBookingPdf(bookings: ReviewBooking[]): Uint8Array<ArrayBuffer> {
  const generatedOn = new Date().toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    dateStyle: "medium",
    timeStyle: "short",
  });

  const w = new Writer();
  for (const b of bookings) writeBooking(w, b, sanitize(generatedOn));

  const bodies: string[] = [];
  const pageIds = w.pages.map((_, i) => 5 + i * 2);
  bodies[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  bodies[2] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;
  bodies[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
  bodies[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";
  w.pages.forEach((ops, i) => {
    const content = ops.join("\n");
    bodies[5 + i * 2] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] ` +
      `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${6 + i * 2} 0 R >>`;
    bodies[6 + i * 2] = `<< /Length ${content.length} >>\nstream\n${content}\nendstream`;
  });

  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (let id = 1; id < bodies.length; id++) {
    offsets[id] = out.length;
    out += `${id} 0 obj\n${bodies[id]}\nendobj\n`;
  }
  const xrefAt = out.length;
  out += `xref\n0 ${bodies.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < bodies.length; id++) out += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  out += `trailer\n<< /Size ${bodies.length} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`;

  const bytes = new Uint8Array(out.length);
  for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 0xff;
  return bytes;
}
