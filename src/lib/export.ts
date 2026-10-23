import { THRESHOLDS } from "./policy";
import type { CandidateReport, RoundReport } from "./types";

/**
 * A round's results for whoever keeps the record: a CSV for a spreadsheet or an ATS import, and an
 * audit report in Markdown. Both are blind: applicants appear by label only, never by name.
 */

const OUTCOME: Record<CandidateReport["decision"]["outcome"], string> = {
  advance: "Interview",
  human_review: "Closer look",
  reject: "Not a match",
  flagged: "Integrity finding",
};

const credits = (c: { trail: { credits: number | null }[] }) => c.trail.reduce((s, t) => s + (t.credits ?? 0), 0);
const pct = (p: number) => `${Math.round(p * 100)}%`;
/** Text inside a Markdown table cell: pipes and line breaks would end the cell. */
const cell = (s: string) => s.replaceAll("|", "\\|").replace(/\s+/g, " ");

function csvCell(value: string | number): string {
  const s = String(value);
  // Quote when needed, and defuse cells a spreadsheet would run as a formula.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

export function roundCsv(report: RoundReport): string {
  const reqs = report.job.requirements;
  const header = ["Applicant", "Next step", "Reasons", "Fit on the visible page", "Fit on the raw file", ...reqs.map((r) => r.text), "Clocked credits"];
  const rows = report.candidates.map((c) => [
    c.label,
    OUTCOME[c.decision.outcome],
    c.decision.reasons.join("; "),
    c.score,
    c.naiveScore,
    ...reqs.map((r) => {
      const x = c.requirements.find((y) => y.id === r.id);
      return x ? `${x.verdict.replaceAll("_", " ")} (${pct(x.probabilities[x.verdict])})` : "";
    }),
    credits(c),
  ]);
  const failed = report.failed.map((f) => [f.file, "Not screened", f.error, "", "", ...reqs.map(() => ""), 0]);
  return [header, ...rows, ...failed].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

export function auditReport(report: RoundReport): string {
  const out: string[] = [];
  const line = (s = "") => out.push(s);
  const total = credits(report);

  line(`# Screening audit: ${report.job.title}`);
  line();
  line(`Screened ${report.generatedAt.slice(0, 16).replace("T", " ")} UTC by CleanScreen. ${report.candidates.length} applicants, ${report.trail.length} Clocked calls, ${total} credits.`);
  line("Applicants appear by label only. Every decision below was made by the rule in code, not by a model; a person makes the final call.");
  line();
  line("## Requirements");
  line();
  for (const r of report.job.requirements) line(`- ${r.text}${r.mustHave ? " (must-have)" : ""}`);
  line();
  line("## Decision rule");
  line();
  line("- Any integrity finding (hidden text aimed at the screener, instructions to the AI, contradicted claims, conflicting cover letter, unsafe code, copied resume) goes to a person.");
  line(`- A must-have judged not met with ${pct(THRESHOLDS.reject)} confidence or more is not a match.`);
  line(`- Every must-have met with ${pct(THRESHOLDS.requirementConfident)} confidence or more, with nothing uncertain or unchecked, advances to interview.`);
  line("- Anything else is a closer look, with the reasons listed.");
  line();
  line("## Results");
  line();
  line("| Applicant | Next step | Fit (visible page) | Fit (raw file) | Credits |");
  line("| --- | --- | ---: | ---: | ---: |");
  for (const c of report.candidates) line(`| ${c.label} | ${OUTCOME[c.decision.outcome]} | ${c.score} | ${c.naiveScore} | ${credits(c)} |`);
  for (const f of report.failed) line(`| ${cell(f.file)} | Not screened: ${cell(f.error)} | | | 0 |`);
  if (report.warnings.length) line(`\nNot checked for the round: ${report.warnings.join("; ")}.`);

  for (const c of report.candidates) {
    line();
    line(`## ${c.label}: ${OUTCOME[c.decision.outcome]}`);
    line();
    if (c.decision.reasons.length) {
      line("Why a person should look:");
      line();
      for (const r of c.decision.reasons) line(`- ${r}`);
      line();
    }
    line("| Requirement | Verdict | Confidence | On the raw file |");
    line("| --- | --- | ---: | --- |");
    for (const r of c.requirements) {
      line(`| ${cell(r.text)}${r.mustHave ? " (must-have)" : ""} | ${r.verdict.replaceAll("_", " ")} | ${pct(r.probabilities[r.verdict])} | ${r.naiveVerdict.replaceAll("_", " ")} |`);
    }
    if (c.hidden.length) {
      line();
      line("Text no reader can see:");
      line();
      for (const h of c.hidden) line(`- ${h.reason.replace("_", "-")}${h.page ? `, page ${h.page}` : ""}, classed as ${h.intent.replaceAll("_", " ")}: "${h.text.slice(0, 200)}"`);
    }
    if (c.warnings.length) line(`\nNot checked: ${c.warnings.join("; ")}.`);
    line();
    line("Clocked calls:");
    line();
    for (const t of c.trail) line(`- /${t.endpoint}: ${t.purpose}${t.error ? ` (failed: ${t.error})` : `, ${t.credits ?? 0} credits`}`);
  }
  return out.join("\n") + "\n";
}
