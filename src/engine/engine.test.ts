import { describe, expect, it } from "vitest";
import { SEED_TOOLS } from "@/catalog/seedTools";
import { analyze } from "./analyze";
import { emptyProfile } from "./defaults";
import { employerCost } from "./employerCost";
import { computeRoi } from "./roi";
import { severanceTopUp } from "./severance";
import type { BusinessProfile, Employee } from "./types";

const NOW = new Date("2026-11-22T00:00:00Z");

function emp(id: string, over: Partial<Employee> = {}): Employee {
  return { id, role: "admin_coordinator", scopePct: 100, salary: { exact: 9000 }, tenureYears: 2, section14: "yes", ...over };
}

describe("financial primitives", () => {
  it("employer cost adds the 25–30% multiplier", () => {
    expect(employerCost(10000, 0.28)).toBe(12800);
    expect(employerCost(10000, 0.5)).toBe(13000); // clamped to 30%
    expect(employerCost(10000, 0.1)).toBe(12500); // clamped to 25%
  });

  it("severance: Section 14 → no top-up; otherwise tenure × last gross; unknown → range", () => {
    expect(severanceTopUp("yes", 5, { min: 10000, max: 10000 })).toEqual({ min: 0, max: 0 });
    expect(severanceTopUp("no", 5, { min: 10000, max: 10000 })).toEqual({ min: 50000, max: 50000 });
    expect(severanceTopUp("unknown", 5, { min: 10000, max: 10000 })).toEqual({ min: 0, max: 50000 });
  });

  it("ROI and break-even follow the PRD formulas", () => {
    const r = computeRoi({ monthlyFinancialBenefit: 1000, oneTimeCost: 2000, monthlyCost: 200, horizonMonths: 12 });
    expect(r.cumulativeBenefit).toBe(12000);
    expect(r.cumulativeCost).toBe(4400);
    expect(r.roiPct).toBeCloseTo(((12000 - 4400) / 4400) * 100, 1);
    expect(r.breakEvenMonths).toBe(2.5);
  });

  it("break-even is null when net monthly savings ≤ 0, and 0 with no one-time cost", () => {
    expect(computeRoi({ monthlyFinancialBenefit: 100, oneTimeCost: 500, monthlyCost: 100, horizonMonths: 12 }).breakEvenMonths).toBeNull();
    expect(computeRoi({ monthlyFinancialBenefit: 100, oneTimeCost: 0, monthlyCost: 0, horizonMonths: 12 }).breakEvenMonths).toBe(0);
    expect(computeRoi({ monthlyFinancialBenefit: 100, oneTimeCost: 0, monthlyCost: 0, horizonMonths: 12 }).roiPct).toBeNull();
  });
});

describe("PRD scenario 2 — duplicate SaaS (marketing agency, 10 employees)", () => {
  const p: BusinessProfile = {
    ...emptyProfile("agency"),
    employeeCount: 10,
    employees: Array.from({ length: 10 }, (_, i) => emp(`e${i}`, { role: i === 0 ? "office_manager" : "account_manager", salary: { exact: 12000 } })),
    subscriptions: [
      { id: "s1", toolId: "asana", name: "Asana", seats: 10, monthlyCostNis: 1200, usage: "medium" },
      { id: "s2", toolId: "monday", name: "monday.com", seats: 10, monthlyCostNis: 1500, usage: "medium" },
      { id: "s3", toolId: "google_workspace", name: "Google Workspace", seats: 10, monthlyCostNis: 520, usage: "high" },
    ],
  };
  const report = analyze(p, SEED_TOOLS, NOW);

  it("detects the overlapping project tools and cancels the cheaper one", () => {
    const dup = report.recommendations.find((r) => r.kind === "cancel_duplicate");
    expect(dup).toBeDefined();
    expect(dup!.benefits.directSavingsNis).toBe(1200);
    expect(report.totals.directSavingsNis).toBe(1200);
  });

  it("every tool reference carries a pricing URL and verification status", () => {
    for (const r of report.recommendations) for (const t of r.tools) {
      expect(t.pricingUrl).toMatch(/^https:\/\//);
      expect(t.stale).toBe(true); // seed prices are unverified
    }
  });
});

describe("PRD scenario 1 — hire vs. automate (real-estate brokerage, 8 employees)", () => {
  const base: BusinessProfile = {
    ...emptyProfile("real_estate"),
    employeeCount: 8,
    employees: [
      emp("a1", { role: "admin_coordinator", salary: { exact: 8500 }, section14: "unknown", tenureYears: 4 }),
      ...Array.from({ length: 7 }, (_, i) => emp(`g${i}`, { role: "agent", salary: { exact: 10000 } })),
    ],
    bottlenecks: [
      { id: "b1", process: "data_entry", hoursPerWeek: 30, hoursSource: "user", peopleInvolved: 3, role: "admin_coordinator", pain: 4 },
    ],
    plannedHire: { role: "customer_service", grossSalary: 7500, scopePct: 100, hoursPerWeekNeeded: 15, processes: ["data_entry"] },
  };
  const report = analyze(base, SEED_TOOLS, NOW);
  const hire = report.recommendations.find((r) => r.kind === "hire_vs_automate")!;

  it("shows the hire as avoided cost (~9,500 NIS/month), not P&L savings", () => {
    expect(hire).toBeDefined();
    // 7,500 × 1.28 = 9,600 employer cost, minus a ~$11–30/month automation tool
    expect(hire.benefits.avoidedCostNis).toBeGreaterThan(9400);
    expect(hire.benefits.avoidedCostNis).toBeLessThan(9600);
    expect(hire.benefits.directSavingsNis).toBe(0);
    expect(report.totals.directSavingsNis).toBe(0);
  });

  it("does not double count the same process as a separate automation", () => {
    expect(report.recommendations.some((r) => r.id === "auto_b1")).toBe(false);
  });

  it("asks a clarifying question about Section 14", () => {
    expect(report.openQuestions.some((q) => q.id === "s14_a1")).toBe(true);
  });
});

describe("PRD scenario 3 — questionnaire only (consulting firm, 15 employees)", () => {
  const p: BusinessProfile = {
    ...emptyProfile("professional_services"),
    employeeCount: 15,
    employees: Array.from({ length: 15 }, (_, i) =>
      emp(`c${i}`, { role: i < 2 ? "admin_coordinator" : "professional", salary: { range: { min: 12000, max: 18000 } } }),
    ),
    bottlenecks: [
      { id: "b1", process: "scheduling", hoursPerWeek: 25, hoursSource: "benchmark", peopleInvolved: 2, role: "admin_coordinator", pain: 3 },
      { id: "b2", process: "timesheets", hoursPerWeek: 20, hoursSource: "benchmark", peopleInvolved: 13, role: "professional", pain: 3 },
    ],
    subscriptions: [{ id: "s1", toolId: "microsoft_365", name: "Microsoft 365", seats: 15, monthlyCostNis: 700, usage: "high" }],
  };
  const report = analyze(p, SEED_TOOLS, NOW);

  it("produces a Medium confidence score and explains what would raise it", () => {
    expect(report.confidence.level).toBe("medium");
    const keys = report.confidence.improvements.map((m) => m.key);
    expect(keys).toContain("confidence.exact_salaries");
    expect(keys).toContain("confidence.confirm_hours");
    expect(keys).toContain("confidence.upload_files");
  });

  it("exact salaries but benchmark-only hours cap confidence at Medium", () => {
    const exact = { ...p, employees: p.employees.map((e) => ({ ...e, salary: { exact: 15000 } })) };
    expect(analyze(exact, SEED_TOOLS, NOW).confidence.level).toBe("medium");
    const confirmed = { ...exact, bottlenecks: exact.bottlenecks.map((b) => ({ ...b, hoursSource: "user" as const })) };
    expect(analyze(confirmed, SEED_TOOLS, NOW).confidence.level).toBe("high");
  });

  it("still produces recommendations", () => {
    expect(report.recommendations.length).toBeGreaterThan(0);
  });
});

describe("iron rule — freed time is never P&L savings by default", () => {
  const p: BusinessProfile = {
    ...emptyProfile("professional_services"),
    employees: [emp("a", { section14: "no", tenureYears: 3 })],
    bottlenecks: [{ id: "b1", process: "scheduling", hoursPerWeek: 15, hoursSource: "user", peopleInvolved: 1, role: "admin_coordinator", pain: 4 }],
  };

  it("hours saved appear only as time", () => {
    const r = analyze(p, SEED_TOOLS, NOW);
    for (const rec of r.recommendations) {
      if (rec.benefits.timeSavedHours > 0) {
        expect(rec.benefits.directSavingsNis).toBe(0);
        expect(rec.benefits.revenueImprovementNis).toBe(0);
      }
    }
    expect(r.totals.directSavingsNis).toBe(0);
    expect(r.totals.timeSavedHours).toBeGreaterThan(0);
  });

  it("confirmed FTE reduction converts hours to P&L and adds severance (no Section 14)", () => {
    const r1 = analyze(p, SEED_TOOLS, NOW);
    const auto = r1.recommendations.find((r) => r.id === "auto_b1")!;
    const r2 = analyze({ ...p, decisions: { ...p.decisions, fteReductionConfirmed: ["auto_b1"] } }, SEED_TOOLS, NOW);
    const auto2 = r2.recommendations.find((r) => r.id === "auto_b1")!;
    expect(auto2.benefits.directSavingsNis).toBeGreaterThan(0);
    expect(auto2.severanceExposure!.max).toBeGreaterThan(0);
    expect(auto2.costs.oneTimeNis).toBeGreaterThan(auto.costs.oneTimeNis);
  });

  it("redirect to revenue without a value per hour yields no money and an open question", () => {
    const r = analyze({ ...p, decisions: { ...p.decisions, redirectToRevenue: ["auto_b1"] } }, SEED_TOOLS, NOW);
    expect(r.recommendations.find((x) => x.id === "auto_b1")!.benefits.revenueImprovementNis).toBe(0);
    expect(r.openQuestions.some((q) => q.id === "rev_per_hour")).toBe(true);
  });

  it("process change and automation for the same bottleneck are alternatives — only one counts", () => {
    const r = analyze(p, SEED_TOOLS, NOW);
    const group = r.recommendations.filter((x) => x.alternativeGroup === "proc:b1");
    expect(group.length).toBe(2);
    expect(group.filter((x) => x.counted).length).toBe(1);
  });

  it("excluding a recommendation in the simulator lets its alternative count", () => {
    const r1 = analyze(p, SEED_TOOLS, NOW);
    const first = r1.recommendations.find((x) => x.alternativeGroup === "proc:b1" && x.counted)!;
    const r2 = analyze({ ...p, decisions: { ...p.decisions, excluded: [first.id] } }, SEED_TOOLS, NOW);
    const now = r2.recommendations.find((x) => x.alternativeGroup === "proc:b1" && x.counted)!;
    expect(now.id).not.toBe(first.id);
  });
});

describe("subscriptions", () => {
  it("bundle covers a standalone tool (Zoom inside Google Workspace)", () => {
    const p: BusinessProfile = {
      ...emptyProfile(),
      employees: [emp("a")],
      subscriptions: [
        { id: "z", toolId: "zoom", name: "Zoom", seats: 5, monthlyCostNis: 250, usage: "medium" },
        { id: "g", toolId: "google_workspace", name: "Google Workspace", seats: 5, monthlyCostNis: 260, usage: "high" },
      ],
    };
    const dup = analyze(p, SEED_TOOLS, NOW).recommendations.find((r) => r.kind === "cancel_duplicate")!;
    expect(dup.id).toBe("dup_z");
  });

  it("unused seats are a direct saving, and alternatives on the same subscription are not summed", () => {
    const p: BusinessProfile = {
      ...emptyProfile(),
      employees: [emp("a")],
      subscriptions: [{ id: "s", toolId: "slack", name: "Slack", seats: 10, activeSeats: 6, monthlyCostNis: 400, usage: "low" }],
    };
    const r = analyze(p, SEED_TOOLS, NOW);
    expect(r.recommendations.find((x) => x.kind === "reduce_seats")!.benefits.directSavingsNis).toBe(160);
    expect(r.totals.directSavingsNis).toBeLessThanOrEqual(400);
  });
});
