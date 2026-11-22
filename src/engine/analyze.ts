import { ADMIN_PROCESSES, VERTICAL_TEMPLATES } from "@/benchmarks/verticals";
import { monthlyFinancialBenefit } from "./benefits";
import { computeConfidence, openQuestions } from "./confidence";
import { buildContext, type Draft } from "./context";
import { employerCostRange, monthlyHours, resolveGross, WEEKS_PER_MONTH } from "./employerCost";
import { computeRoi } from "./roi";
import { hireVsAutomateRule } from "./rules/hireVsAutomate";
import { processRules } from "./rules/processes";
import { duplicateSaasRule, lowUsageRule, unusedSeatsRule } from "./rules/subscriptions";
import { effortScore, horizonOf, impactScore, priority } from "./scoring";
import { severanceTopUp } from "./severance";
import type { BusinessProfile, CatalogTool, Msg, Recommendation, Report } from "./types";

export const ENGINE_VERSION = "1.0.0";

export function analyze(profile: BusinessProfile, catalog: CatalogTool[], now = new Date()): Report {
  const ctx = buildContext(profile, catalog, now);
  const { settings, decisions } = profile;

  const hire = hireVsAutomateRule(ctx);
  const drafts: Draft[] = [
    ...duplicateSaasRule(ctx),
    ...unusedSeatsRule(ctx),
    ...lowUsageRule(ctx),
    ...hire.drafts,
    ...processRules(ctx, hire.covered),
  ];

  // Score every draft and compute its own ROI.
  const scored: Recommendation[] = drafts.map((d) => {
    const role = profile.bottlenecks.find((b) => d.id.endsWith(`_${b.id}`))?.role ?? "admin_coordinator";
    const impact = impactScore(d, ctx.hourly(role).value);
    const effort = effortScore(d);
    return {
      ...d,
      horizon: horizonOf(d),
      impactScore: impact,
      effortScore: effort,
      counted: false,
      roi: computeRoi({
        monthlyFinancialBenefit: monthlyFinancialBenefit(d.benefits),
        oneTimeCost: d.costs.oneTimeNis,
        monthlyCost: d.costs.monthlyNis,
        horizonMonths: settings.horizonMonths,
      }),
    };
  });

  // Alternatives: only the best non-excluded recommendation per group counts.
  const excluded = new Set(decisions.excluded);
  const bestByGroup = new Map<string, Recommendation>();
  for (const r of scored) {
    if (excluded.has(r.id)) continue;
    const g = r.alternativeGroup ?? r.id;
    const cur = bestByGroup.get(g);
    if (!cur || rankValue(r) > rankValue(cur)) bestByGroup.set(g, r);
  }
  for (const r of bestByGroup.values()) r.counted = true;

  scored.sort((a, b) => Number(b.counted) - Number(a.counted) || priority(b.impactScore, b.effortScore) - priority(a.impactScore, a.effortScore));

  const counted = scored.filter((r) => r.counted);
  const sum = (f: (r: Recommendation) => number) => counted.reduce((a, r) => a + f(r), 0);
  const directSavingsNis = sum((r) => r.benefits.directSavingsNis);
  const avoidedCostNis = sum((r) => r.benefits.avoidedCostNis);
  const revenueImprovementNis = sum((r) => r.benefits.revenueImprovementNis);
  const oneTimeNis = sum((r) => r.costs.oneTimeNis);
  const monthlyCostNis = sum((r) => r.costs.monthlyNis);

  // Payroll overview
  const lines = profile.employees.map((e) => {
    const { gross, source } = resolveGross(e);
    return {
      employeeId: e.id,
      role: e.role,
      title: e.title,
      gross,
      employerCost: employerCostRange(gross, settings.employerMultiplier),
      severanceTopUp: severanceTopUp(e.section14, e.tenureYears, gross),
      section14: e.section14,
      salarySource: source,
    };
  });

  return {
    engineVersion: ENGINE_VERSION,
    generatedAt: now.toISOString(),
    confidence: computeConfidence(profile),
    recommendations: scored,
    totals: {
      directSavingsNis: Math.round(directSavingsNis),
      avoidedCostNis: Math.round(avoidedCostNis),
      timeSavedHours: Math.round(sum((r) => r.benefits.timeSavedHours)),
      revenueImprovementNis: Math.round(revenueImprovementNis),
      oneTimeNis: Math.round(oneTimeNis),
      monthlyCostNis: Math.round(monthlyCostNis),
      roi: computeRoi({
        monthlyFinancialBenefit: directSavingsNis + avoidedCostNis + revenueImprovementNis,
        oneTimeCost: oneTimeNis,
        monthlyCost: monthlyCostNis,
        horizonMonths: settings.horizonMonths,
      }),
    },
    bottleneckMap: profile.bottlenecks
      .map((b) => ({ process: b.process, hoursPerMonth: Math.round(b.hoursPerWeek * WEEKS_PER_MONTH), hoursSource: b.hoursSource, pain: b.pain }))
      .sort((a, b) => b.hoursPerMonth - a.hoursPerMonth),
    payroll: {
      lines,
      totalEmployerCost: {
        min: Math.round(lines.reduce((a, l) => a + l.employerCost.min, 0)),
        max: Math.round(lines.reduce((a, l) => a + l.employerCost.max, 0)),
      },
      totalSoftwareNis: Math.round(profile.subscriptions.reduce((a, s) => a + s.monthlyCostNis, 0)),
    },
    directions: directions(profile, scored),
    openQuestions: openQuestions(profile),
  };
}

/** Value used to pick the best alternative within a group. */
function rankValue(r: Recommendation): number {
  return priority(r.impactScore, r.effortScore) + r.roi.netMonthly / 1000;
}

/** Free-tier output: where time goes and general directions, no money. */
function directions(p: BusinessProfile, recs: Recommendation[]): Msg[] {
  const out: Msg[] = [];
  const top = [...p.bottlenecks].sort((a, b) => b.hoursPerWeek - a.hoursPerWeek)[0];
  if (top) out.push({ key: "dir.top_bottleneck", params: { process: top.process, hours: Math.round(top.hoursPerWeek * WEEKS_PER_MONTH) } });

  const teamHours = p.employees.reduce((a, e) => a + monthlyHours(e.scopePct), 0);
  const adminHours = p.bottlenecks.filter((b) => ADMIN_PROCESSES.includes(b.process)).reduce((a, b) => a + b.hoursPerWeek * WEEKS_PER_MONTH, 0);
  const threshold = VERTICAL_TEMPLATES[p.vertical]?.adminOverloadThreshold ?? 0.2;
  if (teamHours > 0 && adminHours / teamHours > threshold) {
    out.push({ key: "dir.admin_overload", params: { pct: Math.round((adminHours / teamHours) * 100), benchmark: Math.round(threshold * 100) } });
  }
  const dups = recs.filter((r) => r.kind === "cancel_duplicate").length;
  if (dups > 0) out.push({ key: "dir.duplicates", params: { count: dups } });
  const seats = recs.filter((r) => r.kind === "reduce_seats" || r.kind === "review_low_usage").length;
  if (seats > 0) out.push({ key: "dir.underused", params: { count: seats } });
  if (recs.some((r) => r.kind === "process_change" && r.counted)) out.push({ key: "dir.process_first" });
  if (recs.some((r) => r.kind === "hire_vs_automate")) out.push({ key: "dir.hire_alternative" });
  if (recs.some((r) => r.kind === "automate_process" && r.tools.some((t) => !t.isAI))) out.push({ key: "dir.not_only_ai" });
  return out;
}
