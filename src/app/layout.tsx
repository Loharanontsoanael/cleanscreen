import type { Metadata, Viewport } from "next";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import { Logo, LogoMark } from "@/components/logo";
import "./globals.css";

const sans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", display: "swap" });
// Weight 700 only: the mono face is only used for small bold tags.
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["700"], variable: "--font-jetbrains", display: "swap", preload: false });

export const metadata: Metadata = {
  title: { default: "CleanScreen: resume screening you can't trick", template: "%s · CleanScreen" },
  description:
    "Scores the resume a person actually sees, with identity removed. Finds hidden text, checks claims against references and explains every decision. Built on Clocked.",
};

export const viewport: Viewport = { themeColor: "#5f37dd", colorScheme: "light", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} h-full`}>
      <body className="min-h-full antialiased">
        <header className="mx-auto flex h-[68px] max-w-[1160px] items-center gap-3 px-5 sm:gap-7 sm:px-7">
          <Logo />
          <span className="flex-1" />
          <Link href="/how-it-works" className="hidden text-[15px] font-medium text-ink-500 hover:text-brand-900 md:block">
            How it works
          </Link>
          <Link href="/" className="hidden text-[15px] font-medium text-ink-500 hover:text-brand-900 sm:block">
            Demo round
          </Link>
          <Link href="/run" className="btn btn-primary btn-sm">
            <span className="sm:hidden">Try it</span>
            <span className="hidden sm:inline">Screen your own</span>
          </Link>
        </header>
        {children}
        <footer className="mx-auto mt-16 flex max-w-[1160px] flex-wrap items-center justify-between gap-3 border-t-[1.5px] border-rule px-5 py-8 sm:px-7">
          <LogoMark size={26} />
          <span className="text-[13px] text-ink-400">
            Built on Clocked for the Clocked Build Challenge. Every applicant in the demo is fictional.
          </span>
        </footer>
      </body>
    </html>
  );
}
