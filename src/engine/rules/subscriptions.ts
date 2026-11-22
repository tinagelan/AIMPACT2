import { emptyBenefits, pnl } from "../benefits";
import { internalTimeCost, subscriptionCapabilities, toolRef, type Draft, type RuleContext } from "../context";
import type { Subscription, UsageLevel } from "../types";

const usageRank: Record<UsageLevel, number> = { low: 0, unknown: 1, medium: 2, high: 3 };

/**
 * Duplicate SaaS detection (PRD scenario 2).
 * Two subscriptions overlap when they share a primary capability, or when one is a
 * bundle (Workspace / M365) that already covers the other's primary capability.
 */
export function duplicateSaasRule(ctx: RuleContext): Draft[] {
  const subs = ctx.profile.subscriptions.filter((s) => s.monthlyCostNis >= 0);
  const out: Draft[] = [];
  const cancelled = new Set<string>();

  for (let i = 0; i < subs.length; i++) {
    for (let j = i + 1; j < subs.length; j++) {
      const a = subs[i];
      const b = subs[j];
      if (cancelled.has(a.id) || cancelled.has(b.id)) continue;
      const ca = subscriptionCapabilities(a, ctx);
      const cb = subscriptionCapabilities(b, ctx);

      let cancel: Subscription | null = null;
      let keep: Subscription | null = null;
      let coveredByBundle = false;

      if (ca.primary === cb.primary) {
        // Same job done twice: cancel the less-used one; on a tie, cancel the cheaper
        // one (less disruption, conservative savings figure).
        const ua = usageRank[a.usage];
        const ub = usageRank[b.usage];
        if (ua !== ub) [cancel, keep] = ua < ub ? [a, b] : [b, a];
        else [cancel, keep] = a.monthlyCostNis <= b.monthlyCostNis ? [a, b] : [b, a];
      } else if (cb.bundle && cb.all.includes(ca.primary) && !ca.bundle) {
        [cancel, keep, coveredByBundle] = [a, b, true];
      } else if (ca.bundle && ca.all.includes(cb.primary) && !cb.bundle) {
        [cancel, keep, coveredByBundle] = [b, a, true];
      }
      if (!cancel || !keep) continue;
      cancelled.add(cancel.id);

      const migrationHours = coveredByBundle ? 3 : 8;
      const tools = [cancel, keep]
        .map((s) => (s.toolId ? ctx.catalog.get(s.toolId) : undefined))
        .filter((t): t is NonNullable<typeof t> => !!t)
        .map((t) => toolRef(t, ctx.now));

      out.push({
        id: `dup_${cancel.id}`,
        ruleId: "duplicate_saas",
        kind: "cancel_duplicate",
        title: { key: "rec.cancel_duplicate.title", params: { cancel: cancel.name, keep: keep.name } },
        rationale: {
          key: coveredByBundle ? "rec.cancel_duplicate.bundle" : "rec.cancel_duplicate.same",
          params: { cancel: cancel.name, keep: keep.name, capability: (cancel === a ? ca : cb).primary },
        },
        benefits: {
          ...emptyBenefits([{ key: "quality.fewer_tools" }]),
          directSavingsNis: pnl.fromExpenseReduction(cancel.monthlyCostNis),
        },
        costs: { oneTimeNis: internalTimeCost(migrationHours, ctx), monthlyNis: 0 },
        complexity: coveredByBundle ? 1 : 2,
        confidence: cancel.usage === "unknown" ? "medium" : "high",
        assumptions: [
          { key: "assume.migration_hours", params: { hours: migrationHours } },
          { key: "assume.cost_as_entered", params: { name: cancel.name } },
        ],
        changeManagement: [{ key: "cm.announce_switch", params: { keep: keep.name } }],
        steps: [
          { key: "step.export_data", params: { name: cancel.name } },
          { key: "step.move_to", params: { keep: keep.name } },
          { key: "step.cancel_at_renewal", params: { name: cancel.name } },
        ],
        tools,
        alternativeGroup: `sub:${cancel.id}`,
        convertibleHours: false,
      });
    }
  }
  return out;
}

/** Paid seats that nobody uses. */
export function unusedSeatsRule(ctx: RuleContext): Draft[] {
  const out: Draft[] = [];
  for (const s of ctx.profile.subscriptions) {
    if (s.activeSeats === undefined || s.seats <= 0 || s.activeSeats >= s.seats) continue;
    const unused = s.seats - Math.max(0, s.activeSeats);
    const perSeat = s.monthlyCostNis / s.seats;
    const tool = s.toolId ? ctx.catalog.get(s.toolId) : undefined;
    out.push({
      id: `seats_${s.id}`,
      ruleId: "unused_seats",
      kind: "reduce_seats",
      title: { key: "rec.reduce_seats.title", params: { name: s.name, unused } },
      rationale: { key: "rec.reduce_seats.rationale", params: { seats: s.seats, active: s.activeSeats } },
      benefits: { ...emptyBenefits(), directSavingsNis: pnl.fromExpenseReduction(unused * perSeat) },
      costs: { oneTimeNis: internalTimeCost(1, ctx), monthlyNis: 0 },
      complexity: 1,
      confidence: "high",
      assumptions: [{ key: "assume.per_seat_linear" }],
      changeManagement: [],
      steps: [{ key: "step.remove_seats", params: { name: s.name, unused } }],
      tools: tool ? [toolRef(tool, ctx.now)] : [],
      alternativeGroup: `sub:${s.id}`,
      convertibleHours: false,
    });
  }
  return out;
}

/** Subscriptions the owner reports as barely used. */
export function lowUsageRule(ctx: RuleContext): Draft[] {
  const out: Draft[] = [];
  for (const s of ctx.profile.subscriptions) {
    if (s.usage !== "low" || s.monthlyCostNis <= 0) continue;
    const tool = s.toolId ? ctx.catalog.get(s.toolId) : undefined;
    out.push({
      id: `low_${s.id}`,
      ruleId: "low_usage",
      kind: "review_low_usage",
      title: { key: "rec.review_low_usage.title", params: { name: s.name } },
      rationale: { key: "rec.review_low_usage.rationale", params: { name: s.name } },
      benefits: { ...emptyBenefits(), directSavingsNis: pnl.fromExpenseReduction(s.monthlyCostNis) },
      costs: { oneTimeNis: internalTimeCost(2, ctx), monthlyNis: 0 },
      complexity: 1,
      confidence: "medium",
      assumptions: [{ key: "assume.low_usage_confirm" }],
      changeManagement: [{ key: "cm.ask_users_first" }],
      steps: [
        { key: "step.check_usage", params: { name: s.name } },
        { key: "step.cancel_at_renewal", params: { name: s.name } },
      ],
      tools: tool ? [toolRef(tool, ctx.now)] : [],
      alternativeGroup: `sub:${s.id}`,
      convertibleHours: false,
    });
  }
  return out;
}
