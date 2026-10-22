"use client";

import { useEffect, useState } from "react";
import type { RoundReport } from "@/lib/types";
import { OUTCOME_ORDER, OutcomeBadge } from "./outcome";

/** Raw-file score minus visible-resume score above which the gap is called out. */
export const INFLATION_GAP = 15;

/** The applicant open in the detail view, kept in the URL hash so links and the back button work. */
export function useSelectedApplicant(): [string | null, (label: string | null) => void] {
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => {
    const read = () => setSelected(decodeURIComponent(window.location.hash.slice(1)) || null);
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
  const open = (label: string | null) => {
    window.location.hash = label ? encodeURIComponent(label) : "";
    window.scrollTo({ top: 0 });
  };
  return [selected, open];
}

function ScoreBar({ value, tone }: { value: number; tone: "ink" | "uv" }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="h-2 w-20 overflow-hidden rounded-full bg-ink-100">
        <div className={`h-full rounded-full ${tone === "uv" ? "bg-brand-500" : "bg-brand-900"}`} style={{ width: `${value}%` }} />
      </div>
      <span className={`figure w-7 text-right text-[15px] ${tone === "uv" ? "!text-brand-600" : ""}`}>{value}</span>
    </div>
  );
}

/** One sentence on the round, then every applicant ranked by next step and fit. */
export function Shortlist({ report, onOpen }: { report: RoundReport; onOpen: (label: string) => void }) {
  const rows = [...report.candidates].sort(
    (a, b) => OUTCOME_ORDER.indexOf(a.decision.outcome) - OUTCOME_ORDER.indexOf(b.decision.outcome) || b.score - a.score,
  );
  const count = (o: string) => report.candidates.filter((c) => c.decision.outcome === o).length;
  const credits = report.trail.reduce((s, t) => s + (t.credits ?? 0), 0);
  const n = report.candidates.length;

  return (
    <>
      <p className="mt-3 max-w-[70ch] text-ink-500">
        {[
          `${count("advance")} of ${n} applicant${n > 1 ? "s" : ""} can go straight to interview.`,
          count("flagged") && `${count("flagged")} ${count("flagged") > 1 ? "have" : "has"} an integrity finding for a person to review.`,
          count("human_review") && `${count("human_review")} need${count("human_review") > 1 ? "" : "s"} a closer look at fit.`,
          count("reject") && `${count("reject")} clearly miss${count("reject") > 1 ? "" : "es"} a must-have.`,
          `Screening took ${credits.toLocaleString()} Clocked credits.`,
        ]
          .filter(Boolean)
          .join(" ")}
      </p>

      <div className="panel mt-6 overflow-x-auto">
        <table className="w-full min-w-[48rem] text-left">
          <thead className="text-[13px] text-ink-400">
            <tr className="border-b-[1.5px] border-rule">
              <th className="px-5 py-3.5 font-semibold">Applicant</th>
              <th className="px-5 py-3.5 font-semibold">Next step</th>
              <th className="px-5 py-3.5 font-semibold">Fit, visible resume</th>
              <th className="px-5 py-3.5 font-semibold">Fit, raw file</th>
              <th className="px-5 py-3.5 font-semibold">Why</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule-soft">
            {rows.map((c) => {
              const inflated = c.naiveScore - c.score >= INFLATION_GAP;
              return (
                <tr key={c.label} onClick={() => onOpen(c.label)} className="cursor-pointer hover:bg-rail">
                  <td className="px-5 py-4">
                    <button onClick={() => onOpen(c.label)} className="text-[15px] font-extrabold text-brand-900 hover:text-brand-600">
                      {c.label}
                    </button>
                    <p className="text-[13px] text-ink-400">{c.scorecard.seniority}</p>
                  </td>
                  <td className="px-5 py-4">
                    <OutcomeBadge outcome={c.decision.outcome} />
                  </td>
                  <td className="px-5 py-4">
                    <ScoreBar value={c.score} tone="ink" />
                  </td>
                  <td className="px-5 py-4">
                    <ScoreBar value={c.naiveScore} tone={inflated ? "uv" : "ink"} />
                  </td>
                  <td className="max-w-xs px-5 py-4 text-sm text-ink-500">
                    {c.decision.reasons[0] ??
                      (c.decision.outcome === "reject"
                        ? `Must-have not met: ${c.requirements.find((r) => r.mustHave && r.verdict === "not_met")?.text ?? "see the requirements"}`
                        : "Every must-have met, nothing to flag")}
                    {c.decision.reasons.length > 1 && <span className="text-ink-400"> (+{c.decision.reasons.length - 1} more)</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
