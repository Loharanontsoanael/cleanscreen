"use client";

import { useState } from "react";
import type { CandidateReport } from "@/lib/types";
import { locate, MarkedText, type Mark } from "./marked-text";

type View = "human" | "machine";

const REASON_TITLE: Record<string, string> = {
  invisible: "Invisible on the page (same colour as the background, hidden or covered)",
  tiny: "Printed too small to read",
  off_page: "Placed outside the printed page",
  metadata: "Stored in the file's metadata",
};

const REDACTED: Record<string, string> = {
  person: "name",
  email: "email",
  phone: "phone",
  address: "address",
  location: "location",
  date_of_birth: "date of birth",
  personal_status: "family status",
};

const MASK = "\u2588";

/** Replaces personal details with same-length blocks, so Clocked's offsets into the text stay valid. */
function mask(text: string, values: string[]): string {
  let out = text;
  for (const v of values) if (v.trim().length > 1) out = out.replaceAll(v, MASK.repeat(Array.from(v).length));
  return out;
}

/** Draws each run of mask blocks as a redaction bar. */
function renderMasked(s: string) {
  return s.split(/(\u2588+)/g).map((part, i) =>
    part.startsWith(MASK) ? (
      <span key={i} className="rounded-[4px] bg-ink-200 text-transparent select-none" aria-label="hidden detail">
        {part}
      </span>
    ) : (
      part
    ),
  );
}

export function ResumePaper({ candidate: c, revealed }: { candidate: CandidateReport; revealed: boolean }) {
  const [view, setView] = useState<View>(c.hidden.length ? "machine" : "human");
  const redacted = [...new Set(c.piiFound.map((p) => REDACTED[p.type] ?? p.type.replaceAll("_", " ")))];
  const hide = (t: string) => (revealed ? t : mask(t, c.piiFound.map((p) => p.value)));

  let body: React.ReactNode = <MarkedText text={hide(c.visibleText)} marks={[]} render={renderMasked} />;
  if (view === "machine") {
    const marks: Mark[] = [];
    for (const h of c.hidden) {
      const at = locate(c.machineText, h.text);
      if (at) marks.push({ ...at, className: "uv-text uv-reveal", title: REASON_TITLE[h.reason] });
    }
    if (c.injection.verdict !== "benign") {
      for (const e of c.injection.evidence) {
        marks.push({ start: e.start, end: e.end, className: "rounded bg-alerte-soft text-alerte underline decoration-2", title: "Instruction aimed at the AI screener" });
      }
    }
    body = <MarkedText text={hide(c.machineText)} marks={marks} render={renderMasked} />;
  }

  return (
    <div>
      <div role="tablist" aria-label="Resume view" className="mb-3 grid grid-cols-2 gap-1 rounded-full bg-ink-50 p-1">
        {(
          [
            ["human", "What you see"],
            ["machine", "What the AI reads"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={view === id}
            onClick={() => setView(id)}
            className={`rounded-full px-2 py-2 text-[13px] font-semibold whitespace-nowrap transition-colors ${
              view === id ? (id === "machine" ? "bg-brand-600 text-white" : "bg-brand-900 text-white") : "text-ink-500 hover:text-brand-900"
            }`}
          >
            {label}
            {id === "machine" && c.hidden.length > 0 && (
              <span className={`ml-1.5 rounded-full px-1.5 text-[11px] ${view === id ? "bg-white/25" : "bg-brand-100 text-brand-600"}`}>
                {c.hidden.length}
              </span>
            )}
          </button>
        ))}
      </div>
      <article className="panel panel-key min-h-[28rem] px-7 py-8 text-[15px] leading-relaxed whitespace-pre-wrap text-ink-700" aria-live="polite">
        {body}
      </article>
      {redacted.length > 0 && (
        <p className="mt-3 text-[13px] text-ink-400">Scored blind: {redacted.join(", ")} removed before scoring.</p>
      )}
    </div>
  );
}
