import { Fragment, type ReactNode } from "react";

export interface Mark {
  /** Code-point offsets, the unit Clocked returns. */
  start: number;
  end: number;
  className: string;
  title?: string;
}

/** Converts a UTF-16 index (what JavaScript strings use) to a code-point offset. */
export function toCodePoint(text: string, utf16Index: number): number {
  return Array.from(text.slice(0, utf16Index)).length;
}

/** Finds `needle` in `text` ignoring whitespace differences; returns code-point offsets. */
export function locate(text: string, needle: string): { start: number; end: number } | null {
  const words = needle.trim().split(/\s+/).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (!words.length || !words[0]) return null;
  const match = new RegExp(words.join("\\s+")).exec(text);
  if (!match) return null;
  return { start: toCodePoint(text, match.index), end: toCodePoint(text, match.index + match[0].length) };
}

/** Renders text with non-overlapping marks; later marks lose to earlier ones where they overlap. */
export function MarkedText({ text, marks, render }: { text: string; marks: Mark[]; render?: (s: string) => ReactNode }) {
  const chars = Array.from(text);
  const sorted = [...marks].sort((a, b) => a.start - b.start);
  const out: ReactNode[] = [];
  let pos = 0;
  const plain = (s: string) => (render ? render(s) : s);
  for (const m of sorted) {
    if (m.start < pos || m.end <= m.start) continue;
    if (m.start > pos) out.push(<Fragment key={`p${pos}`}>{plain(chars.slice(pos, m.start).join(""))}</Fragment>);
    out.push(
      <mark key={`m${m.start}`} className={m.className} title={m.title}>
        {chars.slice(m.start, m.end).join("")}
      </mark>,
    );
    pos = m.end;
  }
  if (pos < chars.length) out.push(<Fragment key={`p${pos}`}>{plain(chars.slice(pos).join(""))}</Fragment>);
  return <>{out}</>;
}

/** Shows anonymisation placeholders such as <PERSON> as redaction bars. */
export function renderRedactions(s: string): ReactNode {
  const parts = s.split(/(<[A-Z_]+>)/g);
  return parts.map((p, i) =>
    /^<[A-Z_]+>$/.test(p) ? (
      <span key={i} className="redaction" title="Removed before scoring">
        {p.slice(1, -1).toLowerCase().replace(/_/g, " ")}
      </span>
    ) : (
      <Fragment key={i}>{p}</Fragment>
    ),
  );
}
