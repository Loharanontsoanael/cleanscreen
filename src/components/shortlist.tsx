"use client";

import { useEffect, useState } from "react";
import type { CandidateReport, RoundReport } from "@/lib/types";
import { isCopied, verdictOf } from "./verdict";

/** Raw-file score minus visible-resume score above which the gap is called out. */
export const INFLATION_GAP = 15;

/** The applicant open in the detail view, kept in the URL hash so links and the back button work. */
export function useSelectedApplicant(): [string | null, (label: string | null) => void] {
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => {
    const read = () => setSelected(decodeURIComponent(window.location.hash.slice(1)) || null);
    read();
    window.addEventListener("hashchange", read);
    window.addEventListener("popstate", read);
    return () => {
      window.removeEventListener("hashchange", read);
      window.removeEventListener("popstate", read);
    };
  }, []);
  // Open the view straight away, then record it in history; waiting for a hashchange event is not
  // reliable once the framework has taken over navigation.
  const open = (label: string | null) => {
    setSelected(label);
    const url = label ? `#${encodeURIComponent(label)}` : window.location.pathname + window.location.search;
    window.history.pushState(null, "", url);
    window.scrollTo({ top: 0 });
  };
  return [selected, open];
}

const ORDER: CandidateReport["decision"]["outcome"][] = ["advance", "human_review", "flagged", "reject"];

const STAMP_TONE: Record<CandidateReport["decision"]["outcome"], string> = {
  advance: "text-brand-900",
  human_review: "text-brand-600",
  flagged: "text-brand-600",
  reject: "text-ink-300",
};

/** Line widths (45–94%) that vary per applicant, so the sheets don't all look alike. */
function lineWidths(seed: string, count: number): number[] {
  let h = [...seed].reduce((n, ch) => (n * 31 + ch.charCodeAt(0)) >>> 0, 7);
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    h = (h * 1103515245 + 12345) >>> 0;
    out.push(45 + (h % 50));
  }
  return out;
}

/** Grey lines standing in for resume text. */
function SheetLines({ seed }: { seed: string }) {
  return (
    <>
      <span className="block h-2 w-[55%] rounded-[3px] bg-brand-900/85" />
      <span className="mt-1.5 mb-4 block h-1.5 w-[35%] rounded-[3px] bg-ink-200" />
      {lineWidths(seed, 9).map((w, i) => (
        <span key={i} className="mt-2 block h-1 rounded-[3px] bg-ink-100" style={{ width: `${w}%` }} />
      ))}
    </>
  );
}

/** Each application as a small resume sheet, stamped with what to do next. */
export function Shortlist({ report, onOpen }: { report: RoundReport; onOpen: (label: string) => void }) {
  const credits = report.trail.reduce((s, t) => s + (t.credits ?? 0), 0);
  const rows = [...report.candidates].sort(
    (a, b) => ORDER.indexOf(a.decision.outcome) - ORDER.indexOf(b.decision.outcome) || b.score - a.score,
  );
  return (
    <div className="mt-8">
      <ul className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
        {rows.map((c) => {
          const v = verdictOf(c, isCopied(c, report.duplicates));
          const inflated = c.naiveScore - c.score >= INFLATION_GAP;
          return (
            <li key={c.label}>
              <button onClick={() => onOpen(c.label)} className="group block w-full text-left">
                <span className="relative block aspect-[210/297] overflow-hidden rounded-[4px] border border-ink-100 bg-white px-[9%] py-[10%] shadow-[0_1px_2px_rgb(15_27_45/0.08),0_14px_30px_-14px_rgb(15_27_45/0.35)] transition-transform duration-150 group-hover:-translate-y-1 group-hover:-rotate-1">
                  <SheetLines seed={c.label} />
                  <span
                    className={`absolute top-[58%] left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-[14deg] rounded-[6px] border-[3px] border-current bg-white/75 px-2.5 py-1 font-mono text-[12px] font-extrabold tracking-[0.08em] whitespace-nowrap uppercase shadow-[inset_0_0_0_1px_currentColor] mix-blend-multiply sm:text-[13px] ${STAMP_TONE[c.decision.outcome]}`}
                  >
                    {v.stamp}
                  </span>
                </span>
                <span className="mt-3 flex items-baseline justify-between gap-2">
                  <span className="text-[15px] font-extrabold whitespace-nowrap text-brand-900 group-hover:text-brand-600">{c.label}</span>
                  <span className="figure text-[18px]">{c.score}</span>
                </span>
                <span className="block text-[12.5px] font-medium text-ink-400">{c.scorecard.seniority}</span>
                <span className="mt-1 block text-[13.5px] leading-snug text-ink-500">{v.sentence}</span>
                {inflated && (
                  <span className="mt-1.5 block text-[12.5px] font-semibold text-brand-600">An AI reading the file: {c.naiveScore}</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-8 text-[13px] text-ink-400">
        {report.candidates.length} applicant{report.candidates.length > 1 ? "s" : ""} screened with {credits.toLocaleString()} Clocked credits.
      </p>
    </div>
  );
}
