import "server-only";
import * as mupdf from "mupdf";
import { LIMITS } from "./limits";

/**
 * PDF forensics: separate what a human reviewer sees on the page from what a
 * text extractor (and therefore an AI screener) reads out of the same file.
 *
 * Detection is visual rather than rule-based: every run of text is located on
 * a rendered bitmap of the page, and a run that leaves no ink there is hidden,
 * whatever trick produced it (white text, matching background, invisible
 * render mode, text covered by a shape or image).
 */

export type HiddenReason = "invisible" | "tiny" | "off_page" | "metadata" | "unicode";

/** Characters that change what a machine reads without changing what a person sees. */
export type UnicodeTrick = "tag" | "zero_width" | "bidi" | "homoglyph";

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
  /** For reason "unicode": which kind of character trick. */
  trick?: UnicodeTrick;
}

export interface PdfForensics {
  pageCount: number;
  /** Page sizes in PDF points, used to place hidden text over a rendering of the page. */
  pageSizes: { width: number; height: number }[];
  /** What a person sees on the rendered pages. */
  visibleText: string;
  /** What a text extractor reads: every run, hidden or not, plus metadata and decoded tag characters. */
  machineText: string;
  hidden: HiddenSegment[];
  metadata: Record<string, string>;
}

const RENDER_SCALE = 2;
const TINY_FONT_PT = 4;
const MIN_INK_RATIO = 0.01;
const META_KEYS = ["Title", "Author", "Subject", "Keywords", "Creator", "Producer"];
/** Words that only say what the document is. */
const DOCUMENT_WORDS = new Set(["resume", "résumé", "cv", "curriculum", "vitae", "document", "profile", "portfolio", "of", "the", "and"]);

const words = (t: string) => t.toLowerCase().match(/[\p{L}\p{N}+#.]+/gu)?.map((w) => w.replace(/\.$/, "")) ?? [];

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

/** Unicode tag characters: invisible copies of ASCII, used to smuggle text past a reader. */
const TAG_RUN = /(\u{1F3F4}?)([\u{E0000}-\u{E007F}]+)/gu;
/** Characters with no width. A joiner between two Latin letters has no legitimate use. */
const ZERO_WIDTH = /[\u200B\u2060\uFEFF\u180E\u2061-\u2064]|(?<=\p{Script=Latin})[\u200C\u200D](?=\p{Script=Latin})/gu;
const HAS_ZERO_WIDTH = new RegExp(ZERO_WIDTH.source, "u");
/** Overrides reorder the characters on screen; embeddings and isolates only matter outside RTL text. */
const BIDI_OVERRIDE = /[\u202D\u202E]/gu;
const BIDI_OTHER = /[\u202A-\u202C\u2066-\u2069]/gu;
const RTL_SCRIPT = /[\p{Script=Arabic}\p{Script=Hebrew}]/u;
/** Cyrillic and Greek letters drawn like Latin ones (µ and μ are left out: "μs" is ordinary). */
const LOOKALIKE = /[аеорсухіјѕһԁԛԝАВЕКМНОРСТХІЈЅΑΒΕΖΗΙΚΜΝΟΡΤΥΧο]/u;
/** What never reaches a reader's eye, removed from the visible text. */
const INVISIBLE_CHARS = /[\u{E0000}-\u{E007F}\u200B\u2060\uFEFF\u180E\u2061-\u2064\u202A-\u202E\u2066-\u2069]/gu;
/** A few stray zero-width characters come from copy and paste; more than this is deliberate. */
const ZERO_WIDTH_MIN = 3;

const sample = (items: string[]) => {
  const unique = [...new Set(items)];
  return unique.slice(0, 8).join(", ") + (unique.length > 8 ? `, and ${unique.length - 8} more` : "");
};

/**
 * Text-level tricks a rendered page cannot show: invisible tag characters carrying a message,
 * zero-width characters splitting words, direction controls reordering them, and letters from
 * another alphabet that look Latin.
 */
export function findUnicodeTricks(text: string): HiddenSegment[] {
  const found: HiddenSegment[] = [];
  const add = (trick: UnicodeTrick, t: string) => found.push({ reason: "unicode", trick, page: null, text: t });

  const tagged: string[] = [];
  for (const [, flag, run] of text.matchAll(TAG_RUN)) {
    if (flag) continue; // regional flag emoji (🏴 followed by tags) are ordinary
    const decoded = Array.from(run, (ch) => ch.codePointAt(0)! - 0xe0000)
      .filter((cp) => cp >= 0x20 && cp < 0x7f)
      .map((cp) => String.fromCharCode(cp))
      .join("");
    if (decoded.trim()) tagged.push(decoded.trim());
  }
  if (tagged.length) add("tag", tagged.join("\n"));

  const zeroWidth = text.match(ZERO_WIDTH)?.length ?? 0;
  if (zeroWidth >= ZERO_WIDTH_MIN) {
    const split = (text.match(/[\p{L}\p{N}\u200B-\u200D\u2060\uFEFF\u180E\u2061-\u2064]+/gu) ?? [])
      .filter((w) => HAS_ZERO_WIDTH.test(w))
      .map((w) => w.replace(INVISIBLE_CHARS, "").replace(/[\u200C\u200D]/g, ""));
    add("zero_width", `${zeroWidth} zero-width characters hidden in the text, in: ${sample(split)}`);
  }

  const overrides = text.match(BIDI_OVERRIDE)?.length ?? 0;
  const others = RTL_SCRIPT.test(text) ? 0 : (text.match(BIDI_OTHER)?.length ?? 0);
  if (overrides + others) add("bidi", `${overrides + others} text-direction controls that change the order characters are displayed in`);

  const mixed = (text.match(/\p{L}+/gu) ?? []).filter((w) => /\p{Script=Latin}/u.test(w) && LOOKALIKE.test(w));
  if (mixed.length) add("homoglyph", `Words spelled with look-alike letters from another alphabet: ${sample(mixed)}`);
  return found;
}

/** A file CleanScreen cannot screen, with a reason a person can act on. */
export class UnreadablePdf extends Error {}

/** Fewer visible characters than this means the PDF is a scan or an image with no text layer. */
const MIN_TEXT_CHARS = 80;

export function analysePdf(bytes: Uint8Array, maxPages: number = LIMITS.pdfPages): PdfForensics {
  let doc: mupdf.Document;
  try {
    doc = mupdf.Document.openDocument(bytes, "application/pdf");
  } catch {
    throw new UnreadablePdf("The file could not be opened as a PDF.");
  }
  try {
    if (doc.needsPassword()) throw new UnreadablePdf("The PDF is password-protected.");
    const runs: TextRun[] = [];
    const pageCount = doc.countPages();
    if (pageCount === 0) throw new UnreadablePdf("The PDF has no pages.");
    if (pageCount > maxPages) throw new UnreadablePdf(`The PDF has ${pageCount} pages; resumes of up to ${maxPages} pages are screened.`);
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
      // mupdf.js hands each character to onChar through String.fromCharCode, which drops the high
      // bits of anything beyond U+FFFF: an invisible tag character U+E0052 arrives as a visible "R".
      // The page's text export keeps them whole and comes in the same order, so each character is
      // matched back to it.
      const whole = Array.from(stext.asText());
      let cursor = 0;
      const restore = (c: string) => {
        for (let k = cursor; k < Math.min(whole.length, cursor + 4); k++) {
          if ((whole[k].codePointAt(0)! & 0xffff) === c.charCodeAt(0)) {
            cursor = k + 1;
            return whole[k];
          }
        }
        return c;
      };
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
        onChar(raw, _origin, _font, size, quad, colour) {
          const c = restore(raw);
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
    // usually just the document name, so only an unusually long one is worth reading. Metadata
    // that only names the document ("Curriculum vitae", "resume, cv") or repeats words from the
    // page adds nothing a reader can't see, so it is left out.
    const pageWords = new Set(words(runs.filter((r) => !r.hidden).map((r) => r.text).join(" ")));
    for (const key of ["Subject", "Keywords", "Title"]) {
      const value = metadata[key];
      if (!value || (key === "Title" && value.length <= 80)) continue;
      const novel = words(value).filter((w) => !pageWords.has(w) && !DOCUMENT_WORDS.has(w));
      if (novel.length) hidden.push({ reason: "metadata", page: null, text: `${key}: ${value}` });
    }

    // A hidden run made only of invisible characters is reported below, decoded, not as raw text.
    for (let i = hidden.length - 1; i >= 0; i--) {
      if (hidden[i].reason === "metadata") continue;
      hidden[i].text = hidden[i].text.replace(INVISIBLE_CHARS, "").trim();
      if (!hidden[i].text) hidden.splice(i, 1);
    }

    const join = (rs: TextRun[]) =>
      rs
        .map((r) => r.text)
        .join("")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
    const visibleText = join(runs.filter((r) => !r.hidden)).replace(INVISIBLE_CHARS, "");
    const raw = join(runs);
    hidden.push(...findUnicodeTricks(raw));
    // The character tricks are reported above; what follows reads the words. Invisible characters
    // are taken out (a word split by zero-width spaces is still the word), tag characters are
    // read as the text they encode, and metadata is added because a text extractor reads it too.
    const appended = hidden.filter((h) => h.reason === "metadata" || h.trick === "tag").map((h) => h.text);
    const machineText = [raw.replace(INVISIBLE_CHARS, ""), ...appended].join("\n");

    if (visibleText.replace(/\s/g, "").length < MIN_TEXT_CHARS) {
      throw new UnreadablePdf("The PDF has no readable text; it looks like a scan. Export the resume as a text PDF.");
    }
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
