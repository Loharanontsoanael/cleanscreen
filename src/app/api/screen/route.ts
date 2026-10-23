import { analyseRound, type ProgressEvent } from "@/lib/analysis";
import { CREDITS_PER_RESUME, CreditBudget } from "@/lib/budget";
import { ClockedUnavailable } from "@/lib/clocked";
import type { CandidateInput, JobInput, Requirement } from "@/lib/types";

export const maxDuration = 300;

const MAX_FILES = 10;
const MAX_BYTES = 3 * 1024 * 1024;
const RUNS_PER_HOUR = Number(process.env.SCREEN_RUNS_PER_HOUR ?? 5);
const budget = new CreditBudget(Number(process.env.DAILY_CREDIT_BUDGET ?? 3000));

// Live runs spend real Clocked credits, so each visitor gets a few per hour. In memory on purpose:
// nothing about a visitor or their files is stored.
const runs = new Map<string, number[]>();
function allow(ip: string): boolean {
  const now = Date.now();
  const recent = (runs.get(ip) ?? []).filter((t) => now - t < 3_600_000);
  if (recent.length >= RUNS_PER_HOUR) return false;
  runs.set(ip, [...recent, now]);
  return true;
}

function fail(status: number, error: string) {
  return Response.json({ error }, { status });
}

/** Screens uploaded resumes against a job, streaming progress as NDJSON and ending with the report. */
export async function POST(request: Request) {
  if (process.env.SCREEN_DISABLED === "1") return fail(503, "Live screening is paused. The demo round still works.");

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail(400, "Send the job and resumes as a form upload.");
  }

  const title = String(form.get("title") ?? "").trim().slice(0, 120);
  const description = String(form.get("description") ?? "").trim().slice(0, 2000);
  let requirements: Requirement[] = [];
  try {
    const raw = JSON.parse(String(form.get("requirements") ?? "[]")) as { text?: unknown; mustHave?: unknown }[];
    requirements = raw
      .map((r, i) => ({ id: `req-${i + 1}`, text: String(r.text ?? "").trim().slice(0, 200), mustHave: Boolean(r.mustHave) }))
      .filter((r) => r.text)
      .slice(0, 8);
  } catch {
    return fail(400, "Requirements must be a list.");
  }
  if (!title) return fail(400, "Add a job title.");
  if (!requirements.length) return fail(400, "Add at least one requirement.");

  const files = form.getAll("resumes").filter((f): f is File => f instanceof File);
  if (!files.length) return fail(400, "Add at least one resume as a PDF.");
  if (files.length > MAX_FILES) return fail(400, `Screen at most ${MAX_FILES} resumes at a time.`);

  const candidates: CandidateInput[] = [];
  for (const [i, file] of files.entries()) {
    if (file.size > MAX_BYTES) return fail(413, `${file.name} is larger than 3 MB.`);
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (String.fromCharCode(...bytes.slice(0, 5)) !== "%PDF-") return fail(400, `${file.name} is not a PDF.`);
    candidates.push({ id: `upload-${i + 1}`, fileName: file.name, resumePdf: bytes, evidence: [] });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!allow(ip)) return fail(429, `You can screen ${RUNS_PER_HOUR} rounds an hour. Try again later, or explore the demo round.`);
  const reservation = budget.reserve(candidates.length * CREDITS_PER_RESUME);
  if (!reservation) {
    return fail(503, "Today’s budget for live screening is spent. It resets at midnight UTC; the demo round shows a full screening meanwhile.");
  }

  const job: JobInput = { title, description, requirements };
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: ProgressEvent | { type: "report"; report: unknown } | { type: "error"; error: string }) => {
        if (!request.signal.aborted) controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      };
      try {
        // request.signal fires when the visitor leaves: pending Clocked calls are cancelled, not paid for.
        const report = await analyseRound(job, candidates, send, request.signal);
        reservation.settle(report.trail.reduce((sum, t) => sum + (t.cached ? 0 : (t.credits ?? 0)), 0));
        send({ type: "report", report });
      } catch (err) {
        if (request.signal.aborted) return;
        if (!(err instanceof ClockedUnavailable)) console.error("screening failed", err);
        send({
          type: "error",
          error: err instanceof ClockedUnavailable ? err.message : "Screening stopped before it finished. Please try again.",
        });
      } finally {
        try {
          controller.close();
        } catch {
          // Already closed because the visitor left.
        }
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } });
}
