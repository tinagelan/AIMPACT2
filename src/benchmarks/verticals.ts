import type { ProcessKey, RoleKey, Vertical } from "@/engine/types";

/**
 * Vertical templates ("smart benchmarks", PRD §5.1 step 2).
 * For each role, the share of its working time typically spent on each process.
 * The wizard pre-fills bottlenecks from these; the owner confirms or adjusts.
 */
export type TaskSplit = Partial<Record<ProcessKey, number>>;

export interface VerticalTemplate {
  vertical: Vertical;
  roles: RoleKey[];
  taskSplits: Partial<Record<RoleKey, TaskSplit>>;
  /** Share of total team time that is admin work above which we flag overload. */
  adminOverloadThreshold: number;
}

const common: Partial<Record<RoleKey, TaskSplit>> = {
  admin_coordinator: { scheduling: 0.35, data_entry: 0.2, email_triage: 0.15, document_prep: 0.1 },
  office_manager: { invoicing: 0.15, scheduling: 0.15, reporting: 0.1, email_triage: 0.1, data_entry: 0.1 },
  bookkeeper: { invoicing: 0.35, data_entry: 0.3, reporting: 0.15 },
  sales_rep: { lead_followup: 0.25, data_entry: 0.1, document_prep: 0.1, scheduling: 0.05 },
  account_manager: { client_reporting: 0.2, email_triage: 0.15, scheduling: 0.1 },
  customer_service: { customer_inquiries: 0.5, data_entry: 0.15, email_triage: 0.1 },
  operations_coordinator: { order_processing: 0.3, inventory_updates: 0.2, data_entry: 0.15 },
  marketing_specialist: { social_content: 0.3, reporting: 0.15 },
  designer: { timesheets: 0.05 },
  professional: { timesheets: 0.08, document_prep: 0.15, email_triage: 0.1, scheduling: 0.05 },
  agent: { lead_followup: 0.25, scheduling: 0.2, document_prep: 0.1 },
  manager: { reporting: 0.1, email_triage: 0.1 },
};

export const VERTICAL_TEMPLATES: Record<Vertical, VerticalTemplate> = {
  professional_services: {
    vertical: "professional_services",
    roles: ["professional", "admin_coordinator", "office_manager", "bookkeeper", "manager"],
    taskSplits: { ...common },
    adminOverloadThreshold: 0.2,
  },
  agency: {
    vertical: "agency",
    roles: ["account_manager", "designer", "marketing_specialist", "office_manager", "manager"],
    taskSplits: {
      ...common,
      account_manager: { client_reporting: 0.25, email_triage: 0.15, scheduling: 0.1, timesheets: 0.05 },
      designer: { timesheets: 0.05, email_triage: 0.05 },
    },
    adminOverloadThreshold: 0.18,
  },
  distribution: {
    vertical: "distribution",
    roles: ["operations_coordinator", "sales_rep", "customer_service", "bookkeeper", "manager"],
    taskSplits: { ...common },
    adminOverloadThreshold: 0.22,
  },
  real_estate: {
    vertical: "real_estate",
    roles: ["agent", "admin_coordinator", "customer_service", "office_manager", "manager"],
    taskSplits: { ...common },
    adminOverloadThreshold: 0.2,
  },
  other: {
    vertical: "other",
    roles: ["admin_coordinator", "office_manager", "sales_rep", "customer_service", "manager"],
    taskSplits: { ...common },
    adminOverloadThreshold: 0.2,
  },
};

/** Processes considered administrative overhead (for overload detection). */
export const ADMIN_PROCESSES: ProcessKey[] = [
  "scheduling",
  "data_entry",
  "invoicing",
  "reporting",
  "email_triage",
  "timesheets",
  "document_prep",
];

/**
 * Lightweight process changes (no software) and the share of hours they typically
 * remove. Shown as alternatives to buying a tool: "change the workflow first".
 */
export const PROCESS_CHANGES: Partial<Record<ProcessKey, { share: number; complexity: number; key: string }>> = {
  scheduling: { share: 0.25, complexity: 1, key: "booking_windows" },
  email_triage: { share: 0.3, complexity: 1, key: "shared_inbox_rules" },
  data_entry: { share: 0.2, complexity: 2, key: "single_source" },
  document_prep: { share: 0.3, complexity: 1, key: "templates" },
  reporting: { share: 0.3, complexity: 2, key: "standard_kpis" },
  client_reporting: { share: 0.3, complexity: 2, key: "standard_kpis" },
  customer_inquiries: { share: 0.25, complexity: 1, key: "faq_macros" },
  invoicing: { share: 0.2, complexity: 1, key: "batch_billing" },
  timesheets: { share: 0.3, complexity: 1, key: "daily_logging" },
  lead_followup: { share: 0.2, complexity: 2, key: "followup_cadence" },
  order_processing: { share: 0.2, complexity: 2, key: "order_form" },
  inventory_updates: { share: 0.2, complexity: 2, key: "cycle_counts" },
  social_content: { share: 0.25, complexity: 1, key: "content_calendar" },
};
