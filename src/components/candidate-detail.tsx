"use client";

import { useState, type ReactNode } from "react";
import { Cancel01Icon, CheckmarkCircle02Icon, Download04Icon, HelpCircleIcon } from "@hugeicons/core-free-icons";
import type { CandidateReport, DuplicateFinding, Verdict } from "@/lib/types";
import { glyph } from "./glyph";
import { MarkedText } from "./marked-text";
import { OutcomeBadge } from "./outcome";
import { INFLATION_GAP } from "./shortlist";
import { TwoReaders } from "./two-readers";
import { UvLamp } from "./uv-lamp";
import { verdictOf } from "./verdict";

const VERDICT_ICON: Record<Verdict, ReactNode> = {
  met: <span className="text-pass" aria-label="Met">{glyph(CheckmarkCircle02Icon, 18, 2)}</span>,
  not_met: <span className="text-alerte" aria-label="Not met">{glyph(Cancel01Icon, 18, 2)}</span>,
  not_established: <span className="text-hold" aria-label="Not shown on the resume">{glyph(HelpCircleIcon, 18, 2)}</span>,
};

/** The evidence for the verdict, shown once. */
function Proof({ c, duplicates }: { c: CandidateReport; duplicates: DuplicateFinding[] }) {
  const pairs: { said: string; record: string; source: string }[] = [];
  for (const x of c.claims ?? []) {
    if (x.verdict === "contradicted" && x.probability >= 0.8 && x.evidence) {
      pairs.push({ said: x.claim, record: x.evidence.quote, source: x.evidence.document });
    }
  }
  for (const k of c.coverLetterConflicts) pairs.push({ said: k.resume, record: k.coverLetter, source: "Cover letter" });
  for (const d of duplicates) {
    const p = d.passages.find((x) => x.a.length > 30 && x.a.length < 400);
    if (p) pairs.push({ said: p.a, record: p.b, source: d.a === c.label ? d.b : d.a });
  }

  if (c.code && c.code.verdict !== "benign") {
    return (
      <pre className="overflow-x-auto rounded-[20px] bg-ink-50 p-5 font-mono text-xs leading-relaxed">
        <MarkedText text={c.code.text} marks={c.code.lines.map((l) => ({ start: l.start, end: l.end, className: "bg-alerte-soft text-alerte" }))} />
      </pre>
    );
  }
  if (!pairs.length) return null;
  return (
    <ul className="space-y-5">
      {pairs.map((p, i) => (
        <li key={i} className="grid gap-1 sm:grid-cols-[8rem_1fr] sm:gap-4">
          <span className="text-[13px] font-semibold text-ink-400">Resume says</span>
          <span className="text-[15px] text-ink-700">“{p.said}”</span>
          <span className="text-[13px] font-semibold text-alerte">{p.source}</span>
          <span className="text-[15px] text-ink-700">“{p.record}”</span>
        </li>
      ))}
    </ul>
  );
}

export type DocumentKind = "blind" | "evidence";
/** Where to get a copy of the PDF: a saved file in the demo, built on request in a live round. */
export type DocumentSource = (kind: DocumentKind) => Promise<string>;

/** The blind copy and the evidence PDF, fetched and saved on click. */
function Downloads({ c, source }: { c: CandidateReport; source: DocumentSource }) {
  const [busy, setBusy] = useState<DocumentKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hidden = c.hidden.some((h) => h.page !== null);
  const items: { kind: DocumentKind; label: string }[] = [
    { kind: "blind", label: "Blind copy (PDF)" },
    { kind: "evidence", label: hidden ? "Evidence PDF, hidden text boxed" : "Evidence PDF" },
  ];
  async function save(kind: DocumentKind) {
    setBusy(kind);
    setError(null);
    try {
      const a = document.createElement("a");
      a.href = await source(kind);
      a.download = `${c.label} - ${kind === "blind" ? "blind copy" : "evidence"}.pdf`;
      a.click();
    } catch (err) {
      setError(err instanceof Error ? err.message : "The PDF could not be built.");
    } finally {
      setBusy(null);
    }
  }
  return (
    <div className="mt-6">
      <div className="flex flex-wrap gap-2.5">
        {items.map((i) => (
          <button key={i.kind} onClick={() => save(i.kind)} disabled={busy !== null} className="btn btn-secondary h-11 px-4 text-[14px] disabled:opacity-60">
            {glyph(Download04Icon, 17)}
            {busy === i.kind ? "Preparing…" : i.label}
          </button>
        ))}
      </div>
      {error && <p className="mt-2 text-sm text-alerte">{error}</p>}
    </div>
  );
}

/** Why a person should look, as a checklist the reviewer can work through. */
function ReviewNotes({ reasons }: { reasons: string[] }) {
  const [done, setDone] = useState<boolean[]>([]);
  return (
    <section className="mt-10 rounded-[20px] bg-brand-50 px-5 py-5 sm:px-6">
      <h2 className="text-[15px] font-extrabold text-brand-900">Why a person should look</h2>
      <ul className="mt-2.5 space-y-1">
        {reasons.map((r, i) => (
          <li key={i}>
            <label className="flex cursor-pointer items-start gap-2.5 py-1 text-[15px] text-ink-700">
              <input
                type="checkbox"
                checked={done[i] ?? false}
                onChange={(e) => setDone((d) => Object.assign([...d], { [i]: e.target.checked }))}
                className="peer sr-only"
              />
              <span
                aria-hidden
                className="mt-0.5 grid size-[18px] shrink-0 place-items-center rounded-[5px] border-2 border-brand-600 bg-white text-white peer-checked:bg-brand-600 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-300"
              >
                {done[i] && (
                  <svg viewBox="0 0 16 16" className="size-3.5">
                    <path d="M3.5 8.5l3 3L12.5 5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <span className={done[i] ? "text-ink-400 line-through" : undefined}>{r}</span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function CandidateDetail({
  candidate: c,
  duplicates,
  onBack,
  documents,
}: {
  candidate: CandidateReport;
  duplicates: DuplicateFinding[];
  onBack: () => void;
  documents?: DocumentSource;
}) {
  const hasHidden = c.hidden.some((h) => h.intent !== "benign") || c.injection.verdict !== "benign";
  const mine = duplicates.filter((d) => d.a === c.label || d.b === c.label);
  const credits = c.trail.reduce((s, t) => s + (t.credits ?? 0), 0);

  return (
    <main className="mx-auto max-w-[760px] px-5 pt-4 pb-6 sm:px-7">
      <div className="flex items-center justify-between gap-4 text-sm">
        <button onClick={onBack} className="font-medium text-ink-500 hover:text-brand-900">
          ← All applicants
        </button>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2">
        <h1 className="title text-[2.4rem] leading-none">{c.label}</h1>
        <OutcomeBadge outcome={c.decision.outcome} />
      </div>
      <p className="mt-4 text-[1.35rem] leading-snug font-semibold text-brand-900">{verdictOf(c, mine.length > 0).sentence}</p>
      {documents && <Downloads c={c} source={documents} />}
      {c.naiveScore - c.score >= INFLATION_GAP && (
        <div className="mt-10">
          <TwoReaders score={c.score} naiveScore={c.naiveScore} />
        </div>
      )}
      {c.decision.reasons.length > 0 && <ReviewNotes reasons={c.decision.reasons} />}

      <div className="mt-10">
        <Proof c={c} duplicates={mine} />
      </div>

      <section className={hasHidden || !c.claims ? "mt-2" : "mt-12"}>
        <h2 className="text-[17px] font-extrabold text-brand-900">Resume</h2>
        <div className="mt-3">
          <UvLamp c={c} />
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-[17px] font-extrabold text-brand-900">Requirements</h2>
        <ul className="mt-4 space-y-3">
          {c.requirements.map((r) => (
            <li key={r.id} className="flex items-start gap-2.5">
              <span className="mt-px">{VERDICT_ICON[r.verdict]}</span>
              <p className="text-[15px] text-ink-700">
                {r.text}
                {!r.mustHave && <span className="text-ink-400"> (nice to have)</span>}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {c.warnings?.length > 0 && (
        <p className="mt-8 rounded-[14px] bg-rail px-4 py-3 text-sm text-ink-500">
          Not checked for this application: {c.warnings.join("; ")}. CleanScreen won’t send it straight to interview.
        </p>
      )}

      <div className="mt-12 space-y-3 border-t-[1.5px] border-rule pt-6 text-sm">
        <details>
          <summary className="cursor-pointer font-medium text-ink-500 hover:text-brand-900">Interview questions</summary>
          <p className="mt-3 text-[15px] leading-relaxed whitespace-pre-line text-ink-700">{c.scorecard.interviewQuestions}</p>
        </details>
        <details>
          <summary className="cursor-pointer font-medium text-ink-500 hover:text-brand-900">
            How this was decided ({c.trail.length} Clocked calls, {credits} credits)
          </summary>
          <table className="mt-3 w-full text-left">
            <tbody className="divide-y divide-rule-soft">
              {c.trail.map((t, i) => (
                <tr key={i}>
                  <td className="py-1.5 pr-3 font-mono text-xs text-ink-700">/{t.endpoint}</td>
                  <td className="py-1.5 pr-3 text-ink-500">{t.purpose}</td>
                  <td className="py-1.5 text-right text-ink-400 tabular-nums">{t.credits ?? "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </div>
    </main>
  );
}
