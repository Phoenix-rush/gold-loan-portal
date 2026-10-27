import { prisma } from "../db.js";
import { computeQuote } from "./quoteMath.js";
import type { QuoteBody } from "../schemas.js";

export async function listSchemes() {
  const rows = await prisma.loanScheme.findMany({
    where: { isActive: true },
    orderBy: { id: "asc" },
  });
  return rows.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    annualInterestRatePercent: p.annualInterestBp / 100,
    maxLtvPercent: Math.min(p.maxLtvBp, 7500) / 100, // kabhi 75% se upar nahi
    tenureMonths: p.tenureMonths,
  }));
}

export async function quoteAllPlans(input: QuoteBody) {
  const schemes = await prisma.loanScheme.findMany({
    where: { isActive: true },
    orderBy: { id: "asc" },
  });
  const plans = schemes.map((p) => {
    const q = computeQuote({
      netWeightGrams: input.netWeightGrams,
      karat: input.karat,
      maxLtvBp: p.maxLtvBp,
    });
    return { planId: p.id, planName: p.name, eligibleLoanRupees: q.eligibleLoanRupees };
  });
  const base = computeQuote({
    netWeightGrams: input.netWeightGrams,
    karat: input.karat,
    maxLtvBp: 7500,
  });
  return {
    pureGoldGrams: base.pureGoldGrams,
    goldValueRupees: base.goldValueRupees,
    plans,
  };
}