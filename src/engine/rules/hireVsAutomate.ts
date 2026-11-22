import { emptyBenefits } from "../benefits";
import { employerCost, WEEKS_PER_MONTH } from "../employerCost";
import { internalTimeCost, toolRef, type Draft, type RuleContext } from "../context";
import type { ProcessKey } from "../types";
import { chooseTool } from "./processes";

/** Coverage at which the planned hire can be avoided entirely. */
export const FULL_AVOID_COVERAGE = 0.8;
/** Below this coverage the hire is justified and no alternative is proposed. */
export const MIN_PARTIAL_COVERAGE = 0.3;

/**
 * Hire vs. automate (PRD scenario 1). The benefit is COST AVOIDANCE — the employer
 * cost of a hire that does not need to happen — and is kept separate from P&L
 * savings (nothing that exists today is cut).
 * Returns the draft plus the processes it covers, so the per-process recommendations
 * for those processes are not counted twice.
 */
export function hireVsAutomateRule(ctx: RuleContext): { drafts: Draft[]; covered: Set<ProcessKey> } {
  const hire = ctx.profile.plannedHire;
  const covered = new Set<ProcessKey>();
  if (!hire || hire.grossSalary <= 0 || hire.hoursPerWeekNeeded <= 0) return { drafts: [], covered };

  const { settings, decisions, bottlenecks } = ctx.profile;
  const id = "hire_alt";
  const relevant = bottlenecks.filter((b) =>
    hire.processes.length > 0 ? hire.processes.includes(b.process) : b.role === hire.role,
  );

  let automatableMonthly = 0;
  let monthlyToolCost = 0;
  let setupCost = 0;
  let complexity = 1;
  const tools = new Map<string, ReturnType<typeof toolRef>>();
  for (const b of relevant) {
    const choice = chooseTool(b.process, Math.max(1, b.peopleInvolved), ctx, decisions.toolOverrides[`auto_${b.id}`]);
    if (!choice) continue;
    automatableMonthly += b.hoursPerWeek * WEEKS_PER_MONTH * choice.share;
    if (!tools.has(choice.tool.id)) {
      tools.set(choice.tool.id, toolRef(choice.tool, ctx.now));
      monthlyToolCost += choice.monthlyNis;
      setupCost += internalTimeCost(choice.tool.setupHours, ctx);
      complexity = Math.max(complexity, choice.tool.complexity);
    }
    covered.add(b.process);
  }

  const neededMonthly = hire.hoursPerWeekNeeded * WEEKS_PER_MONTH;
  const coverage = Math.min(1, automatableMonthly / neededMonthly);
  if (coverage < MIN_PARTIAL_COVERAGE) return { drafts: [], covered: new Set() };

  const hireCost = employerCost(hire.grossSalary, settings.employerMultiplier);
  const full = coverage >= FULL_AVOID_COVERAGE;
  const avoidedShare = full ? 1 : coverage;
  const avoided = Math.max(0, hireCost * avoidedShare - monthlyToolCost);

  const benefits = emptyBenefits([{ key: "quality.less_onboarding" }]);
  benefits.avoidedCostNis = avoided;

  return {
    covered,
    drafts: [
      {
        id,
        ruleId: "hire_vs_automate",
        kind: "hire_vs_automate",
        title: { key: full ? "rec.hire.avoid_title" : "rec.hire.partial_title", params: { pct: Math.round((1 - coverage) * hire.scopePct) } },
        rationale: {
          key: "rec.hire.rationale",
          params: {
            needed: Math.round(hire.hoursPerWeekNeeded),
            automatable: Math.round(automatableMonthly / WEEKS_PER_MONTH),
            hireCost: Math.round(hireCost),
            toolCost: Math.round(monthlyToolCost),
          },
        },
        benefits,
        // Tool costs are already netted inside avoidedCostNis; listed for transparency only.
        costs: { oneTimeNis: setupCost, monthlyNis: 0 },
        complexity,
        confidence: relevant.every((b) => b.hoursSource === "user") ? "medium" : "low",
        assumptions: [
          { key: "assume.hire_employer_cost", params: { gross: hire.grossSalary, pct: Math.round(settings.employerMultiplier * 100) } },
          { key: "assume.tool_cost_netted", params: { cost: Math.round(monthlyToolCost) } },
          { key: "assume.cost_avoidance_not_pnl" },
          { key: "assume.hire_severance_future" },
        ],
        changeManagement: [{ key: "cm.workload_review" }, { key: "cm.champion" }],
        steps: [
          { key: "step.pilot_before_hiring", params: { weeks: 4 } },
          ...Array.from(tools.values()).map((t) => ({ key: "step.trial", params: { tool: t.name } })),
          { key: "step.reassess_hire" },
        ],
        tools: Array.from(tools.values()),
        convertibleHours: false,
      },
    ],
  };
}
