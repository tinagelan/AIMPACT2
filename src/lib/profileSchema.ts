import { z } from "zod";
import type { BusinessProfile } from "@/engine/types";

export const ROLE_KEYS = [
  "admin_coordinator", "office_manager", "sales_rep", "account_manager", "customer_service", "bookkeeper",
  "operations_coordinator", "marketing_specialist", "designer", "professional", "agent", "manager", "other",
] as const;

export const PROCESS_KEYS = [
  "scheduling", "data_entry", "invoicing", "reporting", "lead_followup", "customer_inquiries", "document_prep",
  "order_processing", "inventory_updates", "timesheets", "social_content", "client_reporting", "email_triage",
] as const;

export const VERTICALS = ["professional_services", "agency", "distribution", "real_estate", "other"] as const;

const money = z.number().finite().min(0).max(10_000_000);
const range = z.object({ min: money, max: money });

export const employeeSchema = z.object({
  id: z.string().min(1).max(64),
  role: z.enum(ROLE_KEYS),
  title: z.string().max(80).optional(),
  scopePct: z.number().min(0).max(100),
  salary: z.object({ exact: money.optional(), range: range.optional() }),
  tenureYears: z.number().min(0).max(60).optional(),
  section14: z.enum(["yes", "no", "unknown"]),
  revenueFacing: z.boolean().optional(),
});

export const subscriptionSchema = z.object({
  id: z.string().min(1).max(64),
  toolId: z.string().max(64).optional(),
  name: z.string().min(1).max(80),
  category: z.string().max(40).optional(),
  seats: z.number().int().min(0).max(10_000),
  activeSeats: z.number().int().min(0).max(10_000).optional(),
  monthlyCostNis: money,
  usage: z.enum(["high", "medium", "low", "unknown"]),
});

export const bottleneckSchema = z.object({
  id: z.string().min(1).max(64),
  process: z.enum(PROCESS_KEYS),
  hoursPerWeek: z.number().min(0).max(2000),
  hoursSource: z.enum(["user", "benchmark"]),
  peopleInvolved: z.number().int().min(1).max(1000),
  role: z.enum(ROLE_KEYS),
  pain: z.number().int().min(1).max(5),
});

export const profileSchema = z.object({
  orgName: z.string().max(120),
  vertical: z.enum(VERTICALS),
  employeeCount: z.number().int().min(0).max(10_000),
  goal: z.string().max(500),
  employees: z.array(employeeSchema).max(500),
  subscriptions: z.array(subscriptionSchema).max(200),
  bottlenecks: z.array(bottleneckSchema).max(100),
  plannedHire: z
    .object({
      role: z.enum(ROLE_KEYS),
      grossSalary: money,
      scopePct: z.number().min(1).max(100),
      hoursPerWeekNeeded: z.number().min(0).max(100),
      processes: z.array(z.enum(PROCESS_KEYS)).max(20),
    })
    .optional(),
  freeTextProvided: z.boolean(),
  filesUploaded: z.boolean(),
  settings: z.object({
    employerMultiplier: z.number().min(0.25).max(0.3),
    horizonMonths: z.union([z.literal(12), z.literal(24), z.literal(36)]),
    usdToNis: z.number().min(1).max(10),
    revenuePerHourNis: money.optional(),
  }),
  decisions: z.object({
    fteReductionConfirmed: z.array(z.string().max(80)).max(200),
    redirectToRevenue: z.array(z.string().max(80)).max(200),
    excluded: z.array(z.string().max(80)).max(200),
    toolOverrides: z.record(z.string().max(80), z.string().max(64)),
  }),
});

export function parseProfile(json: string): BusinessProfile {
  return profileSchema.parse(JSON.parse(json)) as BusinessProfile;
}
