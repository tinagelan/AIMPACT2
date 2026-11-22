import { BENCHMARK_GROSS_SALARY } from "@/benchmarks/salaries";
import type { Employee, Range, ValueSource } from "./types";

/** Statutory full-time monthly hours in Israel (42h/week). */
export const FULL_TIME_MONTHLY_HOURS = 182;
export const WEEKS_PER_MONTH = 4.33;

export const DEFAULT_EMPLOYER_MULTIPLIER = 0.28;
export const MIN_EMPLOYER_MULTIPLIER = 0.25;
export const MAX_EMPLOYER_MULTIPLIER = 0.3;

export function clampMultiplier(m: number): number {
  if (!Number.isFinite(m)) return DEFAULT_EMPLOYER_MULTIPLIER;
  return Math.min(MAX_EMPLOYER_MULTIPLIER, Math.max(MIN_EMPLOYER_MULTIPLIER, m));
}

/**
 * "Gross-to-gross": gross salary plus employer pension, keren hishtalmut,
 * National Insurance and benefits.
 */
export function employerCost(gross: number, multiplier = DEFAULT_EMPLOYER_MULTIPLIER): number {
  return gross * (1 + clampMultiplier(multiplier));
}

export function employerCostRange(gross: Range, multiplier = DEFAULT_EMPLOYER_MULTIPLIER): Range {
  return { min: employerCost(gross.min, multiplier), max: employerCost(gross.max, multiplier) };
}

/** Resolve an employee's monthly gross as a range plus where it came from. */
export function resolveGross(e: Employee): { gross: Range; source: ValueSource } {
  if (typeof e.salary.exact === "number" && e.salary.exact > 0) {
    return { gross: { min: e.salary.exact, max: e.salary.exact }, source: "user" };
  }
  if (e.salary.range && e.salary.range.max > 0) {
    const min = Math.min(e.salary.range.min, e.salary.range.max);
    const max = Math.max(e.salary.range.min, e.salary.range.max);
    return { gross: { min, max }, source: "range" };
  }
  const b = BENCHMARK_GROSS_SALARY[e.role] ?? BENCHMARK_GROSS_SALARY.other;
  const scale = (e.scopePct || 100) / 100;
  return { gross: { min: b.min * scale, max: b.max * scale }, source: "benchmark" };
}

export function mid(r: Range): number {
  return (r.min + r.max) / 2;
}

export function monthlyHours(scopePct: number): number {
  return (FULL_TIME_MONTHLY_HOURS * Math.max(0, Math.min(100, scopePct))) / 100;
}

/** Average employer cost per working hour for a role (falls back to benchmark). */
export function hourlyEmployerCost(
  role: Employee["role"],
  employees: Employee[],
  multiplier: number,
): { value: number; source: ValueSource } {
  const ofRole = employees.filter((e) => e.role === role && e.scopePct > 0);
  if (ofRole.length > 0) {
    let cost = 0;
    let hours = 0;
    let worst: ValueSource = "user";
    for (const e of ofRole) {
      const { gross, source } = resolveGross(e);
      cost += employerCost(mid(gross), multiplier);
      hours += monthlyHours(e.scopePct);
      if (rank(source) > rank(worst)) worst = source;
    }
    return { value: hours > 0 ? cost / hours : 0, source: worst };
  }
  const b = BENCHMARK_GROSS_SALARY[role] ?? BENCHMARK_GROSS_SALARY.other;
  return { value: employerCost(mid(b), multiplier) / FULL_TIME_MONTHLY_HOURS, source: "benchmark" };
}

function rank(s: ValueSource): number {
  return { user: 0, range: 1, benchmark: 2, missing: 3 }[s];
}
