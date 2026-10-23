// Integrity benchmark: generated resumes, some hiding text in every way we know of and some honest
// but designed to look suspicious. Each one goes through the same check the app runs.
// Usage: node --env-file=.env.local --conditions=react-server --import tsx scripts/benchmark.ts
import fs from "node:fs/promises";
import path from "node:path";
import { checkManipulation } from "../src/lib/analysis";
import type { CallRecord } from "../src/lib/clocked";
import { analysePdf } from "../src/lib/forensics";
import { METHODS, PAYLOADS, PROFILES, resume, VISIBLE_INSTRUCTIONS, type Design, type Payload } from "./fixtures";

interface Case {
  id: string;
  kind: "attack" | "honest";
  method: string;
  payload: string;
  pdf: Uint8Array;
}

const cases: Case[] = [];
let n = 0;
for (const method of METHODS) {
  for (const payload of Object.keys(PAYLOADS) as Payload[]) {
    const p = PROFILES[n++ % PROFILES.length];
    cases.push({ id: `attack-${cases.length + 1}`, kind: "attack", method, payload, pdf: await resume(p, {}, { method, text: PAYLOADS[payload] }) });
  }
}
for (const [i, v] of VISIBLE_INSTRUCTIONS.entries()) {
  cases.push({ id: `attack-${cases.length + 1}`, kind: "attack", method: "visible on the page", payload: "instruction", pdf: await resume(PROFILES[i + 3], {}, undefined, v) });
}
const designs: [string, Design][] = [
  ["plain", {}],
  ["dark sidebar with white text", { sidebar: true }],
  ["light grey dates", { lightDates: true }],
  ["7 pt footer", { footer: true }],
  ["coloured header band", { band: true }],
  ["ordinary metadata", { normalMeta: true }],
  ["two pages", { twoPages: true }],
  ["sidebar, band and footer", { sidebar: true, band: true, footer: true }],
  ["light dates and metadata", { lightDates: true, normalMeta: true }],
  ["plain", {}],
];
for (const [i, [label, design]] of designs.entries()) {
  cases.push({ id: `honest-${i + 1}`, kind: "honest", method: label, payload: PROFILES[i].headline, pdf: await resume(PROFILES[i], design) });
}

const trail: CallRecord[] = [];
const results = await Promise.all(
  cases.map(async (c) => {
    const f = analysePdf(c.pdf);
    const { injection, hiddenIntent } = await checkManipulation(f, trail);
    const intents = f.hidden.map((_, i) => (hiddenIntent?.answers[`hidden-${i}`] as { choice?: string } | undefined)?.choice ?? "benign");
    const flagged = intents.some((x) => x !== "benign") || injection.verdict !== "benign";
    return {
      id: c.id,
      kind: c.kind,
      method: c.method,
      payload: c.payload,
      hiddenFound: f.hidden.map((h) => h.reason),
      intents,
      injection: injection.verdict,
      flagged,
      correct: c.kind === "attack" ? flagged : !flagged,
    };
  }),
);

const attacks = results.filter((r) => r.kind === "attack");
const honest = results.filter((r) => r.kind === "honest");
const credits = trail.reduce((s, t) => s + (t.credits ?? 0), 0);
const summary = {
  generatedAt: new Date().toISOString(),
  attacks: attacks.length,
  caught: attacks.filter((r) => r.flagged).length,
  honest: honest.length,
  falseAlarms: honest.filter((r) => r.flagged).length,
  calls: trail.length,
  credits,
};
const out = path.join(process.cwd(), "data", "benchmark");
await fs.mkdir(out, { recursive: true });
await fs.writeFile(path.join(out, "results.json"), JSON.stringify({ summary, results }, null, 2) + "\n");

console.log(summary);
for (const r of results) {
  console.log(`${r.correct ? "ok  " : "MISS"} ${r.id.padEnd(10)} ${r.method.padEnd(28)} ${r.payload.padEnd(26)} hidden=[${r.hiddenFound.join(",")}] intents=[${r.intents.join(",")}] injection=${r.injection}`);
}
