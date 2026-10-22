import "server-only";
import * as mupdf from "mupdf";

/**
 * PDF forensics: separate what a human reviewer sees on the page from what a
 * text extractor (and therefore an AI screener) reads out of the same file.
 *
 * Detection is visual rather than rule-based: every run of text is located on
 * a rendered bitmap of the page, and a run that leaves no ink there is hidden,
 * whatever trick produced it (white text, matching background, invisible
 * render mode, text covered by a shape or image).
 */

export type HiddenReason = "invisible" | "tiny" | "off_page" | "metadata";

export interface TextRun {
  page: number;
  text: string;
  size: number;
  bbox: [number, number, number, number];
  hidden: HiddenReason | null;
}

export interface HiddenSegment {
  reason: HiddenReason;
  page: number | null;
  text: string;
  /** Where each line of the segment sits on its page, in PDF points (absent for metadata). */
  lines?: { text: string; size: number; bbox: [number, number, number, number] }[];
}

export interface PdfForensics {
  pageCount: number;
  /** Page sizes in PDF points, used to place hidden text over a rendering of the page. */
  pageSizes: { width: number; height: number }[];
  /** What a person sees on the rendered pages. */
  visibleText: string;
  /** What a text extractor reads: every run, hidden or not, plus metadata. */
  machineText: string;
  hidden: HiddenSegment[];
  metadata: Record<string, string>;
}

const RENDER_SCALE = 2;
const TINY_FONT_PT = 4;
const MIN_INK_RATIO = 0.01;
const META_KEYS = ["Title", "Author", "Subject", "Keywords", "Creator", "Producer"];

type Rect = [number, number, number, number];

function union(a: Rect | null, b: Rect): Rect {
  if (!a) return [...b];
  return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])];
}

function quadBox(q: number[]): Rect {
  const xs = [q[0], q[2], q[4], q[6]];
  const ys = [q[1], q[3], q[5], q[7]];
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

/** Share of pixels in a box that differ from the box's dominant colour. */
function inkRatio(pix: mupdf.Pixmap, box: Rect): number {
  const w = pix.getWidth();
  const h = pix.getHeight();
  const n = pix.getNumberOfComponents();
  const px = pix.getPixels();
  const x0 = Math.max(0, Math.floor(box[0] * RENDER_SCALE));
  const y0 = Math.max(0, Math.floor(box[1] * RENDER_SCALE));
  const x1 = Math.min(w, Math.ceil(box[2] * RENDER_SCALE));
  const y1 = Math.min(h, Math.ceil(box[3] * RENDER_SCALE));
  const counts = new Map<number, number>();
  const colours: number[] = [];
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * w + x) * n;
      // Quantise to 5 bits per channel so anti-aliasing noise collapses.
      const key = ((px[i] >> 3) << 10) | ((px[i + 1] >> 3) << 5) | (px[i + 2] >> 3);
      colours.push(key);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  if (colours.length === 0) return 0;
  let mode = 0;
  let best = -1;
  for (const [k, c] of counts) if (c > best) [mode, best] = [k, c];
  const dist = (a: number, b: number) =>
    Math.abs((a >> 10) - (b >> 10)) + Math.abs(((a >> 5) & 31) - ((b >> 5) & 31)) + Math.abs((a & 31) - (b & 31));
  let ink = 0;
  for (const c of colours) if (dist(c, mode) > 6) ink++;
  return ink / colours.length;
}

function classify(run: Omit<TextRun, "hidden">, bounds: Rect, pix: mupdf.Pixmap): HiddenReason | null {
  const [x0, y0, x1, y1] = run.bbox;
  const visibleW = Math.max(0, Math.min(x1, bounds[2]) - Math.max(x0, bounds[0]));
  const visibleH = Math.max(0, Math.min(y1, bounds[3]) - Math.max(y0, bounds[1]));
  if (visibleW * visibleH < 0.5 * (x1 - x0) * (y1 - y0)) return "off_page";
  if (run.size < TINY_FONT_PT) return "tiny";
  // Very short runs (a bullet, a full stop) carry too little ink to judge.
  if (run.text.replace(/\s/g, "").length >= 3 && inkRatio(pix, run.bbox) < MIN_INK_RATIO) return "invisible";
  return null;
}

export function analysePdf(bytes: Uint8Array): PdfForensics {
  const doc = mupdf.Document.openDocument(bytes, "application/pdf");
  try {
    const runs: TextRun[] = [];
    const pageCount = doc.countPages();
    const pageSizes: PdfForensics["pageSizes"] = [];
    for (let p = 0; p < pageCount; p++) {
      const page = doc.loadPage(p);
      const bounds = page.getBounds() as Rect;
      pageSizes.push({ width: bounds[2] - bounds[0], height: bounds[3] - bounds[1] });
      const pix = page.toPixmap(
        mupdf.Matrix.scale(RENDER_SCALE, RENDER_SCALE),
        mupdf.ColorSpace.DeviceRGB,
        false,
        true,
      );
      const stext = page.toStructuredText("preserve-whitespace,clip=no");
      let current: { text: string; size: number; colour: string; bbox: Rect | null } | null = null;
      const flush = () => {
        if (current && current.text.trim() && current.bbox) {
          const run = { page: p + 1, text: current.text, size: current.size, bbox: current.bbox };
          runs.push({ ...run, hidden: classify(run, bounds, pix) });
        }
        current = null;
      };
      stext.walk({
        beginLine() {
          flush();
        },
        endLine() {
          flush();
          // Marks the end of a line so visible and machine text keep their layout.
          runs.push({ page: p + 1, text: "\n", size: 0, bbox: [0, 0, 0, 0], hidden: null });
        },
        onChar(c, _origin, _font, size, quad, colour) {
          const key = JSON.stringify(colour);
          const rounded = Math.round(size * 10) / 10;
          if (!current || current.size !== rounded || current.colour !== key) {
            flush();
            current = { text: "", size: rounded, colour: key, bbox: null };
          }
          current.text += c;
          if (c.trim()) current.bbox = union(current.bbox, quadBox(quad as unknown as number[]));
        },
      });
      flush();
      stext.destroy();
      pix.destroy();
      page.destroy();
    }

    const metadata: Record<string, string> = {};
    for (const key of META_KEYS) {
      const value = doc.getMetaData(`info:${key}`);
      if (value && value.trim()) metadata[key] = value.trim();
    }

    // Consecutive hidden runs of the same kind form one segment, even across line breaks.
    const hidden: HiddenSegment[] = [];
    let previous: TextRun | null = null;
    for (const r of runs) {
      if (r.text === "\n") continue;
      const last = hidden[hidden.length - 1];
      const line = { text: r.text.trim(), size: r.size, bbox: r.bbox };
      if (r.hidden && previous?.hidden === r.hidden && last?.page === r.page) {
        last.text += ` ${line.text}`;
        last.lines?.push(line);
      } else if (r.hidden) hidden.push({ reason: r.hidden, page: r.page, text: line.text, lines: [line] });
      previous = r;
    }
    // Subject and Keywords are author-controlled free text that people never see; a title is
    // usually just the document name, so only an unusually long one is worth reading.
    for (const key of ["Subject", "Keywords", "Title"]) {
      const value = metadata[key];
      if (value && (key !== "Title" || value.length > 80)) {
        hidden.push({ reason: "metadata", page: null, text: `${key}: ${value}` });
      }
    }

    const join = (rs: TextRun[]) =>
      rs
        .map((r) => r.text)
        .join("")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
    const visibleText = join(runs.filter((r) => !r.hidden));
    const machineText = [join(runs), ...hidden.filter((h) => h.reason === "metadata").map((h) => h.text)].join("\n");

    return { pageCount, pageSizes, visibleText, machineText, hidden, metadata };
  } finally {
    doc.destroy();
  }
}

/** Renders one page of a PDF to PNG bytes, for showing the original document. */
export function renderPagePng(bytes: Uint8Array, pageIndex = 0, scale = 2): Uint8Array {
  const doc = mupdf.Document.openDocument(bytes, "application/pdf");
  try {
    const page = doc.loadPage(pageIndex);
    const pix = page.toPixmap(mupdf.Matrix.scale(scale, scale), mupdf.ColorSpace.DeviceRGB, false, true);
    const png = pix.asPNG();
    pix.destroy();
    page.destroy();
    return png;
  } finally {
    doc.destroy();
  }
}
