import { describe, expect, it } from "vitest";
import { decideOutcome } from "@/lib/policy";

const met = { mustHave: true, verdict: "met" as const, probabilities: { met: 0.99, not_met: 0, not_established: 0.01 } };
const missed = { mustHave: true, verdict: "not_met" as const, probabilities: { met: 0.01, not_met: 0.95, not_established: 0.04 } };
const unsure = { mustHave: true, verdict: "not_met" as const, probabilities: { met: 0.3, not_met: 0.6, not_established: 0.1 } };
const niceMissed = { ...missed, mustHave: false };

describe("decideOutcome", () => {
  it("advances when every must-have is met and nothing is flagged", () => {
    expect(decideOutcome({ integrityReasons: [], requirements: [met, niceMissed], unchecked: [] }).outcome).toBe("advance");
  });

  it("flags any integrity finding, whatever the fit", () => {
    const d = decideOutcome({ integrityReasons: ["Hidden text"], requirements: [met], unchecked: [] });
    expect(d).toEqual({ outcome: "flagged", reasons: ["Hidden text"] });
  });

  it("rejects only a must-have clearly not met", () => {
    expect(decideOutcome({ integrityReasons: [], requirements: [met, missed], unchecked: [] }).outcome).toBe("reject");
    expect(decideOutcome({ integrityReasons: [], requirements: [met, unsure], unchecked: [] }).outcome).toBe("human_review");
  });

  it("never advances when a check that applied could not run", () => {
    const d = decideOutcome({ integrityReasons: [], requirements: [met], unchecked: ["claims against the references"] });
    expect(d).toEqual({ outcome: "human_review", reasons: ["Not checked: claims against the references"] });
  });
});
