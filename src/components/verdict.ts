import {
  AiChat02Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  CodeIcon,
  Copy01Icon,
  FileValidationIcon,
  HelpCircleIcon,
  Mail01Icon,
  ViewOffSlashIcon,
} from "@hugeicons/core-free-icons";
import type { CandidateReport, DuplicateFinding } from "@/lib/types";

export interface Verdict {
  /** One plain sentence: what a reviewer needs to know first. */
  sentence: string;
  icon: typeof CheckmarkCircle02Icon;
}

export const isCopied = (c: CandidateReport, duplicates: DuplicateFinding[]) =>
  duplicates.some((d) => d.a === c.label || d.b === c.label);

/** The most important thing about an application, in the order a reviewer should care. */
export function verdictOf(c: CandidateReport, copied: boolean): Verdict {
  const hidden = c.hidden.find((h) => h.intent !== "benign");
  if (hidden?.intent === "instruction_to_ai" || c.injection.verdict !== "benign")
    return { sentence: "Hid instructions for the AI screener in the file.", icon: AiChat02Icon };
  if (hidden) return { sentence: "Hid a stronger resume in invisible text.", icon: ViewOffSlashIcon };
  if (c.code && c.code.verdict !== "benign")
    return { sentence: "The take-home code tries to send secrets off the machine.", icon: CodeIcon };
  if ((c.claims ?? []).some((x) => x.verdict === "contradicted" && x.probability >= 0.8))
    return { sentence: "Claims on the resume don’t match the references.", icon: FileValidationIcon };
  if (copied) return { sentence: "The resume is copied, sentence for sentence, from another applicant.", icon: Copy01Icon };
  if (c.coverLetterConflicts.length) return { sentence: "The resume and the cover letter tell different stories.", icon: Mail01Icon };
  if (c.decision.outcome === "reject") return { sentence: "Doesn’t meet a must-have requirement.", icon: Cancel01Icon };
  if (c.decision.outcome === "human_review") return { sentence: "Fit is unclear. Worth a closer look.", icon: HelpCircleIcon };
  return { sentence: "Meets every must-have. Nothing to flag.", icon: CheckmarkCircle02Icon };
}
