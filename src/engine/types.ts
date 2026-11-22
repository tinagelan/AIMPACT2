/**
 * Core domain types for the diagnostic engine.
 * The engine is pure TypeScript (no I/O) so it runs on the server for reports
 * and in the browser for the live ROI simulator.
 */

export type Vertical =
  | "professional_services"
  | "agency"
  | "distribution"
  | "real_estate"
  | "other";

export type Section14 = "yes" | "no" | "unknown";

export interface Range {
  min: number;
  max: number;
}

/** How a value was obtained — drives the confidence score. */
export type ValueSource = "user" | "range" | "benchmark" | "missing";

export type RoleKey =
  | "admin_coordinator"
  | "office_manager"
  | "sales_rep"
  | "account_manager"
  | "customer_service"
  | "bookkeeper"
  | "operations_coordinator"
  | "marketing_specialist"
  | "designer"
  | "professional"
  | "agent"
  | "manager"
  | "other";

export type ProcessKey =
  | "scheduling"
  | "data_entry"
  | "invoicing"
  | "reporting"
  | "lead_followup"
  | "customer_inquiries"
  | "document_prep"
  | "order_processing"
  | "inventory_updates"
  | "timesheets"
  | "social_content"
  | "client_reporting"
  | "email_triage";

export interface SalaryInput {
  /** Monthly gross salary in NIS, when known exactly. */
  exact?: number;
  /** Monthly gross salary range in NIS, when the owner prefers not to share exact numbers. */
  range?: Range;
}

export interface Employee {
  id: string;
  role: RoleKey;
  title?: string;
  /** Job scope, 0–100 (% of a full-time position). */
  scopePct: number;
  salary: SalaryInput;
  tenureYears?: number;
  section14: Section14;
  /** Sales / service role whose freed hours can turn into revenue capacity. */
  revenueFacing?: boolean;
}

export type UsageLevel = "high" | "medium" | "low" | "unknown";

export interface Subscription {
  id: string;
  /** Catalog tool id, if the tool is in the catalog. */
  toolId?: string;
  name: string;
  /** Capability tag when the tool is not in the catalog (e.g. "crm"). */
  category?: string;
  seats: number;
  /** Seats actually in use, if known. */
  activeSeats?: number;
  monthlyCostNis: number;
  usage: UsageLevel;
}

export interface Bottleneck {
  id: string;
  process: ProcessKey;
  /** Total team hours per week spent on this process. */
  hoursPerWeek: number;
  hoursSource: "user" | "benchmark";
  peopleInvolved: number;
  /** Role that mostly performs the process (for hourly cost). */
  role: RoleKey;
  /** 1–5 pain level reported by the owner. */
  pain: number;
}

export interface PlannedHire {
  role: RoleKey;
  /** Expected monthly gross salary in NIS. */
  grossSalary: number;
  scopePct: number;
  /** Hours of work per week the hire is meant to absorb. */
  hoursPerWeekNeeded: number;
  /** Processes the hire would mostly handle. */
  processes: ProcessKey[];
}

/** Choices the owner makes (in the wizard or the simulator). */
export interface Decisions {
  /** Recommendation ids for which the owner confirms an actual FTE / scope reduction. */
  fteReductionConfirmed: string[];
  /** Recommendation ids whose freed hours are explicitly redirected to revenue work. */
  redirectToRevenue: string[];
  /** Recommendation ids the owner excluded from the plan in the simulator. */
  excluded: string[];
  /** Tool swaps chosen in the simulator: recommendation id -> catalog tool id. */
  toolOverrides: Record<string, string>;
}

export interface Settings {
  /** Employer cost multiplier on gross salary (0.25–0.30). */
  employerMultiplier: number;
  horizonMonths: 12 | 24 | 36;
  /** NIS per USD, used for catalog prices quoted in USD. */
  usdToNis: number;
  /** Revenue (NIS) generated per freed hour of revenue-facing staff. Undefined = unknown. */
  revenuePerHourNis?: number;
}

export interface BusinessProfile {
  orgName: string;
  vertical: Vertical;
  employeeCount: number;
  goal: string;
  employees: Employee[];
  subscriptions: Subscription[];
  bottlenecks: Bottleneck[];
  plannedHire?: PlannedHire;
  freeTextProvided: boolean;
  filesUploaded: boolean;
  settings: Settings;
  decisions: Decisions;
}

/* ---------------- Catalog ---------------- */

export type PricingModel = "free" | "freemium" | "saas" | "api" | "bundle";

export interface CatalogTool {
  id: string;
  name: string;
  /** Main thing the tool does — used for duplicate detection. */
  primaryCapability: string;
  /** Everything the tool covers (bundles cover several capabilities). */
  capabilities: string[];
  pricingModel: PricingModel;
  /** Indicative price per seat per month in USD (0 for free tiers). */
  usdPerSeatMonth: number;
  /** Flat monthly price in USD (for tools not priced per seat). */
  usdFlatMonth?: number;
  pricingUrl: string;
  /** ISO date of the last price verification, or null if never verified. */
  lastVerifiedAt: string | null;
  hebrewSupport: boolean;
  isAI: boolean;
  /** Processes the tool automates and the share (0–1) of hours it typically removes. */
  automates: Partial<Record<ProcessKey, number>>;
  /** One-time setup effort, in hours of internal work. */
  setupHours: number;
  /** 1 (trivial) – 5 (major change). */
  complexity: number;
}

/* ---------------- Outputs ---------------- */

/** A translatable message: the UI resolves `key` with `params`. */
export interface Msg {
  key: string;
  params?: Record<string, string | number>;
}

declare const pnlBrand: unique symbol;
/**
 * Money that actually leaves the P&L. Can ONLY be created via `pnl.*` helpers
 * in benefits.ts — this enforces the PRD "iron rule" at the type level.
 */
export type PnLSaving = number & { readonly [pnlBrand]: true };

export interface Benefits {
  /** Monthly NIS reduction in actual expenses (P&L). */
  directSavingsNis: PnLSaving;
  /** Monthly NIS of a planned cost that no longer needs to be incurred (e.g. a hire). Not a P&L reduction. */
  avoidedCostNis: number;
  /** Monthly hours freed. Never money on its own. */
  timeSavedHours: number;
  /** Monthly NIS of extra revenue capacity — only when hours are redirected AND a value per hour is known. */
  revenueImprovementNis: number;
  /** Qualitative improvements, never converted to money. */
  quality: Msg[];
}

export interface Costs {
  oneTimeNis: number;
  monthlyNis: number;
}

export type Horizon = "quick_win" | "medium_term" | "long_term";
export type ConfidenceLevel = "high" | "medium" | "low";

export interface ToolRef {
  toolId: string;
  name: string;
  pricingUrl: string;
  lastVerifiedAt: string | null;
  stale: boolean;
  isAI: boolean;
}

export type RecommendationKind =
  | "cancel_duplicate"
  | "reduce_seats"
  | "review_low_usage"
  | "automate_process"
  | "process_change"
  | "hire_vs_automate";

export interface Recommendation {
  id: string;
  ruleId: string;
  kind: RecommendationKind;
  title: Msg;
  rationale: Msg;
  benefits: Benefits;
  costs: Costs;
  /** 1–5 implementation complexity (training, team alignment). */
  complexity: number;
  horizon: Horizon;
  impactScore: number;
  effortScore: number;
  confidence: ConfidenceLevel;
  assumptions: Msg[];
  changeManagement: Msg[];
  steps: Msg[];
  tools: ToolRef[];
  /** Catalog tool ids that could replace the suggested tool (for the simulator's swap control). */
  toolOptions?: string[];
  /** Monthly hours of the process this recommendation targets (before savings). */
  baselineHours?: number;
  /** Recommendations in the same group are alternatives — only the best one counts in totals. */
  alternativeGroup?: string;
  /** Whether this recommendation counts toward the totals (best of its group, not excluded). */
  counted: boolean;
  /** Possible FTE reduction / revenue redirect toggles are meaningful for this recommendation. */
  convertibleHours: boolean;
  /** Severance exposure if FTE reduction is confirmed (one-time, NIS range). */
  severanceExposure?: Range;
  roi: RoiResult;
}

export interface RoiResult {
  /** Monthly financial benefit (direct + avoided + revenue). */
  monthlyFinancialBenefit: number;
  netMonthly: number;
  /** ROI % over the horizon, or null when there are no costs (nothing to return on). */
  roiPct: number | null;
  /** Months to break even; 0 = immediate; null = does not pay back financially. */
  breakEvenMonths: number | null;
  cumulativeBenefit: number;
  cumulativeCost: number;
}

export interface EmployeeCostLine {
  employeeId: string;
  role: RoleKey;
  title?: string;
  gross: Range;
  employerCost: Range;
  severanceTopUp: Range;
  section14: Section14;
  salarySource: ValueSource;
}

export interface ConfidenceResult {
  level: ConfidenceLevel;
  score: number;
  improvements: Msg[];
}

export interface BottleneckInsight {
  process: ProcessKey;
  hoursPerMonth: number;
  hoursSource: "user" | "benchmark";
  pain: number;
}

export interface Report {
  engineVersion: string;
  generatedAt: string;
  confidence: ConfidenceResult;
  recommendations: Recommendation[];
  totals: {
    directSavingsNis: number;
    avoidedCostNis: number;
    timeSavedHours: number;
    revenueImprovementNis: number;
    oneTimeNis: number;
    monthlyCostNis: number;
    roi: RoiResult;
  };
  bottleneckMap: BottleneckInsight[];
  payroll: {
    lines: EmployeeCostLine[];
    totalEmployerCost: Range;
    totalSoftwareNis: number;
  };
  /** Free-tier "general directions" (no money figures). */
  directions: Msg[];
  /** Clarifying questions the engine needs answered to be more precise. */
  openQuestions: OpenQuestion[];
}

export interface OpenQuestion {
  id: string;
  field: string;
  message: Msg;
}
