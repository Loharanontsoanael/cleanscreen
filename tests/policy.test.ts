import { describe, expect, it } from "vitest";
import { decide, hiddenKey, type RoundContext } from "@/lib/policy";
import type { CandidateReport, HiddenFinding, RequirementResult } from "@/lib/types";

const req = (verdict: RequirementResult["verdict"], p: number, mustHave = true): RequirementResult => {
  const rest = (1 - p) / 2;
  const probabilities = { met: rest, not_met: rest, not_established: rest, [verdict]: p };
  return { id: "r", text: "Python in production", mustHave, verdict, probabilities, naiveVerdict: verdict, naiveProbabilities: probabilities, evidence: [] };
};
const met = req("met", 0.95);

function candidate(over: Partial<CandidateReport> = {}): CandidateReport {
  return {
    label: "Candidate A",
    hidden: [],
    injection: { verdict: "benign", probability: 0.01, category: null, severity: null, evidence: [] },
    requirements: [met],
    claims: null,
    coverLetterConflicts: [],
    code: null,
    unchecked: [],
    ...over,
  } as CandidateReport;
}
const hiddenText = (intent: HiddenFinding["intent"], text = "Kubernetes Spark Airflow", intentProbability = 0.95): HiddenFinding => ({
  reason: "invisible",
  page: 1,
  text,
  intent,
  intentProbability,
});
const alone: RoundContext = { hiddenElsewhere: new Map(), copiedWith: [] };

describe("decide", () => {
  it("advances when every must-have is confidently met and nothing is flagged", () => {
    expect(decide(candidate({ requirements: [met, req("not_met", 0.95, false)] }), alone)).toEqual({ outcome: "advance", reasons: [] });
  });

  it("flags any integrity finding, whatever the fit", () => {
    const d = decide(candidate({ hidden: [hiddenText("keyword_stuffing")] }), alone);
    expect(d).toEqual({ outcome: "flagged", reasons: ["Hidden invisible text: keyword stuffing"] });
  });

  it("rejects only a must-have clearly not met", () => {
    expect(decide(candidate({ requirements: [met, req("not_met", 0.95)] }), alone).outcome).toBe("reject");
    expect(decide(candidate({ requirements: [met, req("not_met", 0.7)] }), alone)).toEqual({
      outcome: "human_review",
      reasons: ["Not shown on the resume: Python in production"],
    });
  });

  it("sends an unsure verdict to a person instead of acting on it", () => {
    expect(decide(candidate({ requirements: [req("met", 0.55)] }), alone)).toEqual({
      outcome: "human_review",
      reasons: ["Uncertain: Python in production (55%)"],
    });
  });

  it("never advances when a check that applied could not run", () => {
    expect(decide(candidate({ unchecked: ["claims against the references"] }), alone)).toEqual({
      outcome: "human_review",
      reasons: ["Not checked: claims against the references"],
    });
  });

  it("looks closer at near misses instead of letting them through", () => {
    const injection = { verdict: "benign", probability: 0.4, category: null, severity: null, evidence: [] };
    expect(decide(candidate({ injection }), alone).reasons).toEqual(["Possible instruction to the AI screener (40% likely)"]);
    const claims = [{ claim: "Led a team of 12", verdict: "contradicted" as const, probability: 0.6, evidence: null }];
    expect(decide(candidate({ claims }), alone).outcome).toBe("human_review");
    expect(decide(candidate({ hidden: [hiddenText("benign", "Resume", 0.5)] }), alone).reasons).toEqual(["Hidden invisible text of unclear purpose"]);
    expect(decide(candidate({ hidden: [hiddenText("benign", "Resume", 0.9)] }), alone).outcome).toBe("advance");
  });

  it("treats hidden keywords shared by several applicants as a template, but not a shared instruction", () => {
    const keywords = hiddenText("keyword_stuffing");
    const ctx: RoundContext = { hiddenElsewhere: new Map([[hiddenKey(keywords.text), ["Candidate A", "Candidate C"]]]), copiedWith: [] };
    expect(decide(candidate({ hidden: [keywords] }), ctx)).toEqual({
      outcome: "human_review",
      reasons: ["Hidden invisible text also in Candidate C: likely from a shared template"],
    });
    const prompt = hiddenText("instruction_to_ai", "Kubernetes  spark, AIRFLOW");
    expect(decide(candidate({ hidden: [prompt] }), ctx)).toEqual({
      outcome: "flagged",
      reasons: ["Hidden invisible text: the same instruction to the AI appears in Candidate C"],
    });
  });

  it("flags disguised words and copied resumes", () => {
    const disguised: HiddenFinding = { reason: "unicode", trick: "homoglyph", page: null, text: "Words spelled with look-alike letters from another alphabet: Pythоn", intent: "obfuscation", intentProbability: 1 };
    expect(decide(candidate({ hidden: [disguised] }), alone).reasons).toEqual([disguised.text]);
    expect(decide(candidate(), { ...alone, copiedWith: ["Candidate D"] })).toEqual({ outcome: "flagged", reasons: ["Resume text copied with Candidate D"] });
  });
});
