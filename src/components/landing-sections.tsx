import Link from "next/link";
import { CheckListIcon, FileSearchIcon, IncognitoIcon, NoteEditIcon } from "@hugeicons/core-free-icons";
import { glyph } from "./glyph";

const STATS = [
  {
    figure: "1%",
    text: "of 200,000 real resumes hid instructions meant for AI screeners.",
    source: "Duke University, 2026",
    href: "https://today.duke.edu/2026/08/tricking-ai-job-hunt",
  },
  {
    figure: "67%",
    text: "of HR leaders say AI-generated applications are slowing hiring down.",
    source: "Robert Half, 2026",
    href: "https://www.staffingindustry.com/news/global-daily-news/67-of-hr-leaders-say-ai-generated-applications-slow-hiring",
  },
  {
    figure: "64%",
    text: "of employers have hired someone who misrepresented their skills.",
    source: "Criteria and Lighthouse Research, 2026",
    href: "https://www.criteriacorp.com/research/2026-lighthouse-research-report",
  },
];

/** The problem, in three sourced numbers. */
export function WhyNow() {
  return (
    <section className="mx-auto mt-20 max-w-[1160px] px-5 sm:px-7">
      <h2 className="title max-w-[24ch] text-[2rem] leading-tight sm:text-[2.6rem]">
        Applicants learned to trick AI screeners. Most screeners can’t tell.
      </h2>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {STATS.map((s) => (
          <div key={s.figure} className="panel p-6">
            <p className="figure text-[3rem]" style={{ color: "var(--color-brand-600)" }}>
              {s.figure}
            </p>
            <p className="mt-3 text-[15px] leading-snug text-ink-700">{s.text}</p>
            <a href={s.href} target="_blank" rel="noreferrer" className="mt-3 inline-block text-[13px] font-semibold text-ink-400 hover:text-brand-600">
              {s.source}
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}

const STEPS = [
  {
    icon: FileSearchIcon,
    title: "Read the file twice",
    text: "Once as a person sees the page, once as an AI extracts it. Anything only the machine can read is flagged and classified.",
  },
  {
    icon: IncognitoIcon,
    title: "Score it blind",
    text: "Name, contact, age and location are removed. Each requirement is judged on the visible resume, with the passage that proves it.",
  },
  {
    icon: CheckListIcon,
    title: "Check the story",
    text: "Claims are verified against references, the resume against the cover letter and other applicants, and take-home code before it runs.",
  },
  {
    icon: NoteEditIcon,
    title: "Hand over a scorecard",
    text: "A next step, the reasons behind it, and interview questions aimed at what couldn’t be verified. A person makes the call.",
  },
];

/** The four steps of a screening, with the Clocked endpoints behind each. */
export function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto mt-24 max-w-[1160px] scroll-mt-24 px-5 sm:px-7">
      <p className="eyebrow">How it works</p>
      <h2 className="title mt-2 max-w-[26ch] text-[2rem] leading-tight sm:text-[2.6rem]">
        Four steps, nine Clocked checks, one decision you can explain.
      </h2>
      <ol className="mt-10 grid gap-x-8 gap-y-10 md:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s, i) => (
          <li key={s.title}>
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-full bg-brand-50 text-brand-600">{glyph(s.icon, 22)}</span>
              <span className="text-sm font-bold text-ink-400">Step {i + 1}</span>
            </div>
            <h3 className="mt-4 text-[18px] font-extrabold text-brand-900">{s.title}</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-500">{s.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** The closing call to action, on the same violet band as the hero. */
export function FinalCta() {
  return (
    <section className="mx-auto mt-24 max-w-[1160px] px-5 sm:px-7">
      <div className="relative isolate overflow-hidden rounded-[32px] bg-brand-600 px-7 py-12 text-white sm:px-12">
        <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(30rem_16rem_at_90%_0%,rgb(255_255_255/0.2),transparent_70%)]" />
        <h2 className="max-w-[20ch] text-[2rem] leading-tight font-extrabold tracking-[-0.03em] sm:text-[2.6rem]">
          Screen your next round on what applicants actually show you.
        </h2>
        <div className="mt-7 flex flex-wrap gap-3.5">
          <Link href="/run" className="btn bg-white text-brand-700 hover:bg-brand-50">
            Screen my resumes
          </Link>
          <a href="https://github.com/Loharanontsoanael/cleanscreen" className="btn border-white/60 text-white hover:bg-white/10">
            Read the code
          </a>
        </div>
      </div>
    </section>
  );
}
