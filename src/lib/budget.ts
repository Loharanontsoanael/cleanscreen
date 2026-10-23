/**
 * A daily ceiling on the Clocked credits live screening may spend, so a burst of visitors cannot
 * drain the account the demo depends on. Each run reserves a cautious estimate up front and settles
 * to what it actually spent. Kept in memory: with several server instances the ceiling applies to
 * each, which is still a ceiling.
 */

/** Measured at about 66 credits per resume (README, Cost); reserved with headroom. */
export const CREDITS_PER_RESUME = 100;

export class CreditBudget {
  private day = "";
  private spent = 0;

  constructor(
    readonly perDay: number,
    private readonly now: () => Date = () => new Date(),
  ) {}

  private today() {
    const day = this.now().toISOString().slice(0, 10);
    if (day !== this.day) [this.day, this.spent] = [day, 0];
  }

  /** Reserves credits for a run, or returns null when the day's budget would be exceeded. */
  reserve(estimate: number): { settle: (actual: number) => void } | null {
    this.today();
    if (this.spent + estimate > this.perDay) return null;
    this.spent += estimate;
    const day = this.day;
    let settled = false;
    return {
      settle: (actual) => {
        if (settled) return;
        settled = true;
        this.today();
        if (this.day === day) this.spent = Math.max(0, this.spent - estimate + actual);
      },
    };
  }

  get remaining() {
    this.today();
    return Math.max(0, this.perDay - this.spent);
  }
}
