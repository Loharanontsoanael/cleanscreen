"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import type { RoundReport } from "@/lib/types";
import { CandidateDetail } from "./candidate-detail";
import { glyph } from "./glyph";
import { OUTCOME_ORDER, OutcomeBadge } from "./outcome";
import { HiringDesk } from "./hiring-desk";
import { FinalCta, HowItWorks, WhyNow } from "./landing-sections";

/** Raw-file score minus visible-resume score above which the gap is called out. */
const INFLATION_GAP = 15;

function ScoreBar({ value, tone }: { value: number; tone: "ink" | "uv" }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="h-2 w-20 overflow-hidden rounded-full bg-ink-100">
        <div className={`h-full rounded-full ${tone === "uv" ? "bg-brand-500" : "bg-brand-900"}`} style={{ width: `${value}%` }} />
      </div>
      <span className={`figure w-7 text-right text-[15px] ${tone === "uv" ? "!text-brand-600" : ""}`}>{value}</span>
    </div>
  );
}

export function RoundView({ report }: { report: RoundReport }) {
  const [selected, setSelected] = useState<string | null>(null);

  // Keep the open applicant in the URL hash so a link or the back button lands on the same view.
  useEffect(() => {
    const read = () => setSelected(decodeURIComponent(window.location.hash.slice(1)) || null);
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
  const open = (label: string | null) => {
    window.location.hash = label ? encodeURIComponent(label) : "";
    window.scrollTo({ top: 0 });
  };

  const current = report.candidates.find((c) => c.label === selected);
  if (current) return <CandidateDetail candidate={current} duplicates={report.duplicates} onBack={() => open(null)} />;

  const rows = [...report.candidates].sort(
    (a, b) => OUTCOME_ORDER.indexOf(a.decision.outcome) - OUTCOME_ORDER.indexOf(b.decision.outcome) || b.score - a.score,
  );
  const count = (o: string) => report.candidates.filter((c) => c.decision.outcome === o).length;
  const credits = report.trail.reduce((s, t) => s + (t.credits ?? 0), 0);
  const spotlight = [...report.candidates].sort((a, b) => b.naiveScore - b.score - (a.naiveScore - a.score))[0];
  const showSpotlight = spotlight && spotlight.naiveScore - spotlight.score >= INFLATION_GAP;

  return (
    <main className="overflow-x-hidden">
      <section className="relative isolate overflow-hidden bg-brand-600 px-5 pt-16 text-center text-white sm:px-7">
        {/* Soft light behind the headline, like a lamp in a dark room. */}
        <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(40rem_22rem_at_78%_8%,rgb(255_255_255/0.22),transparent_70%),radial-gradient(34rem_20rem_at_8%_78%,rgb(214_80_220/0.28),transparent_70%)]" />
        <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-[13.5px] font-semibold">
          <span className="size-2 rounded-full bg-white" />
          1% of resumes now hide instructions for AI screeners
        </span>
        <h1 className="mx-auto mt-6 max-w-[14ch] text-[2.8rem] leading-[0.98] font-extrabold tracking-[-0.035em] sm:text-[4.6rem]">
          Resume screening you can’t trick.
        </h1>
        <p className="mx-auto mt-6 max-w-[46ch] text-lg leading-relaxed text-white/85">
          For hiring teams who use AI to screen. CleanScreen scores the resume a person actually sees, with identity
          removed, and explains every decision.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3.5">
          {showSpotlight && (
            <button onClick={() => open(spotlight.label)} className="btn bg-white text-brand-700 hover:bg-brand-50">
              See what an applicant hid
            </button>
          )}
        </div>
        <p className="mt-5 text-[13.5px] text-white/75">
          Free to try, no sign-up. Every applicant in the demo is fictional.{" "}
          <Link href="/run" className="font-semibold text-white underline underline-offset-2">
            Screen your own resumes
          </Link>
        </p>

        <div className="relative mt-10">
          {/* The white page rises in an arc under the illustration. */}
          <div aria-hidden className="absolute -bottom-px left-1/2 h-[46%] w-[160%] -translate-x-1/2 rounded-[50%_50%_0_0/100%_100%_0_0] bg-white" />
          <div className="relative">
            <HiringDesk />
          </div>
        </div>
      </section>

      <WhyNow />

      {showSpotlight && (
        <section className="mx-auto mt-6 max-w-[1160px] px-5 sm:px-7">
          <div className="panel flex flex-col gap-8 p-7 sm:p-9 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-end gap-8 sm:gap-12">
              <div>
                <p className="figure text-[4rem] sm:text-[5rem]" style={{ color: "var(--color-brand-600)" }}>
                  {spotlight.naiveScore}
                </p>
                <p className="mt-2 text-sm font-semibold text-ink-500">an AI reading the file</p>
              </div>
              <div>
                <p className="figure text-[4rem] sm:text-[5rem]">{spotlight.score}</p>
                <p className="mt-2 text-sm font-semibold text-ink-500">what you can see</p>
              </div>
            </div>
            <div className="max-w-[40ch]">
              <p className="text-[17px] leading-relaxed text-ink-700">
                Same resume, same file. {spotlight.label} printed a senior career in white ink. CleanScreen only scores
                the page a person can see.
              </p>
              <button onClick={() => open(spotlight.label)} className="btn btn-primary mt-5">
                See what was hidden {glyph(ArrowRight01Icon, 18, 2)}
              </button>
            </div>
          </div>
        </section>
      )}


      <HowItWorks />

      <section id="demo" className="mx-auto mt-24 max-w-[1160px] scroll-mt-24 px-5 sm:px-7">
        <p className="eyebrow">Demo round</p>
        <h2 className="title mt-2 text-[2rem] leading-tight sm:text-[2.4rem]">
          {report.job.title}
          {report.job.company && <span className="text-ink-400"> at {report.job.company}</span>}
        </h2>
        <p className="mt-3 max-w-[70ch] text-ink-500">
          {[
            `${count("advance")} of ${report.candidates.length} applicants can go straight to interview.`,
            count("flagged") && `${count("flagged")} have a specific integrity finding for a person to review.`,
            count("human_review") && `${count("human_review")} need a closer look at their fit.`,
            count("reject") && `${count("reject")} clearly miss a must-have.`,
            `Screening the whole round took ${credits.toLocaleString()} Clocked credits.`,
          ]
            .filter(Boolean)
            .join(" ")}
        </p>

        <div className="panel mt-6 overflow-x-auto">
          <table className="w-full min-w-[48rem] text-left">
            <thead className="text-[13px] text-ink-400">
              <tr className="border-b-[1.5px] border-rule">
                <th className="px-5 py-3.5 font-semibold">Applicant</th>
                <th className="px-5 py-3.5 font-semibold">Next step</th>
                <th className="px-5 py-3.5 font-semibold">Fit, visible resume</th>
                <th className="px-5 py-3.5 font-semibold">Fit, raw file</th>
                <th className="px-5 py-3.5 font-semibold">Why</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule-soft">
              {rows.map((c) => {
                const inflated = c.naiveScore - c.score >= INFLATION_GAP;
                return (
                  <tr key={c.label} onClick={() => open(c.label)} className="cursor-pointer hover:bg-rail">
                    <td className="px-5 py-4">
                      <button onClick={() => open(c.label)} className="text-[15px] font-extrabold text-brand-900 hover:text-brand-600">
                        {c.label}
                      </button>
                      <p className="text-[13px] text-ink-400">{c.scorecard.seniority}</p>
                    </td>
                    <td className="px-5 py-4">
                      <OutcomeBadge outcome={c.decision.outcome} />
                    </td>
                    <td className="px-5 py-4">
                      <ScoreBar value={c.score} tone="ink" />
                    </td>
                    <td className="px-5 py-4">
                      <ScoreBar value={c.naiveScore} tone={inflated ? "uv" : "ink"} />
                    </td>
                    <td className="max-w-xs px-5 py-4 text-sm text-ink-500">
                      {c.decision.reasons[0] ?? "Every must-have met, nothing to flag"}
                      {c.decision.reasons.length > 1 && <span className="text-ink-400"> (+{c.decision.reasons.length - 1} more)</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      <FinalCta />
    </main>
  );
}
