import type { Range, RoleKey } from "@/engine/types";

/**
 * Indicative monthly gross salary ranges (NIS, full-time) for Israeli SMB roles.
 * Used ONLY when the owner gives no salary or range; always labeled "benchmark"
 * in the report, which lowers the confidence score.
 * Review and update these quarterly together with the catalog.
 */
export const BENCHMARK_GROSS_SALARY: Record<RoleKey, Range> = {
  admin_coordinator: { min: 8000, max: 10000 },
  office_manager: { min: 10000, max: 13000 },
  sales_rep: { min: 9000, max: 13000 },
  account_manager: { min: 11000, max: 15000 },
  customer_service: { min: 7500, max: 9500 },
  bookkeeper: { min: 10000, max: 13000 },
  operations_coordinator: { min: 9000, max: 12000 },
  marketing_specialist: { min: 11000, max: 15000 },
  designer: { min: 11000, max: 15000 },
  professional: { min: 15000, max: 22000 },
  agent: { min: 8000, max: 12000 },
  manager: { min: 18000, max: 28000 },
  other: { min: 9000, max: 13000 },
};

export const BENCHMARKS_UPDATED_AT = "2026-11-01";
