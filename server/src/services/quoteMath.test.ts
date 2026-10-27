import { describe, it, expect } from "vitest";
import { computeQuote } from "./quoteMath.js";

describe("computeQuote", () => {
  it("case 1: 45g 22K EMI (75%)", () => {
    expect(computeQuote({ netWeightGrams: 45, karat: 22, maxLtvBp: 7500 })).toEqual({
      pureGoldGrams: 41.25,
      goldValueRupees: 288750,
      eligibleLoanRupees: 216562,
    });
  });

  it("case 2: 45g 22K Bullet (70%)", () => {
    const r = computeQuote({ netWeightGrams: 45, karat: 22, maxLtvBp: 7000 });
    expect(r.goldValueRupees).toBe(288750);
    expect(r.eligibleLoanRupees).toBe(202125);
  });

  it("case 3: 10g 18K EMI", () => {
    expect(computeQuote({ netWeightGrams: 10, karat: 18, maxLtvBp: 7500 })).toEqual({
      pureGoldGrams: 7.5,
      goldValueRupees: 52500,
      eligibleLoanRupees: 39375,
    });
  });

  it("never exceeds 75% LTV even if plan says more", () => {
    const r = computeQuote({ netWeightGrams: 10, karat: 24, maxLtvBp: 9000 });
    expect(r.eligibleLoanRupees).toBe(52500); // 70000 * 0.75
  });
});