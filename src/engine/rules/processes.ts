import { PROCESS_CHANGES } from "@/benchmarks/verticals";
import { emptyBenefits, pnl, revenueFromRedirectedHours } from "../benefits";
import { WEEKS_PER_MONTH } from "../employerCost";
import {
  internalTimeCost,
  severanceExposure,
  toolMonthlyNis,
  toolRef,
  type Draft,
  type RuleContext,
} from "../context";
import type { Bottleneck, CatalogTool, ConfidenceLevel, ProcessKey } from "../types";

export interface ToolChoice {
  tool: CatalogTool;
  share: number;
  monthlyNis: number;
  owned: boolean;
}

/** All catalog tools that automate a process, best first. Tools already paid for come first. */
export function toolOptionsFor(process: ProcessKey, seats: number, ctx: RuleContext): ToolChoice[] {
  const owned = new Set(ctx.profile.subscriptions.map((s) => s.toolId).filter(Boolean));
  const hours = 1; // relative ranking only
  return ctx.catalogList
    .filter((t) => (t.automates[process] ?? 0) > 0)
    .map((t) => {
      const isOwned = owned.has(t.id);
      return {
        tool: t,
        share: t.automates[process] ?? 0,
        monthlyNis: isOwned ? 0 : toolMonthlyNis(t, seats, ctx.profile.settings.usdToNis),
        owned: isOwned,
      };
    })
    .sort((a, b) => {
      if (a.owned !== b.owned) return a.owned ? -1 : 1;
      // value per month: hours saved valued at a nominal 100 NIS/h minus cost, penalise complexity
      const va = a.share * hours * 1000 - a.monthlyNis - a.tool.complexity * 20;
      const vb = b.share * hours * 1000 - b.monthlyNis - b.tool.complexity * 20;
      return vb - va;
    });
}

export function chooseTool(process: ProcessKey, seats: number, ctx: RuleContext, overrideId?: string): ToolChoice | undefined {
  const options = toolOptionsFor(process, seats, ctx);
  if (overrideId) {
    const o = options.find((c) => c.tool.id === overrideId);
    if (o) return o;
  }
  return options[0];
}

function levelFrom(sources: string[]): ConfidenceLevel {
  const bench = sources.filter((s) => s === "benchmark").length;
  if (bench === 0) return sources.includes("range") ? "medium" : "high";
  return bench >= 2 ? "low" : "medium";
}

/**
 * Manual / repetitive processes → (a) workflow change without software, and
 * (b) automation with a tool. They are alternatives (same group): the engine counts
 * the better one so hours are never double counted.
 */
export function processRules(ctx: RuleContext, skipProcesses: Set<ProcessKey>): Draft[] {
  const out: Draft[] = [];
  const { decisions } = ctx.profile;

  for (const b of ctx.profile.bottlenecks) {
    if (skipProcesses.has(b.process) || b.hoursPerWeek <= 0) continue;
    const monthly = b.hoursPerWeek * WEEKS_PER_MONTH;
    const hourly = ctx.hourly(b.role);
    const group = `proc:${b.id}`;

    // (a) Process change first — no technology needed.
    const pc = PROCESS_CHANGES[b.process];
    if (pc) {
      const id = `pc_${b.id}`;
      out.push(
        withHourConversion(
          {
            id,
            ruleId: "process_change",
            kind: "process_change",
            title: { key: `pc.${pc.key}.title`, params: { process: b.process } },
            rationale: { key: "rec.process_change.rationale", params: { process: b.process, hours: Math.round(monthly) } },
            benefits: emptyBenefits([{ key: "quality.consistency" }]),
            costs: { oneTimeNis: internalTimeCost(4, ctx), monthlyNis: 0 },
            complexity: pc.complexity + (b.peopleInvolved > 5 ? 1 : 0),
            confidence: levelFrom([b.hoursSource, hourly.source]),
            assumptions: [
              { key: "assume.process_share", params: { pct: Math.round(pc.share * 100) } },
              ...(b.hoursSource === "benchmark" ? [{ key: "assume.benchmark_hours" }] : []),
            ],
            changeManagement: [{ key: "cm.pilot_one_team" }],
            steps: [{ key: `pc.${pc.key}.step1` }, { key: `pc.${pc.key}.step2` }, { key: "step.measure_after_30" }],
            tools: [],
            alternativeGroup: group,
            convertibleHours: true,
            baselineHours: monthly,
          },
          b,
          monthly * pc.share,
          hourly.value,
          ctx,
        ),
      );
    }

    // (b) Automation with a tool.
    const id = `auto_${b.id}`;
    const choice = chooseTool(b.process, b.peopleInvolved, ctx, decisions.toolOverrides[id]);
    if (!choice) continue;
    const saved = monthly * choice.share;
    const t = choice.tool;
    out.push(
      withHourConversion(
        {
          id,
          ruleId: "manual_process",
          kind: "automate_process",
          title: {
            key: choice.owned ? "rec.automate.owned_title" : "rec.automate.title",
            params: { process: b.process, tool: t.name },
          },
          rationale: { key: "rec.automate.rationale", params: { process: b.process, hours: Math.round(monthly), pct: Math.round(choice.share * 100), tool: t.name } },
          benefits: emptyBenefits([{ key: "quality.fewer_errors" }]),
          costs: {
            oneTimeNis: internalTimeCost(t.setupHours, ctx),
            monthlyNis: choice.monthlyNis,
          },
          complexity: Math.min(5, t.complexity + (b.peopleInvolved > 5 ? 1 : 0)),
          confidence: levelFrom([b.hoursSource, hourly.source]),
          assumptions: [
            { key: "assume.tool_share", params: { pct: Math.round(choice.share * 100), tool: t.name } },
            { key: "assume.setup_hours", params: { hours: t.setupHours } },
            ...(choice.owned ? [{ key: "assume.already_owned", params: { tool: t.name } }] : [{ key: "assume.price_seats", params: { seats: b.peopleInvolved } }]),
            ...(b.hoursSource === "benchmark" ? [{ key: "assume.benchmark_hours" }] : []),
          ],
          changeManagement: [
            { key: "cm.training", params: { hours: Math.max(1, Math.round(t.setupHours / 4)) } },
            { key: "cm.champion" },
          ],
          steps: [
            { key: "step.trial", params: { tool: t.name } },
            { key: "step.configure", params: { process: b.process } },
            { key: "step.train_team" },
            { key: "step.measure_after_30" },
          ],
          tools: [toolRef(t, ctx.now)],
          toolOptions: toolOptionsFor(b.process, b.peopleInvolved, ctx).map((c) => c.tool.id),
          alternativeGroup: group,
          convertibleHours: true,
          baselineHours: monthly,
        },
        b,
        saved,
        hourly.value,
        ctx,
      ),
    );
  }
  return out;
}

/**
 * Applies the iron rule: hours become money ONLY if the owner confirmed an FTE
 * reduction (P&L saving, with severance as a transition cost) or redirected the
 * hours to revenue work with a known value per hour.
 */
function withHourConversion(d: Draft, b: Bottleneck, savedHours: number, hourly: number, ctx: RuleContext): Draft {
  const { decisions, settings, employees } = ctx.profile;
  d.benefits.timeSavedHours = savedHours;
  if (decisions.fteReductionConfirmed.includes(d.id)) {
    d.benefits.directSavingsNis = pnl.fromConfirmedFteReduction(savedHours, hourly, { confirmed: true });
    const sev = severanceExposure(b.role, savedHours, employees);
    if (sev) {
      d.severanceExposure = sev;
      d.costs.oneTimeNis += sev.max; // conservative: assume the upper bound
      d.assumptions.push({ key: "assume.severance_upper", params: { amount: Math.round(sev.max) } });
    }
    d.assumptions.push({ key: "assume.fte_confirmed" });
  } else if (decisions.redirectToRevenue.includes(d.id)) {
    d.benefits.revenueImprovementNis = revenueFromRedirectedHours(savedHours, settings.revenuePerHourNis, true);
    d.assumptions.push(
      settings.revenuePerHourNis
        ? { key: "assume.revenue_per_hour", params: { value: settings.revenuePerHourNis } }
        : { key: "assume.revenue_unknown" },
    );
  } else {
    d.assumptions.push({ key: "assume.time_not_money" });
  }
  return d;
}
