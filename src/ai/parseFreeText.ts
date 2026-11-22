import "server-only";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod/v4";
import { SEED_TOOLS, CAPABILITY_KEYS } from "@/catalog/seedTools";
import type { Bottleneck, Employee, Subscription } from "@/engine/types";
import { PROCESS_KEYS, ROLE_KEYS } from "@/lib/profileSchema";
import { anthropic, baseRequest } from "./client";

const Extraction = z.object({
  bottlenecks: z.array(
    z.object({
      process: z.enum(PROCESS_KEYS),
      role: z.enum(ROLE_KEYS),
      hours_per_week: z.number().nullable().describe("Only if the text states it; otherwise null"),
      people_involved: z.number().nullable(),
    }),
  ),
  subscriptions: z.array(
    z.object({
      catalog_id: z.string().nullable().describe("Matching catalog id, or null if not in the catalog"),
      name: z.string(),
      category: z.string().nullable(),
      monthly_cost_nis: z.number().nullable().describe("Only if the text states it; otherwise null"),
      seats: z.number().nullable(),
    }),
  ),
  roles: z.array(z.object({ role: z.enum(ROLE_KEYS), title: z.string().nullable(), count: z.number() })),
});

const SYSTEM = `You extract structured facts from an Israeli small-business owner's description of their business, for an efficiency-diagnosis questionnaire. The text may be in Hebrew or English.

Rules:
- Extract only what the text says. Never estimate or invent a number: if hours, costs, seats or headcounts are not stated, return null.
- Map processes to the allowed process keys and roles to the allowed role keys; skip anything that does not fit.
- For software, set catalog_id when the tool clearly matches one in this catalog (id: name): ${SEED_TOOLS.map((t) => `${t.id}: ${t.name}`).join("; ")}.
- For software not in the catalog, set category to one of: ${CAPABILITY_KEYS.join(", ")}; or null.
- Only list software and digital services, not human service providers (accountants, lawyers, logistics firms).`;

const uid = () => Math.random().toString(36).slice(2, 10);

export async function parseFreeText(text: string): Promise<{ bottlenecks: Bottleneck[]; subscriptions: Subscription[]; employees: Employee[] }> {
  const response = await anthropic().beta.messages.parse({
    ...baseRequest(),
    output_config: { effort: "low", format: betaZodOutputFormat(Extraction) },
    system: SYSTEM,
    messages: [{ role: "user", content: text }],
  });
  if (response.stop_reason === "refusal") throw new Error("refused");
  const out = response.parsed_output;
  if (!out) throw new Error("unparseable");

  const valid = new Set(SEED_TOOLS.map((t) => t.id));
  return {
    bottlenecks: out.bottlenecks.map((b) => ({
      id: uid(),
      process: b.process,
      role: b.role,
      hoursPerWeek: Math.max(0, b.hours_per_week ?? 0),
      // Hours the owner actually stated count as user data; missing hours must be confirmed.
      hoursSource: b.hours_per_week ? "user" : "benchmark",
      peopleInvolved: Math.max(1, Math.round(b.people_involved ?? 1)),
      pain: 3,
    })),
    subscriptions: out.subscriptions.map((s) => {
      const toolId = s.catalog_id && valid.has(s.catalog_id) ? s.catalog_id : undefined;
      return {
        id: uid(),
        toolId,
        name: toolId ? SEED_TOOLS.find((t) => t.id === toolId)!.name : s.name.slice(0, 80),
        category: toolId ? undefined : s.category && CAPABILITY_KEYS.includes(s.category) ? s.category : undefined,
        seats: Math.max(1, Math.round(s.seats ?? 1)),
        monthlyCostNis: Math.max(0, s.monthly_cost_nis ?? 0),
        usage: "unknown",
      };
    }),
    // Salaries are never extracted or sent; Section 14 stays unknown until the owner answers.
    employees: out.roles.flatMap((r) =>
      Array.from({ length: Math.min(30, Math.max(1, Math.round(r.count))) }, () => ({
        id: uid(),
        role: r.role,
        title: r.title?.slice(0, 80) ?? undefined,
        scopePct: 100,
        salary: {},
        section14: "unknown" as const,
      })),
    ),
  };
}
