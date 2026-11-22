import type { Report } from "@/engine/types";

export type Tier = "free" | "paid";

export interface ViewReport extends Report {
  locked: boolean;
}

const zeroRoi = { monthlyFinancialBenefit: 0, netMonthly: 0, roiPct: null, breakEvenMonths: null, cumulativeBenefit: 0, cumulativeCost: 0 };

/**
 * Free tier (PRD §8.2): bottleneck map, hours, general directions and confidence.
 * Every NIS figure, ROI, severance and step-by-step plan is removed SERVER-SIDE so
 * it never reaches the browser of a free user.
 */
export function redactForTier(report: Report, tier: Tier): ViewReport {
  if (tier === "paid") return { ...report, locked: false };
  return {
    ...report,
    locked: true,
    recommendations: report.recommendations.map((r) => ({
      ...r,
      benefits: { ...r.benefits, directSavingsNis: 0 as typeof r.benefits.directSavingsNis, avoidedCostNis: 0, revenueImprovementNis: 0 },
      costs: { oneTimeNis: 0, monthlyNis: 0 },
      roi: zeroRoi,
      severanceExposure: undefined,
      steps: [],
      assumptions: [],
      rationale: { key: "rec.locked_rationale" },
      title: r.kind === "hire_vs_automate" ? { key: "rec.hire.locked_title" } : r.title,
    })),
    totals: { ...report.totals, directSavingsNis: 0, avoidedCostNis: 0, revenueImprovementNis: 0, oneTimeNis: 0, monthlyCostNis: 0, roi: zeroRoi },
    payroll: { lines: [], totalEmployerCost: { min: 0, max: 0 }, totalSoftwareNis: 0 },
  };
}
