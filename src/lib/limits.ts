/**
 * Clocked admission limits (https://clocked.rezolve.ai/docs/limits), kept in one place so every
 * request stays inside them. Lengths are Unicode code points, the unit Clocked counts and returns
 * offsets in.
 */
export const LIMITS = {
  /** /injection and /pii: characters of text per request. */
  screenText: 60_000,
  /** /extract and /script: characters per request. */
  readText: 200_000,
  /** /decide: documents per request and characters per document. */
  decideDocuments: 64,
  decideDocumentChars: 20_000,
  /** Shared state we send to /decide and /fill; generous, but bounded by the serving context. */
  stateChars: 60_000,
  /** /rerank: passages per request, characters per passage, characters in the query. */
  rerankDocuments: 256,
  rerankDocumentChars: 20_000,
  rerankQueryChars: 4_000,
  /** /grounding: source documents, the answer, explicit claims. */
  groundingDocuments: 20,
  groundingAnswerChars: 20_000,
  groundingClaims: 30,
  /** /compare: documents per request and characters across them. */
  compareDocuments: 20,
  compareTotalChars: 180_000,
  /** Our own cap: longer files are rarely resumes and would only cost credits. */
  pdfPages: 10,
} as const;

const codePoints = (text: string) => Array.from(text);

/** Cuts text to at most `max` code points. */
export function clip(text: string, max: number): string {
  const chars = codePoints(text);
  return chars.length <= max ? text : chars.slice(0, max).join("");
}

export interface Chunk {
  text: string;
  /** Code-point offset of the chunk in the original text, to shift returned spans back. */
  offset: number;
}

/**
 * Splits text into chunks of at most `max` code points, cutting at a line break where one is
 * near, so a sentence or a hidden instruction is rarely split in two.
 */
export function chunks(text: string, max: number): Chunk[] {
  const chars = codePoints(text);
  if (chars.length <= max) return [{ text, offset: 0 }];
  const out: Chunk[] = [];
  let start = 0;
  while (start < chars.length) {
    let end = Math.min(start + max, chars.length);
    if (end < chars.length) {
      const newline = chars.lastIndexOf("\n", end);
      if (newline > start + max * 0.8) end = newline + 1;
    }
    out.push({ text: chars.slice(start, end).join(""), offset: start });
    start = end;
  }
  return out;
}
