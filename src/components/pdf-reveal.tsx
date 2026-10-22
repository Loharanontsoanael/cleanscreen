"use client";

import { useState } from "react";
import type { CandidateReport } from "@/lib/types";

type Mode = "human" | "machine";

/**
 * The original first page of a resume, rendered from the PDF itself. In the
 * machine view, hidden lines are drawn back at the exact position and size
 * they occupy in the file.
 */
export function PdfReveal({
  c,
  crop = true,
  initialMode = "machine",
}: {
  c: CandidateReport;
  crop?: boolean;
  initialMode?: Mode;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const size = c.pageSizes[0];
  if (!c.pageImage || !size) return null;

  const lines = c.hidden.filter((h) => h.page === 1).flatMap((h) => h.lines ?? []);
  // Show the page down to just below the last hidden line, so the reveal is in view.
  const bottom = crop && lines.length ? Math.min(size.height, Math.max(...lines.map((l) => l.bbox[3])) + 30) : size.height;
  // Trim most of the side margins when cropping so the text reads larger.
  const margin = crop ? 32 : 0;

  return (
    <figure>
      <div className="panel panel-key overflow-hidden">
        <svg viewBox={`${margin} ${crop ? 20 : 0} ${size.width - 2 * margin} ${bottom - (crop ? 20 : 0)}`} className="block w-full" role="img" aria-label={`First page of ${c.label}'s resume`}>
          <image href={c.pageImage} width={size.width} height={size.height} />
          {mode === "machine" &&
            lines.map((l, i) => (
              <g key={i}>
                <rect
                  x={l.bbox[0] - 3}
                  y={l.bbox[1] - 1}
                  width={l.bbox[2] - l.bbox[0] + 6}
                  height={Math.max(l.bbox[3] - l.bbox[1] + 2, 6)}
                  rx={3}
                  className="fill-brand-100"
                />
                <text
                  x={l.bbox[0]}
                  y={l.bbox[3] - Math.max(l.size * 0.28, 0.5)}
                  fontSize={Math.max(l.size, 4)}
                  fontFamily="Helvetica, Arial, sans-serif"
                  className="fill-brand-700"
                >
                  {l.text}
                </text>
              </g>
            ))}
        </svg>
      </div>
      <figcaption className="mt-4 grid grid-cols-2 gap-1 rounded-full bg-ink-50 p-1 text-[13px] font-semibold">
        {(
          [
            ["human", "As you see it"],
            ["machine", "As an AI reads it"],
          ] as const
        ).map(([m, label]) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            aria-pressed={mode === m}
            className={`rounded-full py-2 transition-colors ${
              mode === m ? (m === "machine" ? "bg-brand-600 text-white" : "bg-brand-900 text-white") : "text-ink-500 hover:text-brand-900"
            }`}
          >
            {label}
          </button>
        ))}
      </figcaption>
    </figure>
  );
}
