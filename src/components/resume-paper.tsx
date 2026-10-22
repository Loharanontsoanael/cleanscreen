"use client";

import { Fragment, type ReactNode } from "react";
import type { CandidateReport } from "@/lib/types";
import { locate } from "./marked-text";

const MASK = "█";

/** Replaces personal details with same-length blocks, so Clocked's offsets into the text stay valid. */
function mask(text: string, values: string[]): string {
  let out = text;
  for (const v of values) if (v.trim().length > 1) out = out.replaceAll(v, MASK.repeat(Array.from(v).length));
  return out;
}

const isHeading = (l: string) => l.length > 2 && l.length < 30 && l === l.toUpperCase() && /[A-Z]/.test(l);
const isDates = (l: string) => /^\d{4}\s*[-–]\s*(present|\d{4})$/i.test(l);
const isBullet = (l: string) => /^[•\-*]\s/.test(l);

interface Span {
  start: number;
  end: number;
}

/** One line of the resume, with masked details as bars and hidden spans drawn per view. */
function Line({ chars, from, hidden, machine }: { chars: string[]; from: number; hidden: Span[]; machine: boolean }) {
  const to = from + chars.length;
  const cuts = new Set([0, chars.length]);
  for (const h of hidden) {
    if (h.end <= from || h.start >= to) continue;
    cuts.add(Math.max(0, h.start - from));
    cuts.add(Math.min(chars.length, h.end - from));
  }
  const points = [...cuts].sort((a, b) => a - b);
  const out: ReactNode[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const [a, b] = [points[i], points[i + 1]];
    const piece = chars.slice(a, b).join("");
    const isHidden = hidden.some((h) => h.start <= from + a && h.end >= from + b);
    const content = piece.split(/(█+)/g).map((p, j) =>
      p.startsWith(MASK) ? (
        <span key={j} className="rounded-[3px] bg-ink-100 text-transparent select-none">
          {p}
        </span>
      ) : (
        <Fragment key={j}>{p}</Fragment>
      ),
    );
    out.push(
      isHidden ? (
        // On the page this text is invisible; the machine view lights it up where it sits.
        <span key={a} className={machine ? "uv-text uv-reveal" : "text-transparent select-none"}>
          {content}
        </span>
      ) : (
        <Fragment key={a}>{content}</Fragment>
      ),
    );
  }
  return <>{out}</>;
}

/**
 * The resume laid out as a page: header, sections, roles with dates, bullets.
 * The same file text drives both views; only hidden spans change, invisible on
 * the page and violet in the machine view.
 */
export function ResumeText({ c, machine, revealed }: { c: CandidateReport; machine: boolean; revealed: boolean }) {
  const text = revealed ? c.machineText : mask(c.machineText, c.piiFound.map((p) => p.value));
  const hidden: Span[] = [];
  for (const h of c.hidden) {
    const at = locate(c.machineText, h.text);
    if (at) hidden.push(at);
  }
  if (c.injection.verdict !== "benign") for (const e of c.injection.evidence) hidden.push({ start: e.start, end: e.end });

  // Split into lines while keeping each line's code-point offset into the file text.
  const all = Array.from(text);
  const lines: { chars: string[]; from: number }[] = [];
  let from = 0;
  for (let i = 0; i <= all.length; i++) {
    if (i === all.length || all[i] === "\n") {
      lines.push({ chars: all.slice(from, i), from });
      from = i + 1;
    }
  }

  const blocks: ReactNode[] = [];
  let header = 0;
  for (let i = 0; i < lines.length; i++) {
    const { chars, from: start } = lines[i];
    const raw = chars.join("").trim();
    if (!raw) continue;
    const line = (l = lines[i]) => <Line chars={l.chars} from={l.from} hidden={hidden} machine={machine} />;

    if (header === 0) {
      blocks.push(<p key={i} className="text-[24px] leading-tight font-bold tracking-tight text-ink-900">{line()}</p>);
      header++;
    } else if (header === 1) {
      blocks.push(<p key={i} className="mt-0.5 text-[15px] font-semibold text-brand-700">{line()}</p>);
      header++;
    } else if (header === 2) {
      blocks.push(<p key={i} className="mt-1.5 text-[12px] text-ink-400">{line()}</p>);
      header++;
    } else if (isHeading(raw)) {
      blocks.push(
        <p key={i} className="mt-6 mb-2 border-b border-brand-200 pb-1 text-[11px] font-bold tracking-[0.12em] text-brand-700 uppercase">
          {line()}
        </p>,
      );
    } else if (isDates(raw) && lines[i + 1]) {
      const role = lines[i + 1];
      blocks.push(
        <div key={i} className="mt-2 flex items-baseline justify-between gap-4">
          <p className="text-[14px] font-bold text-ink-900">{line(role)}</p>
          <p className="shrink-0 text-[12px] text-ink-400">{line()}</p>
        </div>,
      );
      i++;
    } else if (isBullet(raw)) {
      const offset = chars.findIndex((ch) => !/[\s•\-*]/.test(ch));
      blocks.push(
        <p key={i} className="relative mt-1 pl-4 text-[13.5px] leading-snug text-ink-700">
          <span className="absolute left-1 text-ink-400">•</span>
          <Line chars={chars.slice(offset)} from={start + offset} hidden={hidden} machine={machine} />
        </p>,
      );
    } else {
      blocks.push(<p key={i} className="mt-1 text-[13.5px] leading-snug text-ink-700">{line()}</p>);
    }
  }

  return <div className="font-[Helvetica,Arial,sans-serif]">{blocks}</div>;
}
