"use client";

import { useState } from "react";
import type { CandidateReport } from "@/lib/types";
import { locate, MarkedText, renderRedactions, type Mark } from "./marked-text";

type View = "blind" | "human" | "machine";

const VIEWS: { id: View; label: string; hint: string }[] = [
  { id: "blind", label: "Blind copy", hint: "The visible resume with identity removed. This is the only text that is scored." },
  { id: "human", label: "What a person sees", hint: "The text a reviewer sees on the rendered page." },
  { id: "machine", label: "What the AI reads", hint: "Everything a text extractor pulls out of the file. Text no person can see is shown in violet." },
];

const REASON_TITLE: Record<string, string> = {
  invisible: "Invisible on the page (same colour as the background, hidden or covered)",
  tiny: "Printed too small to read",
  off_page: "Placed outside the printed page",
  metadata: "Stored in the file's metadata",
};

export function ResumePaper({ candidate, initialView = "blind" }: { candidate: CandidateReport; initialView?: View }) {
  const [view, setView] = useState<View>(initialView);
  const hiddenCount = candidate.hidden.length;

  let body: React.ReactNode;
  if (view === "blind") {
    body = <MarkedText text={candidate.blindText} marks={[]} render={renderRedactions} />;
  } else if (view === "human") {
    body = candidate.visibleText;
  } else {
    const marks: Mark[] = [];
    for (const h of candidate.hidden) {
      const at = locate(candidate.machineText, h.text);
      if (at) marks.push({ ...at, className: "uv-text uv-reveal", title: REASON_TITLE[h.reason] });
    }
    for (const e of candidate.injection.evidence) {
      if (candidate.injection.verdict === "benign") break;
      marks.push({ start: e.start, end: e.end, className: "rounded bg-alerte-soft text-alerte underline decoration-2", title: "Instruction aimed at the AI screener" });
    }
    body = <MarkedText text={candidate.machineText} marks={marks} />;
  }

  return (
    <div>
      <div role="tablist" aria-label="Resume view" className="mb-3 grid grid-cols-3 gap-1 rounded-full bg-ink-50 p-1">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            role="tab"
            aria-selected={view === v.id}
            onClick={() => setView(v.id)}
            className={`rounded-full px-2 py-2 text-[13px] font-semibold whitespace-nowrap transition-colors ${
              view === v.id
                ? v.id === "machine"
                  ? "bg-brand-600 text-white"
                  : "bg-brand-900 text-white"
                : "text-ink-500 hover:text-brand-900"
            }`}
          >
            {v.label}
            {v.id === "machine" && hiddenCount > 0 && (
              <span className={`ml-1.5 rounded-full px-1.5 text-[11px] ${view === v.id ? "bg-white/25" : "bg-brand-100 text-brand-600"}`}>
                {hiddenCount}
              </span>
            )}
          </button>
        ))}
      </div>
      <p className="mb-3 text-sm text-ink-500">{VIEWS.find((v) => v.id === view)?.hint}</p>
      <article
        className="panel panel-key min-h-[32rem] px-7 py-8 text-[15px] leading-relaxed whitespace-pre-wrap text-ink-700"
        aria-live="polite"
      >
        {body}
      </article>
    </div>
  );
}
