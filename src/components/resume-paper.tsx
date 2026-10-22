"use client";

import { Fragment, type ReactNode } from "react";
import { Calendar03Icon, Location01Icon, Mail01Icon, SmartPhone01Icon, UserIcon } from "@hugeicons/core-free-icons";
import type { CandidateReport } from "@/lib/types";
import { resumeFont } from "@/lib/resume-font";
import { glyph } from "./glyph";
import { locate } from "./marked-text";

interface Span {
  start: number;
  end: number;
}
interface TextLine {
  chars: string[];
  from: number;
  text: string;
}

/** "P R O F I L E" or "W O R K   E X P E R I E N C E" (letter-spaced headings) read as normal words. */
function unspace(l: string): string {
  return l
    .split(/\s{2,}/)
    .map((w) => (/^(\S\s)+\S$/.test(w) ? w.replace(/\s/g, "") : w))
    .join(" ");
}
const isHeading = (l: string) => l.length > 3 && l.length < 40 && l === l.toUpperCase() && /[A-Z]/.test(l);
const isDates = (l: string) => /^\d{4}\s*[-–]\s*(present|\d{4})$/i.test(l);
const isBullet = (l: string) => /^[•\-*]\s/.test(l);
/** Sections that belong in the sidebar of a two-column resume. */
const SIDEBAR = /(SKILL|EDUCATION|CERTIFICATION|LANGUAGE|TOOL|INTEREST|HOBBIES)/;

/** One run of text; hidden spans are invisible on the page and glow under the UV lamp. */
function Run({ line, hidden, machine, skip = 0 }: { line: TextLine; hidden: Span[]; machine: boolean; skip?: number }) {
  const chars = line.chars.slice(skip);
  const from = line.from + skip;
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
    out.push(
      isHidden ? (
        <span key={a} className={machine ? "uv-hit" : "text-transparent select-none"}>
          {piece}
        </span>
      ) : (
        <Fragment key={a}>{piece}</Fragment>
      ),
    );
  }
  return <>{out}</>;
}

const CONTACT_ICON: Record<string, typeof Mail01Icon> = {
  email: Mail01Icon,
  phone: SmartPhone01Icon,
  location: Location01Icon,
  address: Location01Icon,
  date_of_birth: Calendar03Icon,
};

/**
 * The resume laid out as a professional two-column page: header, a sidebar for
 * contact, skills and education, and a main column for profile and experience.
 * Personal details come from what /pii found, so they can be shown or withheld
 * without touching the file text that hidden spans are measured against.
 */
export function ResumeText({ c, machine }: { c: CandidateReport; machine: boolean }) {
  const hidden: Span[] = [];
  for (const h of c.hidden) {
    const at = locate(c.machineText, h.text);
    if (at) hidden.push(at);
  }
  if (c.injection.verdict !== "benign") for (const e of c.injection.evidence) hidden.push({ start: e.start, end: e.end });

  const all = Array.from(c.machineText);
  const lines: TextLine[] = [];
  for (let i = 0, from = 0; i <= all.length; i++) {
    if (i === all.length || all[i] === "\n") {
      const chars = all.slice(from, i);
      lines.push({ chars, from, text: chars.join("").trim() });
      from = i + 1;
    }
  }
  const content = lines.filter((l) => l.text);
  const fullyHidden = (l: TextLine) => hidden.some((h) => h.start <= l.from && h.end >= l.from + l.chars.length);

  // Everything before the first section heading is the header: name, headline, contact lines.
  // Personal details render from /pii, so only the headline is taken from the text.
  const firstHeading = content.findIndex((l, i) => i > 0 && isHeading(l.text));
  const headerEnd = firstHeading > 0 ? firstHeading : Math.min(3, content.length);
  const headline = content[1] && 1 < headerEnd ? content[1] : undefined;
  const sections: { title: string; lines: TextLine[] }[] = [];
  const hiddenLines: TextLine[] = [];
  for (const l of content.slice(headerEnd)) {
    if (fullyHidden(l)) hiddenLines.push(l);
    else if (isHeading(l.text)) sections.push({ title: unspace(l.text), lines: [] });
    else {
      if (!sections.length) sections.push({ title: "", lines: [] });
      sections[sections.length - 1].lines.push(l);
    }
  }

  const run = (l: TextLine, skip = 0) => <Run line={l} hidden={hidden} machine={machine} skip={skip} />;
  const title = (t: string) =>
    t ? <h3 className="mb-2.5 text-[11px] font-black tracking-[0.16em] text-ink-900 uppercase">{t.toLowerCase()}</h3> : null;

  // A PDF wraps long sentences onto several lines: glue plain continuation lines to the line before.
  // A wrapped sentence continues in lower case, or after a comma, hyphen or "and"; a new item starts a new line.
  const joins = (prev: TextLine, next: TextLine) =>
    !isHeading(next.text) &&
    !isDates(next.text) &&
    !isBullet(next.text) &&
    fullyHidden(prev) === fullyHidden(next) &&
    (/^\p{Ll}/u.test(next.text) || /([,\-–(/]|\band|\bor|\bthe|\bof|\bin)$/i.test(prev.text));
  const flowing = (ls: TextLine[], i: number, skip = 0) => {
    const parts: ReactNode[] = [<Fragment key={0}>{run(ls[i], skip)}</Fragment>];
    while (ls[i + 1] && joins(ls[i], ls[i + 1]) && !isDates(ls[i].text)) {
      i++;
      parts.push(<Fragment key={i}> {run(ls[i])}</Fragment>);
    }
    return { parts, last: i };
  };

  const body = (ls: TextLine[]) => {
    const out: ReactNode[] = [];
    for (let i = 0; i < ls.length; i++) {
      const l = ls[i];
      if (isDates(l.text) && ls[i + 1]) {
        const [role, company] = ls[i + 1].text.split(/,\s*(.+)/);
        out.push(
          <div key={i} className="mt-4 first:mt-0">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[14px] font-bold text-ink-900">{company ? role : run(ls[i + 1])}</p>
              <p className="shrink-0 text-[11.5px] text-ink-400">{run(l)}</p>
            </div>
            {company && <p className="mb-1 text-[12.5px] font-bold text-ink-500">{company}</p>}
          </div>,
        );
        i++;
      } else if (isBullet(l.text)) {
        const skip = l.chars.findIndex((ch) => !/[\s•\-*]/.test(ch));
        const { parts, last } = flowing(ls, i, skip);
        out.push(
          <p key={i} className="relative mt-1 pl-3.5 text-[12.5px] leading-snug text-ink-700">
            <span className="absolute top-[0.55em] left-0 size-1 rounded-full bg-ink-400" />
            {parts}
          </p>,
        );
        i = last;
      } else {
        const { parts, last } = flowing(ls, i);
        out.push(
          <p key={i} className="mt-1 text-[12.5px] leading-relaxed text-ink-700">
            {parts}
          </p>,
        );
        i = last;
      }
    }
    return out;
  };

  const skillsChips = (ls: TextLine[]) =>
    ls.length === 1 && !hidden.some((h) => h.end > ls[0].from && h.start < ls[0].from + ls[0].chars.length) ? (
      <div className="flex flex-wrap gap-1.5">
        {ls[0].text.split(/,\s*/).map((s) => (
          <span key={s} className="rounded-[4px] bg-white px-2 py-0.5 text-[11.5px] font-bold text-ink-700 ring-1 ring-ink-200">
            {s}
          </span>
        ))}
      </div>
    ) : (
      body(ls)
    );

  // Every demo applicant is fictional, so the page shows their test details as written.
  const contacts = c.piiFound.filter((p) => CONTACT_ICON[p.type]);
  // Prefer the name as printed at the top of the page (often letter-spaced); fall back to what /pii found.
  const printed = content[0] && headerEnd > 0 ? unspace(content[0].text) : "";
  const looksLikeName = printed && printed.split(/\s+/).length <= 5 && !/[@\d]/.test(printed);
  const raw = looksLikeName ? printed : (c.name ?? c.label);
  const name = raw === raw.toUpperCase() ? raw.toLowerCase().replace(/\b\p{L}/gu, (ch) => ch.toUpperCase()) : raw;
  const initials = name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className={`${resumeFont.className} flex min-h-full flex-col`}>
      <header className="flex items-center gap-5 px-8 pt-9 pb-7 sm:px-10">
        <div className="grid size-16 shrink-0 place-items-center rounded-full bg-ink-100 text-[20px] font-black text-ink-500">
          {initials || glyph(UserIcon, 26, 1.8)}
        </div>
        <div className="min-w-0">
          <p className="text-[28px] leading-none font-black tracking-[-0.01em] text-ink-900">{name}</p>
          {headline && <p className="mt-2 text-[13px] font-bold tracking-[0.14em] text-ink-500 uppercase">{run(headline)}</p>}
        </div>
      </header>

      <div className="grid flex-1 border-t border-ink-100 sm:grid-cols-[34%_1fr]">
        <aside className="space-y-7 bg-ink-50 px-8 py-7 sm:px-7">
          <section>
            {title("CONTACT")}
            <ul className="space-y-2">
              {contacts.map((p, i) => (
                <li key={i} className="flex items-center gap-2 text-[12px] text-ink-700">
                  <span className="text-ink-400">{glyph(CONTACT_ICON[p.type], 14, 1.8)}</span>
                  {p.value}
                </li>
              ))}
            </ul>
          </section>
          {sections
            .filter((s) => SIDEBAR.test(s.title))
            .map((s) => (
              <section key={s.title}>
                {title(s.title)}
                {/SKILL/.test(s.title) ? skillsChips(s.lines) : body(s.lines)}
              </section>
            ))}
        </aside>

        <div className="space-y-7 px-8 py-7 sm:px-9">
          {sections
            .filter((s) => !SIDEBAR.test(s.title))
            .map((s, i) => (
              <section key={`${s.title}${i}`}>
                {title(/SUMMARY/.test(s.title) ? "PROFILE" : s.title)}
                {body(s.lines)}
              </section>
            ))}
          {hiddenLines.length > 0 && (
            // Where the hidden lines sit on the page: blank to a reader, legible to a text extractor.
            <section className="text-[12.5px] leading-relaxed text-ink-700">
              {hiddenLines.map((l, i) => (
                <p key={i}>{run(l)}</p>
              ))}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
