// Runs the full analysis on the demo round and saves the report the web app replays.
import fs from "node:fs/promises";
import path from "node:path";
import { analyseRound } from "../src/lib/analysis";
import { blindCopy, evidenceCopy } from "../src/lib/documents";
import { renderPagePng } from "../src/lib/forensics";
import { loadDemoRound } from "../src/lib/demo-data";

const { job, candidates } = await loadDemoRound();
const started = Date.now();
const report = await analyseRound(job, candidates, (e) =>
  console.log(e.type === "round" ? `[round] ${e.step}` : e.type === "step" ? `[${e.candidate}] ${e.step}` : `[${e.candidate}] done`),
);
// The first page of every resume, so the app can show the original document under the findings.
const pagesDir = path.join(process.cwd(), "public", "demo");
await fs.mkdir(pagesDir, { recursive: true });
for (const [i, c] of report.candidates.entries()) {
  await fs.writeFile(path.join(pagesDir, `${c.id}.png`), renderPagePng(candidates[i].resumePdf));
  c.pageImage = `/demo/${c.id}.png`;
  // The two downloads, built now so the demo serves them as files. Their calls join the trail.
  const [blind, evidence] = await Promise.all([blindCopy(candidates[i].resumePdf, c.trail), evidenceCopy(candidates[i].resumePdf, c.trail)]);
  await fs.writeFile(path.join(pagesDir, `${c.id}-blind.pdf`), blind);
  await fs.writeFile(path.join(pagesDir, `${c.id}-evidence.pdf`), evidence);
  c.documents = { blind: `/demo/${c.id}-blind.pdf`, evidence: `/demo/${c.id}-evidence.pdf` };
}
report.trail = [...report.candidates.flatMap((c) => c.trail), ...report.trail.filter((t) => !report.candidates.some((c) => c.trail.includes(t)))];
const out = path.join(process.cwd(), "data", "demo", "report.json");
await fs.writeFile(out, JSON.stringify(report, null, 2) + "\n");
const fresh = report.trail.filter((t) => !t.cached);
console.log(`\n${report.trail.length} Clocked calls (${fresh.length} live), ${fresh.reduce((s, t) => s + (t.credits ?? 0), 0)} credits, ${((Date.now() - started) / 1000).toFixed(1)} s`);
