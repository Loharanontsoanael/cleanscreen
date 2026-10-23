import "server-only";
import { markedPdf } from "clocked-sdk";
import * as mupdf from "mupdf";
import { INJECTION_INSTRUCTIONS, PII_ENTITIES } from "./analysis";
import { callClockedPdf, type CallRecord } from "./clocked";
import { analysePdf, type HiddenSegment } from "./forensics";

/**
 * The two files a reviewer can take away. Clocked marks its own findings in the PDF (`return_pdf`);
 * CleanScreen adds what only its rendering can see, the hidden text, with MuPDF.
 */
export type DocumentKind = "blind" | "evidence";

const VIOLET: [number, number, number] = [0x5f / 255, 0x37 / 255, 0xdd / 255];
const IDENTITY_METADATA = ["Author", "Title", "Subject", "Keywords", "Creator"];

const toBase64 = (bytes: Uint8Array) => Buffer.from(bytes).toString("base64");

const HIDDEN_NOTE: Record<HiddenSegment["reason"], string> = {
  invisible: "Text a reader cannot see: it leaves no ink on the page",
  tiny: "Text too small to read",
  off_page: "Text placed outside the page",
  metadata: "Text in the file's metadata, never shown to a reader",
  unicode: "Invisible or disguised characters",
};

function edit(bytes: Uint8Array, change: (doc: mupdf.PDFDocument) => void): Uint8Array {
  const doc = mupdf.Document.openDocument(bytes, "application/pdf").asPDF();
  if (!doc) throw new Error("Not a PDF");
  try {
    change(doc);
    // asUint8Array() is a view into MuPDF's memory: copy the file out before the buffer is freed.
    const saved = doc.saveToBuffer("garbage,compress");
    const bytes = saved.asUint8Array().slice();
    saved.destroy();
    return bytes;
  } finally {
    doc.destroy();
  }
}

/** Each hidden line on its page, grouped by page. */
function hiddenLines(hidden: HiddenSegment[]) {
  const byPage = new Map<number, { rect: [number, number, number, number]; reason: HiddenSegment["reason"] }[]>();
  for (const h of hidden) {
    if (h.page === null) continue;
    for (const l of h.lines ?? []) byPage.set(h.page, [...(byPage.get(h.page) ?? []), { rect: l.bbox, reason: h.reason }]);
  }
  return byPage;
}

/**
 * The resume as the blind scoring read it: /pii redacts identity and protected characteristics,
 * then the hidden text is removed outright, so whoever reads this copy (person or AI) sees only
 * what the page shows.
 */
export async function blindCopy(bytes: Uint8Array, trail: CallRecord[], signal?: AbortSignal): Promise<Uint8Array> {
  const pdf = analysePdf(bytes);
  const data = await callClockedPdf(
    "pii",
    { pdf: toBase64(bytes), pdf_mode: "text", entities: PII_ENTITIES, return_pdf: "redact" },
    "Redact identity in the PDF for a blind copy",
    trail,
    { signal },
  );
  return edit(markedPdf(data), (doc) => {
    for (const [page, lines] of hiddenLines(pdf.hidden)) {
      const p = doc.loadPage(page - 1) as mupdf.PDFPage;
      for (const l of lines) p.createAnnotation("Redact").setRect(l.rect);
      // No black boxes (the text was invisible already), and images and drawings are left alone.
      p.applyRedactions(false, 0, 0, 0);
    }
    for (const key of IDENTITY_METADATA) doc.setMetaData(`info:${key}`, "");
  });
}

/**
 * The resume with every finding marked: /injection boxes instructions aimed at the AI in place,
 * and each hidden line gets a violet box with a note saying why no reader would see it.
 */
export async function evidenceCopy(bytes: Uint8Array, trail: CallRecord[], signal?: AbortSignal): Promise<Uint8Array> {
  const pdf = analysePdf(bytes);
  const data = await callClockedPdf(
    "injection",
    { pdf: toBase64(bytes), pdf_mode: "text", source: "content", instructions: INJECTION_INSTRUCTIONS, return_pdf: "box" },
    "Box instructions aimed at the AI screener in the PDF",
    trail,
    { signal },
  );
  // Nothing to mark comes back as no document; the original file is marked instead.
  let marked = bytes;
  try {
    marked = markedPdf(data);
  } catch {
    // keep the original
  }
  return edit(marked, (doc) => {
    for (const [page, lines] of hiddenLines(pdf.hidden)) {
      const p = doc.loadPage(page - 1) as mupdf.PDFPage;
      for (const l of lines) {
        const a = p.createAnnotation("Square");
        a.setRect([l.rect[0] - 2, l.rect[1] - 2, l.rect[2] + 2, l.rect[3] + 2]);
        a.setColor(VIOLET);
        a.setBorderWidth(1.5);
        a.setAuthor("CleanScreen");
        a.setContents(HIDDEN_NOTE[l.reason]);
        a.update();
      }
    }
    const unseen = pdf.hidden.filter((h) => h.page === null);
    if (unseen.length) {
      const p = doc.loadPage(0) as mupdf.PDFPage;
      const note = p.createAnnotation("Text");
      note.setRect([12, 12, 32, 32]);
      note.setColor(VIOLET);
      note.setAuthor("CleanScreen");
      note.setContents(unseen.map((h) => `${HIDDEN_NOTE[h.reason]}:\n${h.text}`).join("\n\n"));
      note.update();
    }
  });
}
