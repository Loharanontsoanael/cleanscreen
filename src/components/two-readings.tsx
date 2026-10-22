"use client";

import { useState } from "react";
import type { CandidateReport } from "@/lib/types";

/** The line after a section heading of the visible resume, e.g. the first line under SUMMARY. */
function after(lines: string[], heading: string, offset = 1): string {
  const i = lines.findIndex((l) => l.trim().toUpperCase() === heading);
  return i >= 0 ? (lines[i + offset] ?? "") : "";
}

function Reading({
  c,
  machine,
}: {
  c: CandidateReport;
  machine: boolean;
}) {
  const lines = c.visibleText.split("\n");
  const hidden = c.hidden.find((h) => h.intent !== "benign" && h.page !== null);
  const rows: [string, string][] = [
    ["Summary", after(lines, "SUMMARY")],
    ["Experience", after(lines, "EXPERIENCE", 2)],
    ["Skills", after(lines, "SKILLS")],
  ];
  return (
    <div className={`panel flex flex-col p-6 sm:p-7 ${machine ? "panel-key border-brand-200" : ""}`}>
      <div className="flex items-center justify-between gap-3 max-md:justify-end">
        <span className={`pill hidden md:inline-flex ${machine ? "" : "pill-neutre"}`}>{machine ? "As an AI reads it" : "As you see it"}</span>
        <p className="figure text-[2.6rem]" style={machine ? { color: "var(--color-brand-600)" } : undefined}>
          {machine ? c.naiveScore : c.score}
          <span className="unit">/100</span>
        </p>
      </div>
      <p className="mt-5 text-[17px] font-extrabold text-brand-900">{c.label}</p>
      <p className="text-sm font-semibold text-ink-500">{lines[1]}</p>
      <dl className="mt-4 space-y-3 text-[14.5px] leading-snug">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt className="text-[13px] font-semibold text-ink-400">{k}</dt>
            <dd className="text-ink-700">{v}</dd>
          </div>
        ))}
        {machine && hidden && (
          <div>
            <dt className="text-[13px] font-semibold text-brand-600">Printed in white</dt>
            <dd className="mt-1 rounded-[14px] bg-brand-50 px-3 py-2 text-brand-700">{hidden.text}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}

/**
 * One applicant's resume read two ways: the page a person sees and the text an AI extracts.
 * Side by side on wide screens; on a phone, one card with a switch so the content isn't repeated.
 */
export function TwoReadings({ c }: { c: CandidateReport }) {
  const [machine, setMachine] = useState(true);
  return (
    <>
      <div className="hidden gap-4 md:grid md:grid-cols-2 md:items-start">
        <Reading c={c} machine={false} />
        <Reading c={c} machine />
      </div>
      <div className="md:hidden">
        <div className="mb-3 grid grid-cols-2 gap-1 rounded-full bg-ink-50 p-1 text-[13px] font-semibold">
          {[false, true].map((m) => (
            <button
              key={String(m)}
              onClick={() => setMachine(m)}
              aria-pressed={machine === m}
              className={`rounded-full py-2 transition-colors ${
                machine === m ? (m ? "bg-brand-600 text-white" : "bg-brand-900 text-white") : "text-ink-500"
              }`}
            >
              {m ? "As an AI reads it" : "As you see it"}
            </button>
          ))}
        </div>
        <Reading c={c} machine={machine} />
      </div>
    </>
  );
}
