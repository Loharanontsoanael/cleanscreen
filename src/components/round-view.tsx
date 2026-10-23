"use client";

import Link from "next/link";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import type { RoundReport } from "@/lib/types";
import { CandidateDetail } from "./candidate-detail";
import { glyph } from "./glyph";
import { HiringDesk } from "./hiring-desk";
import { FinalCta, HowItWorks, WhyNow } from "./landing-sections";
import { INFLATION_GAP, Shortlist, useSelectedApplicant } from "./shortlist";

export function RoundView({ report }: { report: RoundReport }) {
  const [selected, open] = useSelectedApplicant();

  const current = report.candidates.find((c) => c.label === selected);
  if (current) {
    const saved = current.documents;
    return (
      <CandidateDetail
        candidate={current}
        duplicates={report.duplicates}
        onBack={() => open(null)}
        documents={saved ? (kind) => Promise.resolve(saved[kind]) : undefined}
      />
    );
  }

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
        <Shortlist report={report} onOpen={open} />
      </section>
      <FinalCta />
    </main>
  );
}
