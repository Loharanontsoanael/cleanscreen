"use client";

import { useEffect, useRef, useState } from "react";
import type { CandidateReport } from "@/lib/types";
import { ResumeText } from "./resume-paper";

const RADIUS = 140;
/** An A4 sheet (210 x 297 mm); a longer resume simply grows past it. */
const PAPER = "rounded-[4px] aspect-[210/297]";

/**
 * The resume as a person sees it, with an ultraviolet lamp on top. Under the
 * lamp the page turns into a black-lit copy where ink no one can see glows.
 * On load the lamp sweeps the page and settles on the hidden text.
 */
export function UvLamp({ c }: { c: CandidateReport }) {
  const wrap = useRef<HTMLDivElement>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [full, setFull] = useState(false);
  const [touched, setTouched] = useState(false);

  // Sweep from the top of the page to the first hidden passage, once.
  useEffect(() => {
    const box = wrap.current?.getBoundingClientRect();
    if (!box || !overlay.current?.querySelector(".uv-hit")) return;
    // Aim at the middle of the first hidden passage (all of its lines together).
    const hits = [...(overlay.current?.querySelectorAll(".uv-hit") ?? [])].map((el) => el.getBoundingClientRect());
    const first = hits.filter((r) => hits[0] && r.top - hits[0].top < 80);
    const target = first.length
      ? {
          x: (Math.min(...first.map((r) => r.left)) + Math.max(...first.map((r) => r.right))) / 2 - box.left,
          y: (Math.min(...first.map((r) => r.top)) + Math.max(...first.map((r) => r.bottom))) / 2 - box.top,
        }
      : { x: box.width / 2, y: box.height / 2 };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPos(target);
      return;
    }
    const start = { x: box.width * 0.75, y: RADIUS };
    const t0 = performance.now();
    const duration = 1600;
    let frame = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / duration);
      const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
      setPos({ x: start.x + (target.x - start.x) * e, y: start.y + (target.y - start.y) * e });
      if (k < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [c.id]);

  const move = (e: React.PointerEvent) => {
    const box = wrap.current?.getBoundingClientRect();
    if (!box) return;
    setTouched(true);
    setPos({ x: e.clientX - box.left, y: e.clientY - box.top });
  };

  const lens = pos ? `radial-gradient(circle ${RADIUS}px at ${pos.x}px ${pos.y}px, #000 78%, transparent 100%)` : "none";
  const hasHidden = c.hidden.some((h) => h.intent !== "benign") || c.injection.verdict !== "benign";

  return (
    <div>
      <div
        ref={wrap}
        onPointerMove={move}
        onPointerDown={move}
        className={`relative touch-none select-none ${full ? "" : "cursor-none"}`}
      >
        <div className={`${PAPER} bg-white shadow-[0_1px_2px_rgb(15_27_45/0.08),0_12px_32px_-12px_rgb(15_27_45/0.28)] ring-1 ring-ink-100`}>
          <ResumeText c={c} machine={false} />
        </div>
        <div
          ref={overlay}
          aria-hidden
          className={`uv-theme pointer-events-none absolute inset-0 ${PAPER}`}
          style={
            full ? undefined : pos ? { maskImage: lens, WebkitMaskImage: lens } : { visibility: "hidden" } // lamp off until it moves
          }
        >
          <ResumeText c={c} machine />
        </div>
        {pos && !full && (
          <span
            aria-hidden
            className="pointer-events-none absolute rounded-full border-2 border-brand-400 shadow-[0_0_24px_4px_rgb(117_80_238/0.45)]"
            style={{ left: pos.x - RADIUS, top: pos.y - RADIUS, width: 2 * RADIUS, height: 2 * RADIUS }}
          />
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[13px]">
        <p className="text-ink-400">
          {touched || !hasHidden
            ? "Move the UV lamp over the page. Ink no person can see glows under it."
            : "The UV lamp found ink no person can see. Move it around the page."}
        </p>
        <button onClick={() => setFull(!full)} className="font-semibold text-brand-600 hover:text-brand-700">
          {full ? "Use the lamp" : "Light the whole page"}
        </button>
      </div>
    </div>
  );
}
