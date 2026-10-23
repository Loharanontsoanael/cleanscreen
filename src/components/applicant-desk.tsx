"use client";

import { useRef, useState } from "react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { hand } from "@/lib/hand";
import { glyph } from "./glyph";

/** One applicant on the desk: a resume, and whatever is clipped to it to check the story. */
export interface Applicant {
  resume: File;
  cover?: File;
  references: File[];
  code?: File;
}

export const MAX_APPLICANTS = 10;
const MAX_REFERENCES = 3;

type Slot = "cover" | "references" | "code";

const ACCEPT: Record<Slot, string> = {
  cover: ".pdf,.txt,.md,application/pdf,text/plain",
  references: ".pdf,.txt,.md,application/pdf,text/plain",
  code: ".py,.js,.mjs,.cjs,.ts,.sh,.rb,.go,.java,.php,.cs,.rs,.sql,.txt",
};

const isPdf = (f: File) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");

/** What each tab says, empty and filled. */
function tabLabel(a: Applicant, slot: Slot): { filled: boolean; text: string } {
  if (slot === "cover") return { filled: !!a.cover, text: a.cover ? "Cover\nletter" : "+ Cover\nletter" };
  if (slot === "code") return { filled: !!a.code, text: a.code ? "Code" : "+ Code" };
  const n = a.references.length;
  return { filled: n > 0, text: n ? `${n} ref${n > 1 ? "s" : ""}` : "+ Refs" };
}

function Sheet({ a, onTab, onRemove, onUnclip }: { a: Applicant; onTab: (s: Slot) => void; onRemove: () => void; onUnclip: (f: File) => void }) {
  const clipped = [a.cover, ...a.references, a.code].filter((f): f is File => !!f);
  return (
    <li>
      <div className="relative">
        <div className="relative mr-7 aspect-[210/280] rounded-[4px] border border-ink-100 bg-white px-3.5 pt-4 shadow-[0_1px_2px_rgb(15_27_45/0.08),0_14px_30px_-14px_rgb(15_27_45/0.35)]">
          <span className="block h-[7px] w-[55%] rounded-[3px] bg-brand-900/85" />
          {[80, 66, 74, 50, 70, 60].map((w, i) => (
            <span key={i} className="mt-[7px] block h-1 rounded-[3px] bg-ink-100" style={{ width: `${w}%` }} />
          ))}
          <button onClick={onRemove} aria-label={`Remove ${a.resume.name}`} className="absolute right-2 bottom-2 text-ink-300 hover:text-alerte">
            {glyph(Cancel01Icon, 16, 2)}
          </button>
        </div>
        {(["cover", "references", "code"] as const).map((slot, i) => {
          const t = tabLabel(a, slot);
          const full = slot === "references" && a.references.length >= MAX_REFERENCES;
          return (
            <button
              key={slot}
              onClick={() => onTab(slot)}
              disabled={full}
              aria-label={`${t.filled ? "Change" : "Clip"} ${slot === "references" ? "a reference" : slot === "cover" ? "a cover letter" : "take-home code"} for ${a.resume.name}`}
              style={{ top: `${10 + i * 25}%` }}
              className={`absolute right-0 grid h-[19%] w-[54px] place-items-center rounded-r-[12px] px-1 text-center text-[10.5px] leading-[1.15] font-bold whitespace-pre-line ${
                t.filled ? "bg-brand-600 text-white hover:bg-brand-700" : "border-[1.5px] border-l-0 border-dashed border-ink-300 bg-white text-ink-400 hover:text-brand-600"
              }`}
            >
              {t.text}
            </button>
          );
        })}
      </div>
      <p className="mt-2.5 truncate text-[14px] font-bold text-brand-900">{a.resume.name}</p>
      <p className="text-[12.5px] text-ink-400">{clipped.length ? `checked against ${clipped.length} document${clipped.length > 1 ? "s" : ""}` : "resume only"}</p>
      {clipped.length > 0 && (
        <ul className="mt-1.5 space-y-0.5">
          {clipped.map((f, i) => (
            <li key={i} className="flex items-center gap-1 text-[12.5px] text-ink-500">
              <span className="truncate">{f.name}</span>
              <button onClick={() => onUnclip(f)} aria-label={`Unclip ${f.name}`} className="shrink-0 text-ink-300 hover:text-alerte">
                {glyph(Cancel01Icon, 13, 2)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

/**
 * The applicants as resumes on a desk. Each sheet has three tabs to clip a cover letter,
 * references or take-home code to it; the last spot takes new resumes.
 */
export function ApplicantDesk({ applicants, onChange }: { applicants: Applicant[]; onChange: (a: Applicant[]) => void }) {
  const resumes = useRef<HTMLInputElement>(null);
  const clip = useRef<HTMLInputElement>(null);
  const [target, setTarget] = useState<{ index: number; slot: Slot } | null>(null);

  const addResumes = (list: FileList | null) => {
    if (!list) return;
    const added = [...list].filter(isPdf).map((resume) => ({ resume, references: [] }));
    onChange([...applicants, ...added].slice(0, MAX_APPLICANTS));
  };

  const openClip = (index: number, slot: Slot) => {
    setTarget({ index, slot });
    if (clip.current) {
      clip.current.accept = ACCEPT[slot];
      clip.current.multiple = slot === "references";
      clip.current.value = "";
      clip.current.click();
    }
  };

  const clipFiles = (list: FileList | null) => {
    if (!list?.length || !target) return;
    onChange(
      applicants.map((a, i) => {
        if (i !== target.index) return a;
        if (target.slot === "references") return { ...a, references: [...a.references, ...list].slice(0, MAX_REFERENCES) };
        return { ...a, [target.slot]: list[0] };
      }),
    );
  };

  const unclip = (index: number, f: File) =>
    onChange(
      applicants.map((a, i) =>
        i !== index ? a : { ...a, cover: a.cover === f ? undefined : a.cover, code: a.code === f ? undefined : a.code, references: a.references.filter((r) => r !== f) },
      ),
    );

  return (
    <>
      <ul className="mt-5 grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3">
        {applicants.map((a, i) => (
          <Sheet
            key={`${a.resume.name}-${i}`}
            a={a}
            onTab={(slot) => openClip(i, slot)}
            onRemove={() => onChange(applicants.filter((_, j) => j !== i))}
            onUnclip={(f) => unclip(i, f)}
          />
        ))}
        {applicants.length < MAX_APPLICANTS && (
          <li>
            <button
              onClick={() => resumes.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                addResumes(e.dataTransfer.files);
              }}
              className="mr-7 flex aspect-[210/280] w-[calc(100%-1.75rem)] flex-col items-center justify-center gap-1 rounded-[6px] border-[1.5px] border-dashed border-ink-300 bg-rail px-3 text-center hover:border-brand-400"
            >
              <span className="text-[15px] font-semibold text-ink-500">+ Drop a resume</span>
              <span className="text-[12.5px] text-ink-400">PDF, up to {MAX_APPLICANTS}</span>
            </button>
            <p className={`${hand.className} mt-2 text-[21px] leading-[1.05] text-brand-600`}>
              clip anything that
              <br />
              helps check the story ↑
            </p>
          </li>
        )}
      </ul>
      <input ref={resumes} type="file" accept="application/pdf,.pdf" multiple hidden onChange={(e) => addResumes(e.target.files)} />
      <input ref={clip} type="file" hidden onChange={(e) => clipFiles(e.target.files)} />
    </>
  );
}
