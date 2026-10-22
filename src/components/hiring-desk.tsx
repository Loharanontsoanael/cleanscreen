import { hand } from "@/lib/hand";

const INK = "#0f1b2d";
const LAVENDER = "#d8cdfc";
const VIOLET = "#5f37dd";
const GOLD = "#fbd38d";
const SAND = "#fdf1e3";
const SKY = "#c9dcf2";
const PINK = "#f6b8d2";

/** A resume held in someone's hands: a sheet with a few lines. */
function Sheet({ x, y, rotate = 0, revealed = false }: { x: number; y: number; rotate?: number; revealed?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate} 28 36)`}>
      <rect width="56" height="72" rx="6" fill="#ffffff" />
      <circle cx="14" cy="15" r="6" fill={LAVENDER} strokeWidth={2.2} />
      <path d="M26 12H46M26 20H40M10 32H46M10 40H40" fill="none" strokeWidth={2.2} opacity=".55" />
      {revealed && (
        <g stroke="none">
          <rect x="7" y="48" width="42" height="7" rx="3.5" fill={LAVENDER} />
          <rect x="7" y="59" width="30" height="7" rx="3.5" fill={LAVENDER} />
          <path d="M11 51.5H45M11 62.5H33" stroke={VIOLET} strokeWidth={3} />
        </g>
      )}
    </g>
  );
}

/**
 * The hero illustration, drawn flat like the house illustrations: applicants
 * hand in their resumes, one of them with a wink, and the recruiter's
 * ultraviolet desk lamp shows what was written in white.
 */
export function HiringDesk() {
  return (
    <figure className="relative mx-auto w-full max-w-[680px]">
      <svg viewBox="0 0 680 430" className="block w-full" role="img" aria-label="Illustration: applicants hand in their resumes; one winks, and the recruiter's ultraviolet lamp reveals the text he hid in white.">
        <g stroke={INK} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
          <ellipse cx="350" cy="398" rx="290" ry="16" fill={VIOLET} fillOpacity=".14" stroke="none" />

          {/* Honest applicant, waiting her turn */}
          <path d="M108 398V300Q108 252 158 252Q208 252 208 300V398Z" fill={GOLD} />
          <circle cx="158" cy="206" r="30" fill="#c98e5f" />
          <g fill={INK}>
            <circle cx="132" cy="186" r="13" /><circle cx="146" cy="172" r="14" /><circle cx="164" cy="168" r="14" />
            <circle cx="181" cy="176" r="13" /><circle cx="188" cy="192" r="10" />
          </g>
          <circle cx="148" cy="210" r="3.4" fill={INK} stroke="none" />
          <circle cx="170" cy="210" r="3.4" fill={INK} stroke="none" />
          <ellipse cx="139" cy="222" rx="6" ry="3.5" fill={PINK} stroke="none" />
          <ellipse cx="179" cy="222" rx="6" ry="3.5" fill={PINK} stroke="none" />
          <path d="M150 224q9 7 18 0" fill="none" />
          <Sheet x={130} y={268} />
          <circle cx="132" cy="300" r="8" fill="#c98e5f" />
          <circle cx="184" cy="300" r="8" fill="#c98e5f" />

          {/* The applicant with something to hide: a wink and a finger on his lips */}
          <path d="M248 398V292Q248 240 300 240Q352 240 352 292V398Z" fill={LAVENDER} />
          <path d="M282 242l18 22 18-22" fill="#ffffff" />
          <circle cx="300" cy="190" r="32" fill="#f3dcc0" />
          <path d="M268 184Q270 150 302 152Q334 154 332 182Q318 168 300 170Q284 172 268 184Z" fill="#6b4a2f" />
          <path d="M282 194q6 -5 12 0" fill="none" strokeWidth={2.6} />
          <circle cx="314" cy="193" r="3.6" fill={INK} stroke="none" />
          <ellipse cx="280" cy="207" rx="6.5" ry="3.8" fill={PINK} stroke="none" />
          <ellipse cx="322" cy="207" rx="6.5" ry="3.8" fill={PINK} stroke="none" />
          <path d="M296 213q8 4 16 -3" fill="none" />
          {/* Arm raised to the lips: an outlined sleeve, a hand and one finger up */}
          <path d="M262 286C244 262 256 236 284 222" fill="none" strokeWidth={22} />
          <path d="M262 286C244 262 256 236 284 222" fill="none" strokeWidth={16} stroke={LAVENDER} />
          <rect x="284" y="192" width="9" height="22" rx="4.5" fill="#f3dcc0" />
          <circle cx="288" cy="220" r="10" fill="#f3dcc0" />

          {/* Desk */}
          <rect x="392" y="262" width="236" height="16" rx="8" fill={GOLD} />
          <path d="M408 278H612V392H408Z" fill={SAND} />
          <path d="M430 300H590" fill="none" strokeWidth={2.4} opacity=".4" />

          {/* Recruiter, surprised, holding the resume up to the lamp */}
          <path d="M470 262V232Q470 196 520 196Q570 196 570 232V262Z" fill={SKY} />
          <circle cx="520" cy="150" r="32" fill="#8d5a3b" />
          <path d="M488 146Q488 112 520 112Q552 112 552 146Q544 128 520 128Q496 128 488 146Z" fill={INK} />
          <circle cx="548" cy="112" r="13" fill={INK} />
          <path d="M500 136q7 -5 14 -1M526 135q7 -4 14 1" fill="none" strokeWidth={2.4} />
          <circle cx="507" cy="148" r="5.5" fill="#ffffff" strokeWidth={2.4} />
          <circle cx="533" cy="148" r="5.5" fill="#ffffff" strokeWidth={2.4} />
          <circle cx="507" cy="148" r="2.4" fill={INK} stroke="none" />
          <circle cx="533" cy="148" r="2.4" fill={INK} stroke="none" />
          <ellipse cx="520" cy="168" rx="5" ry="6" fill={INK} stroke="none" />
          <ellipse cx="497" cy="160" rx="6" ry="3.5" fill={PINK} stroke="none" />
          <ellipse cx="543" cy="160" rx="6" ry="3.5" fill={PINK} stroke="none" />
          <path d="M480 226C466 230 458 222 456 212" fill="none" strokeWidth={22} />
          <path d="M480 226C466 230 458 222 456 212" fill="none" strokeWidth={16} stroke={SKY} />

          {/* Ultraviolet desk lamp and its beam on the resume */}
          <path d="M420 182L452 172L478 252L432 262Z" fill={VIOLET} fillOpacity=".18" stroke="none" />
          <Sheet x={420} y={176} rotate={-10} revealed />
          <circle cx="452" cy="208" r="8" fill="#8d5a3b" />
          <ellipse cx="404" cy="262" rx="16" ry="5" fill={INK} />
          <path d="M404 260V196Q404 178 418 172" fill="none" strokeWidth={4} />
          <path d="M410 160L436 150L444 176L420 182Z" fill={LAVENDER} />
          <path d="M436 150L444 176" fill="none" stroke={VIOLET} strokeWidth={4} />

          {/* Sparkles where the hidden lines show */}
          <path d="M490 252l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="#ffffff" strokeWidth={2.2} />
          <path d="M386 128l4 9 9 4-9 4-4 9-4-9-9-4 9-4z" fill={GOLD} strokeWidth={2.2} />
        </g>
      </svg>

      <p aria-hidden className={`${hand.className} absolute top-[14%] left-[18%] hidden -rotate-6 text-[1.4rem] leading-[1.05] text-white sm:block`}>
        shh… it’s in
        <br />
        white text
        <svg viewBox="0 0 110 60" className="mt-1 ml-16 w-[64px]" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8C40 6 70 20 94 50" />
          <path d="M80 50l15 1-2-15" />
        </svg>
      </p>
      <p aria-hidden className={`${hand.className} absolute top-[2%] right-[2%] hidden rotate-[-4deg] text-right text-[1.4rem] leading-[1.05] text-white sm:block`}>
        invisible to you,
        <br />
        not to the lamp
        <svg viewBox="0 0 110 60" className="mt-1 w-[64px]" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
          <path d="M104 8C70 8 36 22 12 50" />
          <path d="M26 52l-15 0 2-15" />
        </svg>
      </p>
    </figure>
  );
}
