"use client";

import { useState, type ReactNode } from "react";
import { Cancel01Icon, CheckmarkCircle02Icon, HelpCircleIcon } from "@hugeicons/core-free-icons";
import type { CandidateReport, DuplicateFinding, Verdict } from "@/lib/types";
import { glyph } from "./glyph";
import { MarkedText } from "./marked-text";
import { OutcomeBadge } from "./outcome";
import { ResumePaper } from "./resume-paper";

const VERDICT_ICON: Record<Verdict, ReactNode> = {
  met: <span className="text-pass" aria-label="Met">{glyph(CheckmarkCircle02Icon, 18, 2)}</span>,
  not_met: <span className="text-alerte" aria-label="Not met">{glyph(Cancel01Icon, 18, 2)}</span>,
  not_established: <span className="text-hold" aria-label="Not shown on the resume">{glyph(HelpCircleIcon, 18, 2)}</span>,
};

const HIDDEN_TITLE: Record<string, string> = {
  instruction_to_ai: "Hidden instructions for the AI",
  keyword_stuffing: "Hidden keywords",
  benign: "Hidden text",
};

const WHERE: Record<string, string> = {
  invisible: "printed invisibly",
  tiny: "printed microscopic",
  off_page: "placed off the page",
  metadata: "stored in the file’s metadata",
};

function Panel({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="panel p-6">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-[17px] font-extrabold text-brand-900">{title}</h2>
        {aside && <div className="text-sm text-ink-400">{aside}</div>}
      </div>
      {children}
    </section>
  );
}

function Finding({ title, quote, note }: { title: string; quote?: string; note?: ReactNode }) {
  return (
    <li className="border-l-2 border-alerte pl-3">
      <p className="font-semibold text-alerte">{title}</p>
      {quote && <p className="mt-1 text-sm text-ink-700">“{quote}”</p>}
      {note && <p className="mt-1 text-sm text-ink-500">{note}</p>}
    </li>
  );
}

/** Every integrity finding, in plain words, with the passage behind it. */
/** Swaps the applicant's name (full or first) for "the applicant" in quoted records. */
function anonymise(text: string | undefined, c: CandidateReport, revealed: boolean): string | undefined {
  if (!text || revealed || !c.name) return text;
  const first = c.name.split(" ")[0];
  return text.replaceAll(c.name, "the applicant").replace(new RegExp(`\\b${first}\\b`, "g"), "the applicant");
}

function WhyFlagged({ c, duplicates, revealed }: { c: CandidateReport; duplicates: DuplicateFinding[]; revealed: boolean }) {
  const items: ReactNode[] = [];
  c.hidden
    .filter((h) => h.intent !== "benign")
    .forEach((h, i) => items.push(<Finding key={`h${i}`} title={HIDDEN_TITLE[h.intent]} quote={h.text} note={`Text ${WHERE[h.reason]}.`} />));
  if (c.injection.verdict !== "benign" && !c.hidden.some((h) => h.intent === "instruction_to_ai")) {
    items.push(<Finding key="inj" title="Instructions for the AI screener" quote={c.injection.evidence[0]?.text} />);
  }
  duplicates.forEach((d, i) => {
    const quote = d.passages.find((p) => p.a.length > 30 && p.a.length < 400)?.a;
    items.push(<Finding key={`d${i}`} title={`Resume copied with ${d.a === c.label ? d.b : d.a}`} quote={quote} />);
  });
  c.coverLetterConflicts.forEach((k, i) =>
    items.push(<Finding key={`k${i}`} title="Resume and cover letter disagree" quote={k.coverLetter} note={`The resume says “${k.resume}”.`} />),
  );
  (c.claims ?? [])
    .filter((cl) => cl.verdict === "contradicted" && cl.probability >= 0.8)
    .forEach((cl, i) =>
      items.push(
        <Finding
          key={`c${i}`}
          title="Contradicted by the references"
          quote={cl.claim}
          note={cl.evidence ? `${cl.evidence.document}: “${anonymise(cl.evidence.quote, c, revealed)}”` : undefined}
        />,
      ),
    );
  if (!items.length) return null;
  return (
    <Panel title="Why it was flagged">
      <ul className="space-y-4">{items}</ul>
    </Panel>
  );
}

function Requirements({ c }: { c: CandidateReport }) {
  const [proof, setProof] = useState(false);
  const inflated = c.requirements.filter((r) => r.naiveVerdict === "met" && r.verdict !== "met").length;
  const confirmed = (c.claims ?? []).filter((x) => x.verdict === "supported").length;
  return (
    <Panel title="Requirements" aside={`Fit ${c.score}/100`}>
      <ul className="space-y-3">
        {c.requirements.map((r) => (
          <li key={r.id}>
            <div className="flex items-start gap-2.5">
              <span className="mt-px">{VERDICT_ICON[r.verdict]}</span>
              <p className="text-[15px] text-ink-700">
                {r.text}
                {!r.mustHave && <span className="text-ink-400"> (nice to have)</span>}
              </p>
            </div>
            {proof && r.evidence[0] && <p className="mt-1 ml-7 text-sm text-ink-400">“{r.evidence[0].text}”</p>}
          </li>
        ))}
      </ul>
      {inflated > 0 && (
        <p className="mt-4 rounded-[14px] bg-brand-50 px-3 py-2 text-sm text-brand-700">
          Reading the raw file, {inflated} more would have looked met.
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-400">
        <button onClick={() => setProof(!proof)} className="font-medium hover:text-brand-900">
          {proof ? "Hide proof" : "Show proof"}
        </button>
        {confirmed > 0 && <span>{confirmed} claims confirmed by references</span>}
        {c.code?.verdict === "benign" && <span>Take-home code safe to grade</span>}
      </div>
    </Panel>
  );
}

function BlockedCode({ c }: { c: CandidateReport }) {
  if (!c.code || c.code.verdict === "benign") return null;
  return (
    <Panel title="Take-home code blocked" aside={c.code.category}>
      <p className="mb-3 text-sm text-ink-500">The grader was not run. The highlighted lines send secrets off the machine.</p>
      <pre className="overflow-x-auto rounded-[16px] bg-ink-50 p-4 font-mono text-xs leading-relaxed">
        <MarkedText text={c.code.text} marks={c.code.lines.map((l) => ({ start: l.start, end: l.end, className: "bg-alerte-soft text-alerte" }))} />
      </pre>
    </Panel>
  );
}

function headline(c: CandidateReport): string {
  if (c.decision.reasons.length) {
    // "Claim contradicted by records: ..." x4 becomes "Claim contradicted by records (4)".
    const counts = new Map<string, number>();
    for (const r of c.decision.reasons) {
      const kind = r.split(":")[0];
      counts.set(kind, (counts.get(kind) ?? 0) + 1);
    }
    return [...counts].map(([k, n]) => (n > 1 ? `${k} (${n})` : k)).join(". ") + ".";
  }
  if (c.decision.outcome === "reject") {
    const missing = c.requirements.find((r) => r.mustHave && r.verdict === "not_met");
    return missing ? `Must-have not met: ${missing.text.toLowerCase()}.` : "Does not meet the must-haves.";
  }
  return "Meets every must-have. Nothing to flag.";
}

export function CandidateDetail({
  candidate: c,
  duplicates,
  onBack,
}: {
  candidate: CandidateReport;
  duplicates: DuplicateFinding[];
  onBack: () => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const mine = duplicates.filter((d) => d.a === c.label || d.b === c.label);
  const credits = c.trail.reduce((s, t) => s + (t.credits ?? 0), 0);
  return (
    <main className="mx-auto max-w-[1160px] px-5 pt-4 pb-6 sm:px-7">
      <button onClick={onBack} className="mb-4 text-sm font-medium text-ink-500 hover:text-brand-900">
        ← All applicants
      </button>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <h1 className="title text-[2.4rem] leading-none">{revealed && c.name ? c.name : c.label}</h1>
        <OutcomeBadge outcome={c.decision.outcome} />
        <button onClick={() => setRevealed(!revealed)} className="btn btn-secondary btn-sm ml-auto">
          {revealed ? "Hide identity" : "Reveal identity"}
        </button>
      </div>
      <p className="mt-3 mb-8 text-[17px] text-ink-500">{headline(c)}</p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <div className="lg:sticky lg:top-6 lg:self-start">
          <ResumePaper key={c.id} candidate={c} revealed={revealed} />
        </div>
        <div className="space-y-5">
          <WhyFlagged c={c} duplicates={mine} revealed={revealed} />
          <Requirements c={c} />
          <BlockedCode c={c} />
          <details className="panel p-6">
            <summary className="cursor-pointer text-[17px] font-extrabold text-brand-900">Questions for the interview</summary>
            <p className="mt-3 text-[15px] leading-relaxed whitespace-pre-line text-ink-700">{c.scorecard.interviewQuestions}</p>
          </details>
          <details className="px-1 text-sm text-ink-400">
            <summary className="cursor-pointer hover:text-brand-900">
              How this was decided: {c.trail.length} Clocked calls, {credits} credits
            </summary>
            <table className="mt-3 w-full text-left">
              <tbody className="divide-y divide-rule-soft">
                {c.trail.map((t, i) => (
                  <tr key={i}>
                    <td className="py-1.5 pr-3 font-mono text-xs text-ink-700">/{t.endpoint}</td>
                    <td className="py-1.5 pr-3 text-ink-500">{t.purpose}</td>
                    <td className="py-1.5 text-right tabular-nums">{t.credits ?? "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </div>
      </div>
    </main>
  );
}
