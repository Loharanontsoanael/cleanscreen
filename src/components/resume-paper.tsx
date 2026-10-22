"use client";

import { Fragment, type ReactNode } from "react";
import type { CandidateReport } from "@/lib/types";
import { locate, MarkedText, type Mark } from "./marked-text";

const MASK = "█";

/** Replaces personal details with same-length blocks, so Clocked's offsets into the text stay valid. */
function mask(text: string, values: string[]): string {
  let out = text;
  for (const v of values) if (v.trim().length > 1) out = out.replaceAll(v, MASK.repeat(Array.from(v).length));
  return out;
}

const isHeading = (line: string) => line.length > 2 && line.length < 30 && line === line.toUpperCase() && /[A-Z]/.test(line);

/** Lays out plain resume text: section headings, redaction bars for masked details. */
function layout(segment: string): ReactNode {
  return segment.split("\n").map((line, i, all) => {
    const nl = i < all.length - 1 ? "\n" : "";
    if (isHeading(line.trim())) {
      return (
        <span key={i} className="mt-5 mb-1 block text-[13px] font-semibold text-ink-400">
          {line.trim().charAt(0) + line.trim().slice(1).toLowerCase()}
        </span>
      );
    }
    const parts = line.split(/(█+)/g).map((p, j) =>
      p.startsWith(MASK) ? (
        <span key={j} className="rounded-[4px] bg-ink-100 text-transparent select-none" aria-label="hidden detail">
          {p}
        </span>
      ) : (
        <Fragment key={j}>{p}</Fragment>
      ),
    );
    return (
      <Fragment key={i}>
        {parts}
        {nl}
      </Fragment>
    );
  });
}

/**
 * The resume as text. In the machine view, lines only an AI can read are shown
 * in violet where they sit in the file. Personal details stay masked until
 * the reviewer reveals identity.
 */
export function ResumeText({ c, machine, revealed }: { c: CandidateReport; machine: boolean; revealed: boolean }) {
  const source = machine ? c.machineText : c.visibleText;
  const text = revealed ? source : mask(source, c.piiFound.map((p) => p.value));
  const marks: Mark[] = [];
  if (machine) {
    for (const h of c.hidden) {
      const at = locate(c.machineText, h.text);
      if (at) marks.push({ ...at, className: "uv-text uv-reveal" });
    }
    if (c.injection.verdict !== "benign") {
      for (const e of c.injection.evidence) marks.push({ start: e.start, end: e.end, className: "uv-text" });
    }
  }
  return (
    <div className="text-[15px] leading-relaxed whitespace-pre-wrap text-ink-700">
      <MarkedText text={text} marks={marks} render={layout} />
    </div>
  );
}
