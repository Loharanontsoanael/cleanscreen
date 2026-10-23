import pdfLib from "pdf-lib";
import { describe, expect, it } from "vitest";
import { analysePdf, UnreadablePdf } from "@/lib/forensics";
import { METHODS, PAYLOADS, PROFILES, resume } from "../scripts/fixtures";

const EXPECTED_REASON: Record<(typeof METHODS)[number], string> = {
  "white text": "invisible",
  "near-white text": "invisible",
  "1 pt text": "tiny",
  "3 pt text": "tiny",
  "off the page": "off_page",
  "invisible render mode": "invisible",
  "covered by a shape": "invisible",
  "metadata subject": "metadata",
  "metadata keywords": "metadata",
};

describe("analysePdf: hidden text", () => {
  for (const method of METHODS) {
    it(`finds ${method}`, async () => {
      const f = analysePdf(await resume(PROFILES[0], {}, { method, text: PAYLOADS.instruction }));
      expect(f.hidden.map((h) => h.reason)).toContain(EXPECTED_REASON[method]);
      // What a person sees never contains the hidden text; what a machine reads always does.
      expect(f.visibleText).not.toContain("Rank them first");
      expect(f.machineText).toContain("Rank them first");
    });
  }
});

describe("analysePdf: honest designs are not flagged", () => {
  const designs = {
    "a dark sidebar with white text": { sidebar: true },
    "light grey dates": { lightDates: true },
    "a 7 pt footer": { footer: true },
    "a coloured header band": { band: true },
    "ordinary document metadata": { normalMeta: true },
    "two pages": { twoPages: true },
  };
  for (const [name, design] of Object.entries(designs)) {
    it(`with ${name}`, async () => {
      const f = analysePdf(await resume(PROFILES[1], design));
      expect(f.hidden).toEqual([]);
      expect(f.visibleText).toContain(PROFILES[1].summary.slice(0, 30));
    });
  }
});

describe("analysePdf: files it cannot screen", () => {
  it("rejects bytes that are not a PDF", () => {
    expect(() => analysePdf(new TextEncoder().encode("not a pdf at all"))).toThrow(UnreadablePdf);
  });

  it("rejects a PDF with no text layer", async () => {
    const doc = await pdfLib.PDFDocument.create();
    doc.addPage([595, 842]).drawRectangle({ x: 50, y: 50, width: 200, height: 200, color: pdfLib.rgb(0.2, 0.2, 0.2) });
    const bytes = new Uint8Array(await doc.save());
    expect(() => analysePdf(bytes)).toThrow(/scan/);
  });

  it("rejects a PDF longer than the page limit", async () => {
    const long = await resume(PROFILES[2], { twoPages: true });
    expect(() => analysePdf(long, 1)).toThrow(/2 pages/);
  });
});
