import { describe, expect, it } from "vitest";
import demo from "../data/demo/report.json";
import { auditReport, roundCsv } from "@/lib/export";
import type { RoundReport } from "@/lib/types";

const report = demo as unknown as RoundReport;

describe("round exports", () => {
  it("never names an applicant", () => {
    const names = report.candidates.map((c) => c.name).filter((n): n is string => !!n);
    expect(names.length).toBeGreaterThan(0);
    for (const text of [roundCsv(report), auditReport(report)]) for (const n of names) expect(text).not.toContain(n);
  });

  it("writes one CSV row per applicant, quoted where needed, with formulas defused", () => {
    const tricky: RoundReport = {
      ...report,
      candidates: [{ ...report.candidates[0], decision: { outcome: "human_review", reasons: ['=HYPERLINK("x")', "a, b"] } }],
      failed: [],
    };
    const lines = roundCsv(tricky).trim().split("\r\n");
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain(`"'=HYPERLINK(""x""); a, b"`);
    expect(roundCsv(report).trim().split("\r\n")).toHaveLength(report.candidates.length + 1);
  });

  it("lists every decision with its reasons and the calls behind it", () => {
    const md = auditReport(report);
    for (const c of report.candidates) expect(md).toContain(`## ${c.label}: `);
    expect(md).toContain("Hidden invisible text: keyword stuffing");
    expect(md).toContain("/grounding:");
  });
});
