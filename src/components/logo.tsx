import Link from "next/link";

/** The CleanScreen mark: a page with a scan line across it, the line that reveals hidden text. */
export function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <rect x="6" y="3" width="20" height="26" rx="6" className="fill-brand-900" />
      <rect x="10" y="9" width="12" height="2.5" rx="1.25" fill="#ffffff" />
      <rect x="10" y="20.5" width="8" height="2.5" rx="1.25" fill="#ffffff" />
      <rect x="2" y="14.25" width="28" height="3.5" rx="1.75" className="fill-brand-500" />
    </svg>
  );
}

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="CleanScreen, demo round">
      <LogoMark />
      <span className="text-[1.3rem] font-extrabold tracking-[-0.03em] text-brand-900">CleanScreen</span>
    </Link>
  );
}
