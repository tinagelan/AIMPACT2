import { VERTICAL_TEMPLATES } from "@/benchmarks/verticals";
import { DEFAULT_EMPLOYER_MULTIPLIER, FULL_TIME_MONTHLY_HOURS, WEEKS_PER_MONTH } from "./employerCost";
import type { Bottleneck, BusinessProfile, Decisions, Employee, ProcessKey, RoleKey, Settings, Vertical } from "./types";

export const DEFAULT_USD_TO_NIS = 3.7;

export function defaultSettings(): Settings {
  return { employerMultiplier: DEFAULT_EMPLOYER_MULTIPLIER, horizonMonths: 12, usdToNis: DEFAULT_USD_TO_NIS };
}

export function emptyDecisions(): Decisions {
  return { fteReductionConfirmed: [], redirectToRevenue: [], excluded: [], toolOverrides: {} };
}

export function emptyProfile(vertical: Vertical = "professional_services"): BusinessProfile {
  return {
    orgName: "",
    vertical,
    employeeCount: 0,
    goal: "",
    employees: [],
    subscriptions: [],
    bottlenecks: [],
    freeTextProvided: false,
    filesUploaded: false,
    settings: defaultSettings(),
    decisions: emptyDecisions(),
  };
}

/**
 * Pre-fill bottlenecks from the vertical template: for every process, sum the
 * benchmark share of time across employees of each role. The owner then confirms
 * or edits — confirmed values switch to hoursSource "user".
 */
export function benchmarkBottlenecks(vertical: Vertical, employees: Employee[]): Bottleneck[] {
  const tpl = VERTICAL_TEMPLATES[vertical] ?? VERTICAL_TEMPLATES.other;
  const acc = new Map<ProcessKey, { hours: number; people: number; role: RoleKey; roleHours: number }>();
  for (const e of employees) {
    const split = tpl.taskSplits[e.role];
    if (!split) continue;
    const weekly = (FULL_TIME_MONTHLY_HOURS * (e.scopePct / 100)) / WEEKS_PER_MONTH;
    for (const [proc, share] of Object.entries(split) as [ProcessKey, number][]) {
      const h = weekly * share;
      const cur = acc.get(proc) ?? { hours: 0, people: 0, role: e.role, roleHours: 0 };
      cur.hours += h;
      cur.people += 1;
      if (h > cur.roleHours) { cur.role = e.role; cur.roleHours = h; }
      acc.set(proc, cur);
    }
  }
  return Array.from(acc.entries())
    .filter(([, v]) => v.hours >= 1)
    .sort((a, b) => b[1].hours - a[1].hours)
    .map(([process, v]) => ({
      id: `bn_${process}`,
      process,
      hoursPerWeek: Math.round(v.hours),
      hoursSource: "benchmark" as const,
      peopleInvolved: v.people,
      role: v.role,
      pain: 3,
    }));
}
