"use client";

import { useEffect, useState } from "react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import type { CandidateReport, RoundReport } from "@/lib/types";
import { glyph } from "./glyph";
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

const GROUPS: { outcome: CandidateReport["decision"]["outcome"]; title: string; tone: string }[] = [
  { outcome: "advance", title: "Ready for interview", tone: "text-pass bg-pass-soft" },
  { outcome: "human_review", title: "Worth a closer look", tone: "text-hold bg-hold-soft" },
  { outcome: "flagged", title: "Needs a person to check", tone: "text-alerte bg-alerte-soft" },
  { outcome: "reject", title: "Not a match", tone: "text-ink-500 bg-ink-100" },
];

/** Applicants grouped by next step, one plain sentence each. */
export function Shortlist({ report, onOpen }: { report: RoundReport; onOpen: (label: string) => void }) {
  const credits = report.trail.reduce((s, t) => s + (t.credits ?? 0), 0);
  return (
    <div className="mt-8 space-y-10">
      {GROUPS.map((g) => {
        const rows = report.candidates.filter((c) => c.decision.outcome === g.outcome).sort((a, b) => b.score - a.score);
        if (!rows.length) return null;
        return (
          <section key={g.outcome}>
            <h3 className="flex items-baseline gap-2 text-[17px] font-extrabold text-brand-900">
              {g.title}
              <span className="text-[15px] font-semibold text-ink-400">{rows.length}</span>
            </h3>
            <ul className="mt-3 divide-y divide-rule-soft border-y-[1.5px] border-rule">
              {rows.map((c) => {
                const v = verdictOf(c, isCopied(c, report.duplicates));
                const inflated = c.naiveScore - c.score >= INFLATION_GAP;
                return (
                  <li key={c.label}>
                    <button
                      onClick={() => onOpen(c.label)}
                      className="group flex w-full items-center gap-4 px-1 py-4 text-left hover:bg-rail sm:px-3"
                    >
                      <span className={`grid size-11 shrink-0 place-items-center rounded-full ${g.tone}`}>{glyph(v.icon, 20, 1.8)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[16px] font-extrabold text-brand-900">
                          {c.label}
                          <span className="ml-2 text-[13px] font-medium text-ink-400">{c.scorecard.seniority}</span>
                        </span>
                        <span className="block text-[15px] text-ink-500">{v.sentence}</span>
                      </span>
                      {inflated && (
                        <span className="hidden shrink-0 rounded-full bg-brand-50 px-3 py-1 text-[13px] font-semibold text-brand-700 md:inline">
                          An AI would have said {c.naiveScore}
                        </span>
                      )}
                      <span className="w-14 shrink-0 text-right">
                        <span className="figure text-[22px]">{c.score}</span>
                        <span className="block text-[11px] font-semibold text-ink-400">fit</span>
                      </span>
                      <span className="shrink-0 text-ink-300 group-hover:text-brand-600">{glyph(ArrowRight01Icon, 18, 2)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      <p className="text-[13px] text-ink-400">
        {report.candidates.length} applicants screened with {credits.toLocaleString()} Clocked credits.
      </p>
    </div>
  );
}
