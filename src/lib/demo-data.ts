import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import type { CandidateInput, JobInput } from "./types";

const ROOT = path.join(process.cwd(), "data", "demo");

interface ManifestEntry {
  id: string;
  resume: string;
  coverLetter: string | null;
  evidence: { id: string; title: string; file: string }[];
  code: string | null;
}

/** Loads the synthetic hiring round from data/demo (see scripts/generate-demo.mjs). */
export async function loadDemoRound(): Promise<{ job: JobInput; candidates: CandidateInput[] }> {
  const job = JSON.parse(await fs.readFile(path.join(ROOT, "job.json"), "utf8")) as JobInput;
  const manifest = JSON.parse(await fs.readFile(path.join(ROOT, "candidates.json"), "utf8")) as ManifestEntry[];
  const candidates = await Promise.all(
    manifest.map(async (m) => {
      const dir = path.join(ROOT, "candidates", m.id);
      const read = (f: string) => fs.readFile(path.join(dir, f), "utf8");
      return {
        id: m.id,
        resumePdf: new Uint8Array(await fs.readFile(path.join(dir, m.resume))),
        coverLetter: m.coverLetter ? await read(m.coverLetter) : undefined,
        evidence: await Promise.all(m.evidence.map(async (e) => ({ id: e.id, title: e.title, text: await read(e.file) }))),
        code: m.code ? { filename: m.code, text: await read(m.code) } : undefined,
      };
    }),
  );
  return { job, candidates };
}
