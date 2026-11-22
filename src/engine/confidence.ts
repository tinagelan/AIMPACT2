import { resolveGross } from "./employerCost";
import type { BusinessProfile, ConfidenceResult, Msg, OpenQuestion } from "./types";

/**
 * Confidence reflects how much of the input is real data versus ranges or
 * industry defaults (PRD risk 4). The engine never fills gaps silently.
 */
export function computeConfidence(p: BusinessProfile): ConfidenceResult {
  const parts: { score: number; weight: number }[] = [];
  const improvements: Msg[] = [];

  // Salaries
  if (p.employees.length > 0) {
    let s = 0;
    let bench = 0;
    let ranges = 0;
    for (const e of p.employees) {
      const src = resolveGross(e).source;
      if (src === "user") s += 1;
      else if (src === "range") { s += 0.75; ranges++; }
      else { s += 0.35; bench++; }
    }
    parts.push({ score: s / p.employees.length, weight: 2 });
    if (bench > 0) improvements.push({ key: "confidence.add_salaries", params: { count: bench } });
    if (ranges > 0) improvements.push({ key: "confidence.exact_salaries", params: { count: ranges } });
  } else {
    parts.push({ score: 0, weight: 2 });
    improvements.push({ key: "confidence.add_employees" });
  }

  // Section 14
  const unknown14 = p.employees.filter((e) => e.section14 === "unknown").length;
  if (p.employees.length > 0) {
    parts.push({ score: 1 - (0.5 * unknown14) / p.employees.length, weight: 1 });
    if (unknown14 > 0) improvements.push({ key: "confidence.section14", params: { count: unknown14 } });
  }

  // Bottleneck hours
  if (p.bottlenecks.length > 0) {
    const bench = p.bottlenecks.filter((b) => b.hoursSource === "benchmark").length;
    parts.push({ score: 1 - (0.4 * bench) / p.bottlenecks.length, weight: 2 });
    if (bench > 0) improvements.push({ key: "confidence.confirm_hours", params: { count: bench } });
  } else {
    parts.push({ score: 0.3, weight: 2 });
    improvements.push({ key: "confidence.add_bottlenecks" });
  }

  // Software spend
  if (p.subscriptions.length > 0) {
    const withCost = p.subscriptions.filter((s) => s.monthlyCostNis > 0).length;
    parts.push({ score: 0.5 + (0.5 * withCost) / p.subscriptions.length, weight: 1 });
    const unknownUsage = p.subscriptions.filter((s) => s.usage === "unknown").length;
    parts.push({ score: 1 - (0.4 * unknownUsage) / p.subscriptions.length, weight: 0.5 });
    if (unknownUsage > 0) improvements.push({ key: "confidence.usage", params: { count: unknownUsage } });
  } else {
    parts.push({ score: 0.5, weight: 1.5 });
    improvements.push({ key: "confidence.add_software" });
  }

  const totalW = parts.reduce((a, b) => a + b.weight, 0);
  let score = parts.reduce((a, b) => a + b.score * b.weight, 0) / totalW;
  if (p.filesUploaded) score += 0.05;
  if (p.freeTextProvided) score += 0.02;
  score = Math.min(1, score);
  if (!p.filesUploaded) improvements.push({ key: "confidence.upload_files" });

  let level: ConfidenceResult["level"] = score >= 0.85 ? "high" : score >= 0.6 ? "medium" : "low";
  // Results resting mostly on industry defaults can never be "high" confidence.
  const benchBottlenecks = p.bottlenecks.filter((b) => b.hoursSource === "benchmark").length;
  const benchSalaries = p.employees.filter((e) => resolveGross(e).source === "benchmark").length;
  if (level === "high" && (benchBottlenecks * 2 > p.bottlenecks.length || benchSalaries * 2 > p.employees.length)) level = "medium";
  return { level, score: Math.round(score * 100) / 100, improvements };
}

export function openQuestions(p: BusinessProfile): OpenQuestion[] {
  const qs: OpenQuestion[] = [];
  for (const e of p.employees) {
    if (e.section14 === "unknown") {
      qs.push({ id: `s14_${e.id}`, field: `employees.${e.id}.section14`, message: { key: "q.section14", params: { title: e.title || e.role } } });
    }
    if (e.section14 === "no" && e.tenureYears === undefined) {
      qs.push({ id: `tenure_${e.id}`, field: `employees.${e.id}.tenureYears`, message: { key: "q.tenure", params: { title: e.title || e.role } } });
    }
  }
  if (p.decisions.redirectToRevenue.length > 0 && !p.settings.revenuePerHourNis) {
    qs.push({ id: "rev_per_hour", field: "settings.revenuePerHourNis", message: { key: "q.revenue_per_hour" } });
  }
  for (const s of p.subscriptions) {
    if (s.usage === "unknown") qs.push({ id: `usage_${s.id}`, field: `subscriptions.${s.id}.usage`, message: { key: "q.usage", params: { name: s.name } } });
  }
  return qs;
}
