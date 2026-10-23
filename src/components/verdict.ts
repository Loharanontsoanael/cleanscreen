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
import { THRESHOLDS } from "@/lib/policy";
import type { CandidateReport, DuplicateFinding } from "@/lib/types";

export interface Verdict {
  /** One plain sentence: what a reviewer needs to know first. */
  sentence: string;
  icon: typeof CheckmarkCircle02Icon;
  /** Two words or so, for the stamp on the shortlist. */
  stamp: string;
}

export const isCopied = (c: CandidateReport, duplicates: DuplicateFinding[]) =>
  duplicates.some((d) => d.a === c.label || d.b === c.label);

/** The most important thing about an application, in the order a reviewer should care. */
export function verdictOf(c: CandidateReport, copied: boolean): Verdict {
  const flagged = c.decision.outcome === "flagged";
  const hidden = c.hidden.filter((h) => h.intent !== "benign");
  if (flagged && (hidden.some((h) => h.intent === "instruction_to_ai") || c.injection.verdict !== "benign"))
    return { sentence: "Hid instructions for the AI screener in the file.", icon: AiChat02Icon, stamp: "AI prompt" };
  if (flagged && hidden.some((h) => h.intent === "keyword_stuffing"))
    return { sentence: "Hid a stronger resume in invisible text.", icon: ViewOffSlashIcon, stamp: "Hidden text" };
  if (flagged && hidden.length)
    return { sentence: "Disguised words with invisible or look-alike characters.", icon: ViewOffSlashIcon, stamp: "Disguised" };
  if (c.decision.reasons.some((r) => r.endsWith("likely from a shared template")))
    return { sentence: "Hidden keywords also appear in other files: likely a shared template.", icon: Copy01Icon, stamp: "Template" };
  if (c.code?.verdict === "malicious")
    return { sentence: "The take-home code tries to send secrets off the machine.", icon: CodeIcon, stamp: "Bad code" };
  if (c.code && c.code.verdict !== "benign")
    return { sentence: "The take-home code does something worth checking before it runs.", icon: CodeIcon, stamp: "Check code" };
  if ((c.claims ?? []).some((x) => x.verdict === "contradicted" && x.probability >= THRESHOLDS.contradiction))
    return { sentence: "Claims on the resume don’t match the references.", icon: FileValidationIcon, stamp: "False claims" };
  if (copied) return { sentence: "The resume is copied, sentence for sentence, from another applicant.", icon: Copy01Icon, stamp: "Copied" };
  if (c.coverLetterConflicts.length) return { sentence: "The resume and the cover letter tell different stories.", icon: Mail01Icon, stamp: "Conflict" };
  if (c.decision.outcome === "reject") return { sentence: "Doesn’t meet a must-have requirement.", icon: Cancel01Icon, stamp: "Not a match" };
  if (c.decision.outcome === "human_review") return { sentence: "Fit is unclear. Worth a closer look.", icon: HelpCircleIcon, stamp: "Review" };
  return { sentence: "Meets every must-have. Nothing to flag.", icon: CheckmarkCircle02Icon, stamp: "Interview" };
}
