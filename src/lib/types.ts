import type { CallRecord } from "./clocked";
import type { HiddenSegment } from "./forensics";

export interface Requirement {
  id: string;
  text: string;
  mustHave: boolean;
}

export interface JobInput {
  title: string;
  company?: string;
  description: string;
  requirements: Requirement[];
}

export interface EvidenceDoc {
  id: string;
  title: string;
  text: string;
}

export interface CandidateInput {
  id: string;
  /** The uploaded file name, used to say which file could not be screened. */
  fileName?: string;
  resumePdf: Uint8Array;
  coverLetter?: string;
  evidence: EvidenceDoc[];
  code?: { filename: string; text: string };
}

export type Verdict = "met" | "not_met" | "not_established";

export interface Span {
  text: string;
  start: number;
  end: number;
}

export interface HiddenFinding extends HiddenSegment {
  /** What the hidden text is trying to do, as judged by /decide. */
  intent: "instruction_to_ai" | "keyword_stuffing" | "obfuscation" | "benign";
  intentProbability: number;
}

export interface RequirementResult {
  id: string;
  text: string;
  mustHave: boolean;
  verdict: Verdict;
  probabilities: Record<Verdict, number>;
  /** The same question asked over the raw extracted text, as a naive screener would. */
  naiveVerdict: Verdict;
  naiveProbabilities: Record<Verdict, number>;
  /** Passages /rerank judged to answer this requirement, best first. */
  evidence: { source: string; text: string; score: number }[];
}

export interface ClaimCheck {
  claim: string;
  verdict: "supported" | "contradicted" | "not_stated" | "not_a_claim";
  probability: number;
  evidence: { document: string; quote: string } | null;
}

export interface CandidateReport {
  id: string;
  /** Anonymous label shown to reviewers until they choose to reveal identity. */
  label: string;
  name: string | null;
  pageCount: number;
  pageSizes: { width: number; height: number }[];
  /** Rendered first page of the original PDF, relative to /public. */
  pageImage: string | null;
  visibleText: string;
  machineText: string;
  blindText: string;
  piiFound: { type: string; value: string }[];
  hidden: HiddenFinding[];
  injection: {
    verdict: string;
    probability: number;
    category: string | null;
    severity: string | null;
    evidence: Span[];
  };
  profile: {
    roles: { title: string | null; employer: string | null; dates: string | null }[];
    skills: string[];
    education: string[];
    certifications: string[];
  };
  requirements: RequirementResult[];
  score: number;
  naiveScore: number;
  claims: ClaimCheck[] | null;
  coverLetterConflicts: { resume: string; coverLetter: string }[];
  code: {
    filename: string;
    text: string;
    verdict: string;
    malicious: number;
    category: string | null;
    severity: string | null;
    lines: Span[];
  } | null;
  scorecard: {
    recommendation: "advance" | "human_review" | "reject";
    recommendationProbabilities: Record<string, number>;
    seniority: string;
    summary: string;
    interviewQuestions: string;
  };
  /** Final routing after the safety policy is applied on top of the scorecard. */
  decision: { outcome: "advance" | "human_review" | "reject" | "flagged"; reasons: string[] };
  /** Secondary checks that could not run for this application. */
  warnings: string[];
  /** Of those, the ones that applied to it; they keep it from advancing. */
  unchecked: string[];
  trail: CallRecord[];
}

export interface DuplicateFinding {
  a: string;
  b: string;
  relation: string;
  passages: { a: string; b: string; kind: string }[];
}

export interface RoundReport {
  job: JobInput;
  generatedAt: string;
  candidates: CandidateReport[];
  /** Files that could not be screened at all, with the reason. */
  failed: { file: string; error: string }[];
  /** Round-level checks that could not run (e.g. the cross-applicant comparison). */
  warnings: string[];
  duplicates: DuplicateFinding[];
  trail: CallRecord[];
}
