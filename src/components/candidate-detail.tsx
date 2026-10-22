"use client";

import { useState, type ReactNode } from "react";
import type { CandidateReport, DuplicateFinding, Verdict } from "@/lib/types";
import { MarkedText } from "./marked-text";
import { OutcomeBadge, pct } from "./outcome";
import { ResumePaper } from "./resume-paper";

const VERDICT: Record<Verdict, { label: string; className: string }> = {
  met: { label: "Met", className: "text-pass" },
  not_met: { label: "Not met", className: "text-alerte" },
  not_established: { label: "Not shown", className: "text-hold" },
};

const INTENT: Record<string, string> = {
  instruction_to_ai: "Instructions to the AI screener",
  keyword_stuffing: "Keyword stuffing",
  benign: "Harmless",
};

const REASON: Record<string, string> = {
  invisible: "Invisible text",
  tiny: "Microscopic text",
  off_page: "Text outside the page",
  metadata: "File metadata",
};

function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="panel p-6">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="text-[17px] font-extrabold text-brand-900">{title}</h3>
        {aside && <div className="text-sm text-ink-500">{aside}</div>}
      </div>
      {children}
    </section>
  );
}

function Integrity({ c, duplicates }: { c: CandidateReport; duplicates: DuplicateFinding[] }) {
  const items: ReactNode[] = [];
  for (const [i, h] of c.hidden.entries()) {
    items.push(
      <li key={`h${i}`} className="border-l-2 border-brand-500 pl-3">
        <p className="font-medium text-brand-600">
          {REASON[h.reason]}: {INTENT[h.intent]}{" "}
          <span className="font-normal text-ink-500">({pct(h.intentProbability)} confident)</span>
        </p>
        <p className="mt-1 text-sm text-ink-500">“{h.text}”</p>
      </li>,
    );
  }
  if (c.injection.verdict !== "benign") {
    items.push(
      <li key="inj" className="border-l-2 border-alerte pl-3">
        <p className="font-medium text-alerte">
          Instruction aimed at the AI screener{" "}
          <span className="font-normal text-ink-500">
            ({c.injection.category}, {pct(c.injection.probability)} likely, severity {c.injection.severity})
          </span>
        </p>
        {c.injection.evidence.map((e, i) => (
          <p key={i} className="mt-1 text-sm text-ink-500">“{e.text}”</p>
        ))}
      </li>,
    );
  }
  for (const [i, d] of duplicates.entries()) {
    const other = d.a === c.label ? d.b : d.a;
    const quote = d.passages.find((p) => p.a.length > 30 && p.a.length < 400)?.a;
    items.push(
      <li key={`d${i}`} className="border-l-2 border-alerte pl-3">
        <p className="font-medium text-alerte">Resume copied with {other}</p>
        <p className="mt-1 text-sm text-ink-500">
          {quote ? <span className="italic">“{quote}”</span> : "Most of the resume matches, sentence for sentence."}
        </p>
      </li>,
    );
  }
  for (const [i, k] of c.coverLetterConflicts.entries()) {
    items.push(
      <li key={`k${i}`} className="border-l-2 border-alerte pl-3">
        <p className="font-medium text-alerte">Resume and cover letter disagree</p>
        <p className="mt-1 text-sm text-ink-500">
          Resume: <span className="italic">“{k.resume}”</span>
          <br />
          Cover letter: <span className="italic">“{k.coverLetter}”</span>
        </p>
      </li>,
    );
  }
  for (const [i, cl] of (c.claims ?? []).entries()) {
    if (cl.verdict !== "contradicted" || cl.probability < 0.8) continue;
    items.push(
      <li key={`c${i}`} className="border-l-2 border-alerte pl-3">
        <p className="font-medium text-alerte">Claim contradicted by the records</p>
        <p className="mt-1 text-sm">“{cl.claim}”</p>
        {cl.evidence && (
          <p className="mt-1 text-sm text-ink-500">
            {cl.evidence.document}: <span className="italic">“{cl.evidence.quote}”</span>
          </p>
        )}
      </li>,
    );
  }
  if (c.code && c.code.verdict !== "benign") {
    items.push(
      <li key="code" className="border-l-2 border-alerte pl-3">
        <p className="font-medium text-alerte">
          Take-home code is {c.code.verdict}: {c.code.category}
        </p>
        <p className="mt-1 text-sm text-ink-500">The grader was not run. See the flagged lines below.</p>
      </li>,
    );
  }
  return (
    <Section title="Integrity" aside={items.length ? `${items.length} finding${items.length > 1 ? "s" : ""}` : "Clean"}>
      {items.length ? (
        <ul className="space-y-4">{items}</ul>
      ) : (
        <p className="text-sm text-ink-500">
          No hidden text, no instructions to the screener, nothing copied from other applicants
          {c.claims ? ", and no claim contradicted by the references" : ""}.
        </p>
      )}
    </Section>
  );
}

function Requirements({ c }: { c: CandidateReport }) {
  const [showEvidence, setShowEvidence] = useState(false);
  return (
    <Section title="Requirements" aside={`Fit ${c.score}/100`}>
      <ul className="divide-y divide-rule-soft">
        {c.requirements.map((r) => {
          const v = VERDICT[r.verdict];
          const inflated = r.naiveVerdict === "met" && r.verdict !== "met";
          return (
            <li key={r.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-start justify-between gap-4">
                <p className="text-sm">
                  {r.text}
                  {r.mustHave && <span className="ml-2 text-xs text-ink-500">must-have</span>}
                </p>
                <p className={`shrink-0 text-sm font-semibold ${v.className}`}>
                  {v.label} <span className="font-normal text-ink-500">{pct(r.probabilities[r.verdict])}</span>
                </p>
              </div>
              {inflated && (
                <p className="mt-1 text-xs text-brand-600">Reading the raw file instead would have marked this as met.</p>
              )}
              {showEvidence && r.evidence.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {r.evidence.map((e, i) => (
                    <li key={i} className="text-sm text-ink-500">
                      <span className="font-sans text-xs">{e.source}:</span> {e.text}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
      <button onClick={() => setShowEvidence(!showEvidence)} className="mt-3 text-sm font-medium text-ink-500 underline-offset-2 hover:underline">
        {showEvidence ? "Hide" : "Show"} the passages behind each verdict
      </button>
    </Section>
  );
}

function Claims({ c }: { c: CandidateReport }) {
  const [open, setOpen] = useState(false);
  // Without references or credential records there is nothing to check, so the panel is left out.
  if (!c.claims) return null;
  const supported = c.claims.filter((x) => x.verdict === "supported");
  const contradicted = c.claims.filter((x) => x.verdict === "contradicted");
  const unstated = c.claims.filter((x) => x.verdict === "not_stated");
  const row = (x: (typeof c.claims)[number], i: number, cls: string, label: string) => (
    <li key={i} className="flex gap-3 text-sm">
      <span className={`w-24 shrink-0 font-semibold ${cls}`}>{label}</span>
      <span className="italic">{x.claim}</span>
    </li>
  );
  return (
    <Section
      title="Claims checked against references"
      aside={`${supported.length} confirmed, ${contradicted.length} contradicted, ${unstated.length} not covered`}
    >
      <ul className="space-y-2">
        {contradicted.map((x, i) => row(x, i, "text-alerte", "Contradicted"))}
        {supported.map((x, i) => row(x, i, "text-pass", "Confirmed"))}
        {open && unstated.map((x, i) => row(x, i, "text-ink-500", "Not covered"))}
      </ul>
      {unstated.length > 0 && (
        <button onClick={() => setOpen(!open)} className="mt-3 text-sm font-medium text-ink-500 underline-offset-2 hover:underline">
          {open ? "Hide" : "Show"} {unstated.length} claims the references don’t cover
        </button>
      )}
    </Section>
  );
}

function Code({ c }: { c: CandidateReport }) {
  if (!c.code) return null;
  const bad = c.code.verdict !== "benign";
  return (
    <Section
      title={`Take-home submission: ${c.code.filename}`}
      aside={<span className={bad ? "font-semibold text-alerte" : "font-semibold text-pass"}>{bad ? "Blocked before running" : "Safe to grade"}</span>}
    >
      <pre className="overflow-x-auto rounded-[16px] bg-ink-50 p-4 font-mono text-xs leading-relaxed">
        <MarkedText
          text={c.code.text}
          marks={bad ? c.code.lines.map((l) => ({ start: l.start, end: l.end, className: "bg-alerte-soft text-alerte" })) : []}
        />
      </pre>
    </Section>
  );
}

function Scorecard({ c }: { c: CandidateReport }) {
  return (
    <Section title="Questions for the interview" aside={`Seniority: ${c.scorecard.seniority}`}>
      <p className="text-[15px] leading-relaxed whitespace-pre-line text-ink-700">{c.scorecard.interviewQuestions}</p>
    </Section>
  );
}

function Trail({ c }: { c: CandidateReport }) {
  const credits = c.trail.reduce((s, t) => s + (t.credits ?? 0), 0);
  const ms = c.trail.reduce((s, t) => s + (t.modelMs ?? 0), 0);
  return (
    <Section title="Audit trail" aside={`${c.trail.length} Clocked calls, ${credits} credits`}>
      <details className="group">
        <summary className="cursor-pointer text-sm font-medium text-ink-500 hover:text-brand-900">
          Show every call, why it was made and what it cost ({(ms / 1000).toFixed(1)} s of model time)
        </summary>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-ink-500">
            <tr>
              <th className="py-1 pr-3 font-medium">Endpoint</th>
              <th className="py-1 pr-3 font-medium">Why it was called</th>
              <th className="py-1 pr-3 text-right font-medium">ms</th>
              <th className="py-1 text-right font-medium">Credits</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule-soft">
            {c.trail.map((t, i) => (
              <tr key={i}>
                <td className="py-1.5 pr-3 font-mono text-xs">/{t.endpoint}</td>
                <td className="py-1.5 pr-3">{t.purpose}</td>
                <td className="py-1.5 pr-3 text-right tabular-nums">{t.modelMs ? Math.round(t.modelMs) : "–"}</td>
                <td className="py-1.5 text-right tabular-nums">{t.credits ?? "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </details>
    </Section>
  );
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
  return (
    <main className="mx-auto max-w-[1160px] px-5 pt-4 pb-6 sm:px-7">
      <button onClick={onBack} className="mb-4 text-sm font-medium text-ink-500 hover:text-brand-900">
        ← All applicants
      </button>
      <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2">
        <h1 className="title text-[2.4rem] leading-none">{revealed && c.name ? c.name : c.label}</h1>
        <OutcomeBadge outcome={c.decision.outcome} />
        <button
          onClick={() => setRevealed(!revealed)}
          className="btn btn-secondary btn-sm ml-auto"
        >
          {revealed ? "Hide identity" : "Reveal identity"}
        </button>
      </div>
      {/* Integrity findings have their own panel; only show the summary line here. */}
      <p className="mb-6 max-w-[70ch] text-[15px] text-ink-500">{c.scorecard.summary}</p>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <div className="lg:sticky lg:top-6 lg:self-start">
          <ResumePaper key={c.id} candidate={c} revealed={revealed} />
        </div>
        <div className="space-y-5">
          <Integrity c={c} duplicates={mine} />
          <Requirements c={c} />
          <Claims c={c} />
          <Code c={c} />
          <Scorecard c={c} />
          <Trail c={c} />
        </div>
      </div>
    </main>
  );
}
