import { describe, expect, it } from "vitest";
import { CreditBudget } from "@/lib/budget";

describe("CreditBudget", () => {
  it("refuses a run that would go over the day's budget, and settles to what was spent", () => {
    const budget = new CreditBudget(1000);
    const first = budget.reserve(600);
    expect(first).not.toBeNull();
    expect(budget.reserve(600)).toBeNull();
    first!.settle(300);
    expect(budget.remaining).toBe(700);
    expect(budget.reserve(600)).not.toBeNull();
  });

  it("starts again the next day", () => {
    let now = new Date("2026-11-01T23:00:00Z");
    const budget = new CreditBudget(500, () => now);
    const run = budget.reserve(500)!;
    expect(budget.reserve(1)).toBeNull();
    now = new Date("2026-11-02T00:10:00Z");
    run.settle(500); // yesterday's run does not count against today
    expect(budget.remaining).toBe(500);
  });
});
