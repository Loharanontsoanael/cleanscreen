import * as mupdf from "mupdf";
import { afterEach, describe, expect, it } from "vitest";
import { setClockedClientForTests, type CallRecord } from "@/lib/clocked";
import { blindCopy, evidenceCopy } from "@/lib/documents";
import { PAYLOADS, PROFILES, resume } from "../scripts/fixtures";

/** A Clocked that marks nothing: it hands the PDF back, as `return_pdf` does when it has no span to mark. */
function echoClocked() {
  const echo = (body: { pdf: string }) =>
    Promise.resolve({ data: { pdf: { marked: { document: body.pdf } } }, modelMs: 1, credits: 1, costUsd: 0 });
  setClockedClientForTests({ pii: echo, injection: echo } as never);
}

const open = (bytes: Uint8Array) => mupdf.Document.openDocument(bytes, "application/pdf");
afterEach(() => setClockedClientForTests(null));

describe("PDF copies", () => {
  it("leaves the hidden text out of the blind copy, and the author out of its metadata", async () => {
    echoClocked();
    const original = await resume(PROFILES[0], { normalMeta: true }, { method: "white text", text: PAYLOADS["fake role"] });
    const trail: CallRecord[] = [];
    const doc = open(await blindCopy(original, trail));
    const text = doc.loadPage(0).toStructuredText("preserve-whitespace").asText();
    expect(text).toContain(PROFILES[0].summary.slice(0, 30));
    expect(text).not.toContain("Northwind Labs");
    expect(doc.getMetaData("info:Title")).toBeFalsy();
    expect(trail.map((t) => t.endpoint)).toEqual(["pii"]);
  });

  it("boxes every hidden line in the evidence copy", async () => {
    echoClocked();
    const original = await resume(PROFILES[0], {}, { method: "white text", text: PAYLOADS["fake role"] });
    const page = open(await evidenceCopy(original, [])).loadPage(0) as mupdf.PDFPage;
    const boxes = page.getAnnotations().filter((a) => a.getType() === "Square");
    expect(boxes.length).toBeGreaterThan(0);
    expect(boxes[0].getContents()).toMatch(/no ink/);
  });
});
