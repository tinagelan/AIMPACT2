import "server-only";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod/v4";
import { anthropic, baseRequest } from "@/ai/client";

const Extracted = z.object({
  found: z.boolean().describe("false if the page does not show a usable price for the plan"),
  usd_per_seat_month: z.number().nullable(),
  usd_flat_month: z.number().nullable(),
  evidence: z.string().describe("Short verbatim quote from the page that shows the price (max 200 chars)"),
});

/**
 * Fetches a vendor's official pricing page and asks Claude to read the entry-level
 * business plan price. The result is only a PROPOSAL: an admin must approve it
 * before the catalog changes (PRD §6.2).
 */
export async function proposePrice(tool: { name: string; pricingUrl: string; usdPerSeatMonth: number; usdFlatMonth: number | null }) {
  const res = await fetch(tool.pricingUrl, {
    headers: { "user-agent": "Mozilla/5.0 (compatible; pricing-check)" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`fetch_${res.status}`);
  const html = await res.text();
  const text = html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 60000);

  const response = await anthropic().beta.messages.parse({
    ...baseRequest(),
    output_config: { effort: "low", format: betaZodOutputFormat(Extracted) },
    system:
      "You read SaaS pricing pages. Report the monthly USD price of the cheapest paid plan suitable for a small business, billed annually if both are shown. Use per-seat price if priced per user, otherwise a flat monthly price. Only report numbers that appear on the page; if unclear, set found=false.",
    messages: [
      {
        role: "user",
        content: `Tool: ${tool.name}\nCurrent catalog value: $${tool.usdPerSeatMonth}/seat/month${tool.usdFlatMonth ? ` + $${tool.usdFlatMonth}/month flat` : ""}\n\nPage text (from ${tool.pricingUrl}):\n${text}`,
      },
    ],
  });
  const out = response.parsed_output;
  if (response.stop_reason === "refusal" || !out || !out.found) return null;
  return { usdPerSeatMonth: out.usd_per_seat_month, usdFlatMonth: out.usd_flat_month, evidence: out.evidence.slice(0, 300) };
}
