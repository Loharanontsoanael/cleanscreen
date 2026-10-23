import type { CandidateReport } from "./types";

/**
 * Every threshold the decision uses, in one place. Clocked returns probabilities; these say how
 * sure it must be before CleanScreen acts on a verdict, and when a person should look instead.
 */
export const THRESHOLDS = {
  /** A requirement verdict only counts when its own probability is at least this. */
  requirementConfident: 0.6,
  /** A must-have is "clearly not met" (not a match) at or above this. */
  reject: 0.8,
  /** A benign /injection verdict this close to the line still goes to a person. */
  injectionReview: 0.3,
  /** Hidden text classed harmless with less confidence than this goes to a person. */
  hiddenHarmless: 0.6,
  /** A claim contradicted at or above this is an integrity finding... */
  contradiction: 0.8,
  /** ...and between this and the line above, a reason for a closer look. */
  contradictionReview: 0.5,
} as const;

export type Decision = CandidateReport["decision"];

/** Hidden text normalised so the same hidden passage in two files compares equal. */
export const hiddenKey = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

export interface RoundContext {
  /** Normalised hidden text → labels of every applicant whose file contains it. */
  hiddenElsewhere: Map<string, string[]>;
  /** Labels of applicants whose resume text is copied from this one's. */
  copiedWith: string[];
}

const pct = (p: number) => `${Math.round(p * 100)}%`;

/**
 * The decision rule, enforced in code rather than left to a model:
 * - an integrity finding goes to a person (flagged);
 * - a must-have clearly not met is not a match;
 * - every must-have confidently met, with nothing uncertain and nothing unchecked, advances;
 * - anything else is a closer look, with the reasons.
 */
export function decide(c: CandidateReport, ctx: RoundContext): Decision {
  const integrity: string[] = [];
  const review: string[] = [];

  for (const h of c.hidden) {
    const others = (ctx.hiddenElsewhere.get(hiddenKey(h.text)) ?? []).filter((l) => l !== c.label);
    const where = h.trick === "tag" ? "Hidden tag-character text" : `Hidden ${h.reason.replace("_", "-")} text`;
    // Disguised words describe themselves ("12 zero-width characters inside words: ...").
    if (h.intent === "obfuscation") integrity.push(h.text);
    else if (h.intent === "benign") {
      if (h.intentProbability < THRESHOLDS.hiddenHarmless) review.push(`${where} of unclear purpose`);
    } else if (others.length && h.intent === "keyword_stuffing") {
      // The same hidden keywords in several files usually come from a shared template, not intent.
      review.push(`${where} also in ${others.join(", ")}: likely from a shared template`);
    } else if (others.length) {
      integrity.push(`${where}: the same instruction to the AI appears in ${others.join(", ")}`);
    } else {
      integrity.push(`${where}: ${h.intent === "instruction_to_ai" ? "an instruction to the AI" : "keyword stuffing"}`);
    }
  }

  if (c.injection.verdict !== "benign") integrity.push(`Instruction aimed at the AI screener (${c.injection.category ?? c.injection.verdict})`);
  else if (c.injection.probability >= THRESHOLDS.injectionReview) review.push(`Possible instruction to the AI screener (${pct(c.injection.probability)} likely)`);

  for (const claim of c.claims ?? []) {
    if (claim.verdict !== "contradicted") continue;
    if (claim.probability >= THRESHOLDS.contradiction) integrity.push(`Claim contradicted by records: "${claim.claim}"`);
    else if (claim.probability >= THRESHOLDS.contradictionReview) review.push(`Claim possibly contradicted by records: "${claim.claim}"`);
  }
  if (c.coverLetterConflicts.length) integrity.push("Resume and cover letter disagree");
  if (c.code?.verdict === "malicious") integrity.push(`Take-home code is malicious: ${c.code.category ?? ""}`.trim());
  else if (c.code && c.code.verdict !== "benign") review.push(`Take-home code looks ${c.code.verdict}: ${c.code.category ?? ""}`.trim());
  for (const other of ctx.copiedWith) integrity.push(`Resume text copied with ${other}`);

  if (integrity.length) return { outcome: "flagged", reasons: [...integrity, ...review] };

  const mustHaves = c.requirements.filter((r) => r.mustHave);
  if (mustHaves.some((r) => r.verdict === "not_met" && r.probabilities.not_met >= THRESHOLDS.reject)) {
    return { outcome: "reject", reasons: [] };
  }
  for (const r of mustHaves) {
    if (r.probabilities[r.verdict] < THRESHOLDS.requirementConfident) review.push(`Uncertain: ${r.text} (${pct(r.probabilities[r.verdict])})`);
    else if (r.verdict !== "met") review.push(`Not shown on the resume: ${r.text}`);
  }
  for (const u of c.unchecked) review.push(`Not checked: ${u}`);
  return review.length ? { outcome: "human_review", reasons: review } : { outcome: "advance", reasons: [] };
}
