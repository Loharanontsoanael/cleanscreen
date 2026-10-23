import { CREDITS_PER_DOCUMENT, liveBudget } from "@/lib/budget";
import { ClockedUnavailable, type CallRecord } from "@/lib/clocked";
import { blindCopy, evidenceCopy, type DocumentKind } from "@/lib/documents";
import { UnreadablePdf } from "@/lib/forensics";

export const maxDuration = 120;

const MAX_BYTES = 3 * 1024 * 1024;
const PER_HOUR = 40;
const BUILD: Record<DocumentKind, typeof blindCopy> = { blind: blindCopy, evidence: evidenceCopy };

// Same reasoning as /api/screen: a few per visitor, in memory, nothing about them kept.
const requests = new Map<string, number[]>();
function allow(ip: string): boolean {
  const now = Date.now();
  const recent = (requests.get(ip) ?? []).filter((t) => now - t < 3_600_000);
  if (recent.length >= PER_HOUR) return false;
  requests.set(ip, [...recent, now]);
  return true;
}

const fail = (status: number, error: string) => Response.json({ error }, { status });

/**
 * Builds a blind copy or an evidence PDF of one resume the visitor still has in their browser.
 * The file is sent again rather than kept from the screening, so nothing is stored in between.
 */
export async function POST(request: Request) {
  if (process.env.SCREEN_DISABLED === "1") return fail(503, "Live screening is paused.");
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail(400, "Send the resume as a form upload.");
  }
  const kind = String(form.get("kind")) as DocumentKind;
  const file = form.get("resume");
  if (!(kind in BUILD)) return fail(400, "Ask for a blind copy or an evidence PDF.");
  if (!(file instanceof File)) return fail(400, "Add the resume as a PDF.");
  if (file.size > MAX_BYTES) return fail(413, `${file.name} is larger than 3 MB.`);
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (String.fromCharCode(...bytes.slice(0, 5)) !== "%PDF-") return fail(400, `${file.name} is not a PDF.`);

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!allow(ip)) return fail(429, "Too many downloads this hour. Try again later.");
  const reservation = liveBudget.reserve(CREDITS_PER_DOCUMENT);
  if (!reservation) return fail(503, "Today’s budget for live screening is spent. It resets at midnight UTC.");

  const trail: CallRecord[] = [];
  try {
    const pdf = await BUILD[kind](bytes, trail, request.signal);
    return new Response(pdf.buffer as ArrayBuffer, { headers: { "Content-Type": "application/pdf", "Cache-Control": "no-store" } });
  } catch (err) {
    if (err instanceof UnreadablePdf || err instanceof ClockedUnavailable) return fail(422, err.message);
    console.error(`building the ${kind} PDF failed`, err);
    return fail(502, "The PDF could not be built. Please try again.");
  } finally {
    reservation.settle(trail.reduce((sum, t) => sum + (t.cached ? 0 : (t.credits ?? 0)), 0));
  }
}
