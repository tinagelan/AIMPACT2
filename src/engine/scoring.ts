import type { Draft } from "./context";
import type { Horizon } from "./types";
import { monthlyFinancialBenefit } from "./benefits";

/**
 * Impact uses a NIS-equivalent ONLY for prioritisation: freed hours are valued at
 * half their employer cost. This number is never shown as savings.
 */
export function impactScore(d: Draft, hourlyCost: number): number {
  const v = Math.max(0, monthlyFinancialBenefit(d.benefits) - d.costs.monthlyNis) + d.benefits.timeSavedHours * hourlyCost * 0.5;
  return Math.min(100, Math.round(25 * Math.log10(1 + v / 100)));
}

export function effortScore(d: Draft): number {
  const s = d.complexity * 15 + Math.min(25, d.costs.oneTimeNis / 1000) + (d.costs.monthlyNis > 0 ? 5 : 0);
  return Math.min(100, Math.round(s));
}

export function horizonOf(d: Draft): Horizon {
  if (d.complexity <= 2 && d.costs.oneTimeNis <= 3000) return "quick_win";
  if (d.complexity >= 4 || d.costs.oneTimeNis > 15000) return "long_term";
  return "medium_term";
}

export function priority(impact: number, effort: number): number {
  return impact - effort * 0.5;
}
