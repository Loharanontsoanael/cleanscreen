import type { CandidateReport, RequirementResult } from "./types";

/** A clearly-missed must-have only rejects when /decide is at least this sure. */
export const REJECT_CONFIDENCE = 0.8;

/**
 * The decision rule, enforced in code rather than left to a model:
 * - any integrity finding means a person reviews the application;
 * - otherwise every must-have met advances it, unless a check that should have run could not;
 * - a must-have clearly not met is not a match;
 * - anything else is a closer look.
 */
export function decideOutcome(input: {
  integrityReasons: string[];
  requirements: Pick<RequirementResult, "mustHave" | "verdict" | "probabilities">[];
  /** Checks that applied to this application but failed to run. */
  unchecked: string[];
}): CandidateReport["decision"] {
  const { integrityReasons, requirements, unchecked } = input;
  if (integrityReasons.length) return { outcome: "flagged", reasons: [...integrityReasons] };
  const mustHaves = requirements.filter((r) => r.mustHave);
  if (mustHaves.some((r) => r.verdict === "not_met" && r.probabilities.not_met >= REJECT_CONFIDENCE)) {
    return { outcome: "reject", reasons: [] };
  }
  if (mustHaves.every((r) => r.verdict === "met")) {
    return unchecked.length ? { outcome: "human_review", reasons: unchecked.map((u) => `Not checked: ${u}`) } : { outcome: "advance", reasons: [] };
  }
  return { outcome: "human_review", reasons: [] };
}
