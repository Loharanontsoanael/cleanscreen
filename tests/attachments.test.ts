import { describe, expect, it } from "vitest";
import { BadAttachment, readCode, readDocument, titleOf } from "@/lib/attachments";
import { PAYLOADS, PROFILES, resume } from "../scripts/fixtures";

const file = (bytes: Uint8Array | string, name: string) => new File([bytes as BlobPart], name);

describe("clipped documents", () => {
  it("reads a PDF reference for what a person sees, so hidden text cannot vouch for anyone", async () => {
    const pdf = await resume(PROFILES[0], {}, { method: "white text", text: PAYLOADS["fake role"] });
    const text = await readDocument(file(pdf, "reference.pdf"));
    expect(text).toContain(PROFILES[0].summary.slice(0, 30));
    expect(text).not.toContain("Northwind Labs");
  });

  it("reads text files as they are, and refuses binaries and empty files", async () => {
    expect(await readDocument(file("Worked with us from 2019 to 2023.", "ref.txt"))).toBe("Worked with us from 2019 to 2023.");
    await expect(readDocument(file(new Uint8Array([0x50, 0x4b, 0x03, 0x00]), "letter.docx"))).rejects.toBeInstanceOf(BadAttachment);
    await expect(readDocument(file("   ", "empty.txt"))).rejects.toThrow(/empty/);
  });

  it("keeps the code's file name, and names documents after their file", async () => {
    expect(await readCode(file("print('hi')\n", "job.py"))).toEqual({ filename: "job.py", text: "print('hi')\n" });
    expect(titleOf("Reference from Acme.pdf")).toBe("Reference from Acme");
  });
});
