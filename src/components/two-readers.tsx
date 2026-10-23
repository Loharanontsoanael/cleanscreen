import { hand } from "@/lib/hand";

const INK = "#0f1b2d";

/** A person's eye, flat, in the house stroke. */
function Eye() {
  return (
    <svg viewBox="0 0 60 60" className="relative z-10 mx-auto -mb-2.5 size-[52px] sm:size-[58px]" aria-hidden>
      <circle cx="30" cy="30" r="26" fill="#fff" stroke={INK} strokeWidth="3" />
      <path d="M14 31c5-8 27-8 32 0-5 8-27 8-32 0z" fill="var(--color-brand-100)" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <circle cx="30" cy="31" r="5" fill={INK} />
    </svg>
  );
}

/** A small, friendly robot: the AI screener that reads the raw file. */
function Robot() {
  return (
    <svg viewBox="0 0 60 60" className="relative z-10 mx-auto -mb-2.5 size-[52px] sm:size-[58px]" aria-hidden>
      <line x1="30" y1="12" x2="30" y2="4" stroke={INK} strokeWidth="3" />
      <circle cx="30" cy="4" r="3" fill="var(--color-brand-600)" />
      <rect x="8" y="12" width="44" height="38" rx="12" fill="var(--color-brand-100)" stroke={INK} strokeWidth="3" />
      <circle cx="22" cy="30" r="4" fill={INK} />
      <circle cx="38" cy="30" r="4" fill={INK} />
      <path d="M23 40h14" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      <circle cx="15" cy="37" r="3" fill="#f9b7c8" />
      <circle cx="45" cy="37" r="3" fill="#f9b7c8" />
    </svg>
  );
}

/** A mini A4 sheet with its score; on the AI's copy, the lines only a machine reads glow violet. */
function Sheet({ score, glowing }: { score: number; glowing: boolean }) {
  const lines = [80, 66, 84, 74, 40];
  return (
    <div className="relative mx-auto aspect-[210/297] w-[118px] rounded-[4px] border border-ink-100 bg-white px-3 pt-3.5 shadow-[0_1px_2px_rgb(15_27_45/0.08),0_14px_30px_-14px_rgb(15_27_45/0.35)] sm:w-[150px]">
      <span className="block h-[7px] w-[55%] rounded-[3px] bg-brand-900/85" />
      {lines.map((w, i) => (
        <span
          key={i}
          className={`mt-[7px] block h-1 rounded-[3px] ${glowing && i >= 1 && i <= 3 ? "bg-brand-200" : i >= 1 && i <= 3 ? "bg-transparent" : "bg-ink-100"}`}
          style={{ width: `${w}%` }}
        />
      ))}
      <span className={`absolute inset-x-0 bottom-3 text-center text-[2.2rem] leading-none font-extrabold tracking-[-0.04em] tabular-nums sm:bottom-[18px] sm:text-[2.75rem] ${glowing ? "text-brand-600" : "text-brand-900"}`}>
        {score}
      </span>
    </div>
  );
}

/**
 * The same file, read by a person and by a naive AI screener, side by side: the fit CleanScreen
 * scores on the visible page, and the one the raw text would have earned.
 */
export function TwoReaders({ score, naiveScore }: { score: number; naiveScore: number }) {
  return (
    <figure aria-label={`A person reading the page scores ${score}; an AI reading the raw file scores ${naiveScore}.`} className="grid grid-cols-[1fr_auto_1fr] items-end gap-1 sm:gap-4">
      <div className="text-center">
        <Eye />
        <Sheet score={score} glowing={false} />
        <p className="mt-3.5 text-[14px] leading-tight font-bold text-brand-900 sm:text-[15px]">
          A person reading the page
          <span className="mt-0.5 block text-[12.5px] font-medium text-ink-400 sm:text-[13px]">what CleanScreen scores</span>
        </p>
      </div>
      <div className="self-center pb-10 text-center text-brand-600" aria-hidden>
        <span className={`${hand.className} block text-[19px] leading-[1.05] sm:text-[27px]`}>
          same file,
          <br />+{naiveScore - score} points
          <br />
          of invisible ink
        </span>
        <svg viewBox="0 0 130 40" className="mx-auto mt-1 w-[72px] sm:w-[120px]">
          <path d="M6 24c30-16 80-18 112-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M108 12l12 8-13 6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="text-center">
        <Robot />
        <Sheet score={naiveScore} glowing />
        <p className="mt-3.5 text-[14px] leading-tight font-bold text-brand-900 sm:text-[15px]">
          An AI reading the raw file
          <span className="mt-0.5 block text-[12.5px] font-medium text-ink-400 sm:text-[13px]">what a naive screener would score</span>
        </p>
      </div>
    </figure>
  );
}
