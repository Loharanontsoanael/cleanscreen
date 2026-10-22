import type { CandidateReport } from "@/lib/types";

type Outcome = CandidateReport["decision"]["outcome"];

export const OUTCOME_LABEL: Record<Outcome, string> = {
  advance: "Interview",
  human_review: "Closer look",
  flagged: "Integrity finding",
  reject: "Not a match",
};

const STYLE: Record<Outcome, string> = {
  advance: "pill-pass",
  human_review: "pill-hold",
  flagged: "pill-alerte",
  reject: "pill-neutre",
};

export const OUTCOME_ORDER: Outcome[] = ["advance", "human_review", "flagged", "reject"];

export function OutcomeBadge({ outcome }: { outcome: Outcome }) {
  return <span className={`pill ${STYLE[outcome]}`}>{OUTCOME_LABEL[outcome]}</span>;
}

export function pct(p: number): string {
  return `${Math.round(p * 100)}%`;
}
