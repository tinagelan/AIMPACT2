import type { RoiResult } from "./types";

/**
 * ROI = (cumulative financial benefit − cumulative costs) / cumulative costs × 100
 * Break-even (months) = one-time transition costs / net monthly savings
 */
export function computeRoi(input: {
  monthlyFinancialBenefit: number;
  oneTimeCost: number;
  monthlyCost: number;
  horizonMonths: number;
}): RoiResult {
  const { monthlyFinancialBenefit, oneTimeCost, monthlyCost, horizonMonths } = input;
  const netMonthly = monthlyFinancialBenefit - monthlyCost;
  const cumulativeBenefit = monthlyFinancialBenefit * horizonMonths;
  const cumulativeCost = oneTimeCost + monthlyCost * horizonMonths;

  const roiPct =
    cumulativeCost > 0 ? ((cumulativeBenefit - cumulativeCost) / cumulativeCost) * 100 : null;

  let breakEvenMonths: number | null;
  if (netMonthly <= 0) breakEvenMonths = null;
  else if (oneTimeCost <= 0) breakEvenMonths = 0;
  else breakEvenMonths = oneTimeCost / netMonthly;

  return {
    monthlyFinancialBenefit: round(monthlyFinancialBenefit),
    netMonthly: round(netMonthly),
    roiPct: roiPct === null ? null : round(roiPct, 1),
    breakEvenMonths: breakEvenMonths === null ? null : round(breakEvenMonths, 1),
    cumulativeBenefit: round(cumulativeBenefit),
    cumulativeCost: round(cumulativeCost),
  };
}

export function round(n: number, digits = 0): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}
