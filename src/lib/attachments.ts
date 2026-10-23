import "server-only";
import { analysePdf, UnreadablePdf } from "./forensics";
import { LIMITS } from "./limits";

/**
 * The documents a reviewer can clip to a resume: a cover letter and references (PDF or text),
 * and take-home code (text). Each becomes plain text for Clocked; a PDF is read for what a person
 * sees on the page, so hidden text in a reference cannot vouch for anyone.
 */

export const MAX_REFERENCES = 3;
const MAX_DOCUMENT_BYTES = 1024 * 1024;
const MAX_CODE_BYTES = 200 * 1024;

export class BadAttachment extends Error {}

/** A file's name without its extension, used as the document's title ("Reference from Acme"). */
export const titleOf = (name: string) => name.replace(/\.[^.]+$/, "").trim() || name;

async function readText(file: File, maxBytes: number): Promise<string> {
  if (file.size > maxBytes) throw new BadAttachment(`${file.name} is larger than ${Math.round(maxBytes / 1024)} KB.`);
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-") {
    try {
      return analysePdf(bytes).visibleText;
    } catch (err) {
      if (err instanceof UnreadablePdf) throw new BadAttachment(`${file.name}: ${err.message}`);
      throw err;
    }
  }
  const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  if (text.includes("\u0000")) throw new BadAttachment(`${file.name} is neither a PDF nor a text file.`);
  if (!text.trim()) throw new BadAttachment(`${file.name} is empty.`);
  return text;
}

/** A cover letter or a reference, as text. */
export const readDocument = (file: File) => readText(file, MAX_DOCUMENT_BYTES);

/** Take-home code, as text within the /script limit. */
export async function readCode(file: File): Promise<{ filename: string; text: string }> {
  const text = await readText(file, MAX_CODE_BYTES);
  if (Array.from(text).length > LIMITS.readText) throw new BadAttachment(`${file.name} is too long to inspect.`);
  return { filename: file.name, text };
}
