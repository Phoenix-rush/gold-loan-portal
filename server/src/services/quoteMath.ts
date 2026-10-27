export const RATE_24K_PAISE_PER_GRAM = 700000; // ₹7000

export interface QuoteInput {
  netWeightGrams: number;
  karat: 18 | 22 | 24;
  maxLtvBp: number; // basis points: 7000 = 70%
}

export function computeQuote({ netWeightGrams, karat, maxLtvBp }: QuoteInput) {
  // milligram integer mein kaam, taaki float error na aaye
  const netMg = Math.round(netWeightGrams * 1000);

  // pureMg = netMg * karat / 24  (round to nearest mg)
  const pureMg = Math.round((netMg * karat) / 24);

  // goldValuePaise = pureMg/1000 * ratePaise
  const goldValuePaise = Math.round((pureMg * RATE_24K_PAISE_PER_GRAM) / 1000);

  const ltvBp = Math.min(maxLtvBp, 7500);

  // loan whole rupees, floor
  const loanRupees = Math.floor((goldValuePaise * ltvBp) / 10000 / 100);

  return {
    pureGoldGrams: pureMg / 1000,
    goldValueRupees: goldValuePaise / 100,
    eligibleLoanRupees: loanRupees,
  };
}