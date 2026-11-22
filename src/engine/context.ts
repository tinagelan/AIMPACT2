import { hourlyEmployerCost, mid, monthlyHours, resolveGross } from "./employerCost";
import { severanceTopUp } from "./severance";
import type {
  BusinessProfile,
  CatalogTool,
  Employee,
  Range,
  Recommendation,
  RoleKey,
  Subscription,
  ToolRef,
  ValueSource,
} from "./types";

export const STALE_AFTER_DAYS = 90;

/** A recommendation before scoring / ROI / counting is applied. */
export type Draft = Omit<
  Recommendation,
  "horizon" | "impactScore" | "effortScore" | "counted" | "roi"
>;

export interface RuleContext {
  profile: BusinessProfile;
  catalog: Map<string, CatalogTool>;
  catalogList: CatalogTool[];
  now: Date;
  hourly(role: RoleKey): { value: number; source: ValueSource };
}

export function buildContext(profile: BusinessProfile, catalog: CatalogTool[], now: Date): RuleContext {
  const cache = new Map<RoleKey, { value: number; source: ValueSource }>();
  return {
    profile,
    catalog: new Map(catalog.map((t) => [t.id, t])),
    catalogList: catalog,
    now,
    hourly(role) {
      let v = cache.get(role);
      if (!v) {
        v = hourlyEmployerCost(role, profile.employees, profile.settings.employerMultiplier);
        cache.set(role, v);
      }
      return v;
    },
  };
}

export function isStale(tool: CatalogTool, now: Date): boolean {
  if (!tool.lastVerifiedAt) return true;
  const ageDays = (now.getTime() - new Date(tool.lastVerifiedAt).getTime()) / 86_400_000;
  return ageDays > STALE_AFTER_DAYS;
}

export function toolRef(tool: CatalogTool, now: Date): ToolRef {
  return {
    toolId: tool.id,
    name: tool.name,
    pricingUrl: tool.pricingUrl,
    lastVerifiedAt: tool.lastVerifiedAt,
    stale: isStale(tool, now),
    isAI: tool.isAI,
  };
}

/** Monthly NIS cost of a catalog tool for a number of seats. */
export function toolMonthlyNis(tool: CatalogTool, seats: number, usdToNis: number): number {
  const usd = tool.usdPerSeatMonth * Math.max(1, seats) + (tool.usdFlatMonth ?? 0);
  return usd * usdToNis;
}

export function subscriptionCapabilities(sub: Subscription, ctx: RuleContext): { primary: string; all: string[]; bundle: boolean } {
  const tool = sub.toolId ? ctx.catalog.get(sub.toolId) : undefined;
  if (tool) return { primary: tool.primaryCapability, all: tool.capabilities, bundle: tool.pricingModel === "bundle" };
  const cat = sub.category || `custom:${sub.name.toLowerCase().trim()}`;
  return { primary: cat, all: [cat], bundle: false };
}

/** Internal hours valued at the admin hourly employer cost (non-cash, but a real transition cost). */
export function internalTimeCost(hours: number, ctx: RuleContext, role: RoleKey = "office_manager"): number {
  const r = ctx.profile.employees.some((e) => e.role === role) ? role : "admin_coordinator";
  return hours * ctx.hourly(r).value;
}

/**
 * Severance exposure if `hoursPerMonth` of a role's work is removed by an FTE / scope
 * reduction. Picks the employee in that role with the lowest tenure (cheapest exit),
 * and scales by the share of their position removed.
 */
export function severanceExposure(role: RoleKey, hoursPerMonth: number, employees: Employee[]): Range | undefined {
  const ofRole = employees
    .filter((e) => e.role === role && e.scopePct > 0)
    .sort((a, b) => (a.tenureYears ?? 0) - (b.tenureYears ?? 0));
  const e = ofRole[0];
  if (!e) return undefined;
  const share = Math.min(1, hoursPerMonth / monthlyHours(e.scopePct));
  const { gross } = resolveGross(e);
  const full = severanceTopUp(e.section14, e.tenureYears, gross);
  return { min: full.min * share, max: full.max * share };
}

export { mid };
