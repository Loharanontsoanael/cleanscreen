"use client";

import { useRef, useState } from "react";
import { Add01Icon, Cancel01Icon, File01Icon, Upload04Icon } from "@hugeicons/core-free-icons";
import type { RoundReport } from "@/lib/types";
import { CandidateDetail } from "./candidate-detail";
import { glyph } from "./glyph";
import { Shortlist, useSelectedApplicant } from "./shortlist";

interface Req {
  text: string;
  mustHave: boolean;
}

const PRESETS: { title: string; requirements: Req[] }[] = [
  {
    title: "Full-Stack Developer",
    requirements: [
      { text: "At least 3 years of professional software development experience", mustHave: true },
      { text: "Production experience with PHP (Laravel) or Node.js", mustHave: true },
      { text: "Builds front ends with React or Next.js", mustHave: true },
      { text: "Designs REST APIs and works with relational databases", mustHave: false },
      { text: "Works in Agile teams with code reviews and testing", mustHave: false },
    ],
  },
  {
    title: "Senior Data Engineer",
    requirements: [
      { text: "At least 5 years of professional data engineering experience", mustHave: true },
      { text: "Production experience with Python and SQL", mustHave: true },
      { text: "Built and operated data pipelines with Airflow, Spark or Kafka", mustHave: true },
      { text: "Experience with a cloud data platform such as AWS or GCP", mustHave: false },
      { text: "Has led or mentored other engineers", mustHave: false },
    ],
  },
];

type Progress = { candidate: string; step: string };

export function ScreenOwn() {
  const [title, setTitle] = useState(PRESETS[0].title);
  const [reqs, setReqs] = useState<Req[]>(PRESETS[0].requirements);
  const [files, setFiles] = useState<File[]>([]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<RoundReport | null>(null);
  const [selected, open] = useSelectedApplicant();
  const input = useRef<HTMLInputElement>(null);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const pdfs = [...list].filter((f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
    setFiles((prev) => [...prev, ...pdfs].slice(0, 10));
  };

  async function screen() {
    setRunning(true);
    setError(null);
    setProgress([]);
    setReport(null);
    const body = new FormData();
    body.set("title", title);
    body.set("requirements", JSON.stringify(reqs.filter((r) => r.text.trim())));
    for (const f of files) body.append("resumes", f);
    try {
      const res = await fetch("/api/screen", { method: "POST", body });
      if (!res.ok || !res.body) {
        setError(((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? "Screening failed.");
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line);
          if (event.type === "step") setProgress((p) => [...p.filter((x) => x.candidate !== event.candidate), { candidate: event.candidate, step: event.step }]);
          if (event.type === "candidate") setProgress((p) => p.map((x) => (x.candidate === event.candidate ? { ...x, step: "Done" } : x)));
          if (event.type === "failed") setProgress((p) => [...p.filter((x) => x.candidate !== event.candidate), { candidate: event.candidate, step: event.error }]);
          if (event.type === "round") setProgress((p) => [...p, { candidate: "All applicants", step: event.step }]);
          if (event.type === "report") setReport(event.report as RoundReport);
          if (event.type === "error") setError(event.error);
        }
      }
    } catch {
      setError("The connection dropped before screening finished. Please try again.");
    } finally {
      setRunning(false);
    }
  }

  const current = report?.candidates.find((c) => c.label === selected);
  if (report && current) return <CandidateDetail candidate={current} duplicates={report.duplicates} onBack={() => open(null)} />;

  if (report) {
    return (
      <main className="mx-auto max-w-[1160px] px-5 pt-6 sm:px-7">
        <p className="eyebrow">Your round</p>
        <h1 className="title mt-2 text-[2rem] leading-tight sm:text-[2.6rem]">{report.job.title}</h1>
        <Shortlist report={report} onOpen={open} />
        <button onClick={() => setReport(null)} className="btn btn-secondary mt-8">
          Screen another round
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[760px] px-5 pt-6 sm:px-7">
      <h1 className="title text-[2.4rem] leading-tight">Screen your own round</h1>
      <p className="mt-3 text-[17px] text-ink-500">
        Describe the role, drop in up to 10 resumes as PDFs, and get the same screening as the demo. Nothing is stored:
        files are read, screened and forgotten.
      </p>

      <section className="mt-10">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <label htmlFor="title" className="text-[17px] font-extrabold text-brand-900">
            The role
          </label>
          <div className="flex gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.title}
                onClick={() => {
                  setTitle(p.title);
                  setReqs(p.requirements);
                }}
                className={`pill ${title === p.title ? "" : "pill-neutre"} normal-case`}
              >
                {p.title}
              </button>
            ))}
          </div>
        </div>
        <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="champ mt-3" maxLength={120} />
      </section>

      <section className="mt-8">
        <h2 className="text-[17px] font-extrabold text-brand-900">Requirements</h2>
        <ul className="mt-3 space-y-2">
          {reqs.map((r, i) => (
            <li key={i} className="flex items-center gap-2">
              <input
                value={r.text}
                onChange={(e) => setReqs(reqs.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))}
                className="champ"
                maxLength={200}
                aria-label={`Requirement ${i + 1}`}
              />
              <button
                onClick={() => setReqs(reqs.map((x, j) => (j === i ? { ...x, mustHave: !x.mustHave } : x)))}
                aria-pressed={r.mustHave}
                className={`pill shrink-0 normal-case ${r.mustHave ? "" : "pill-neutre"}`}
              >
                {r.mustHave ? "Must-have" : "Nice to have"}
              </button>
              <button onClick={() => setReqs(reqs.filter((_, j) => j !== i))} aria-label="Remove requirement" className="shrink-0 text-ink-400 hover:text-alerte">
                {glyph(Cancel01Icon, 18, 2)}
              </button>
            </li>
          ))}
        </ul>
        {reqs.length < 8 && (
          <button onClick={() => setReqs([...reqs, { text: "", mustHave: false }])} className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-brand-600">
            {glyph(Add01Icon, 16, 2)} Add a requirement
          </button>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-[17px] font-extrabold text-brand-900">Resumes</h2>
        <button
          onClick={() => input.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            addFiles(e.dataTransfer.files);
          }}
          className="mt-3 flex w-full flex-col items-center gap-2 rounded-[24px] border-[1.5px] border-dashed border-ink-300 bg-rail px-6 py-10 text-center hover:border-brand-400"
        >
          <span className="text-brand-600">{glyph(Upload04Icon, 28, 1.8)}</span>
          <span className="font-semibold text-brand-900">Drop PDF resumes here, or click to choose</span>
          <span className="text-sm text-ink-400">Up to 10 files, 3 MB each</span>
        </button>
        <input ref={input} type="file" accept="application/pdf,.pdf" multiple hidden onChange={(e) => addFiles(e.target.files)} />
        {files.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {files.map((f, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-ink-700">
                <span className="text-ink-400">{glyph(File01Icon, 16)}</span>
                <span className="truncate">{f.name}</span>
                <button onClick={() => setFiles(files.filter((_, j) => j !== i))} aria-label={`Remove ${f.name}`} className="ml-auto text-ink-400 hover:text-alerte">
                  {glyph(Cancel01Icon, 16, 2)}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {error && <p className="mt-6 rounded-[14px] bg-alerte-soft px-4 py-3 text-sm text-alerte">{error}</p>}

      <div className="mt-8">
        <button onClick={screen} disabled={running || !files.length || !title.trim()} className="btn btn-primary w-full sm:w-auto">
          {running ? "Screening…" : `Screen ${files.length || ""} resume${files.length === 1 ? "" : "s"}`.replace("  ", " ")}
        </button>
      </div>

      {progress.length > 0 && (
        <ul className="mt-6 space-y-1.5 text-sm">
          {progress.map((p) => (
            <li key={p.candidate} className="flex gap-3">
              <span className="w-28 shrink-0 font-semibold text-brand-900">{p.candidate}</span>
              <span className={p.step === "Done" ? "text-pass" : "text-ink-500"}>{p.step}</span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
