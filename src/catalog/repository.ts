import "server-only";
import type { CatalogTool as DbTool } from "@prisma/client";
import { db } from "@/lib/db";
import type { CatalogTool } from "@/engine/types";

export function fromDb(t: DbTool): CatalogTool {
  return {
    id: t.id,
    name: t.name,
    primaryCapability: t.primaryCapability,
    capabilities: JSON.parse(t.capabilitiesJson),
    pricingModel: t.pricingModel as CatalogTool["pricingModel"],
    usdPerSeatMonth: t.usdPerSeatMonth,
    usdFlatMonth: t.usdFlatMonth ?? undefined,
    pricingUrl: t.pricingUrl,
    lastVerifiedAt: t.lastVerifiedAt ? t.lastVerifiedAt.toISOString() : null,
    hebrewSupport: t.hebrewSupport,
    isAI: t.isAI,
    automates: JSON.parse(t.automatesJson),
    setupHours: t.setupHours,
    complexity: t.complexity,
  };
}

export async function loadCatalog(): Promise<CatalogTool[]> {
  const rows = await db.catalogTool.findMany({ orderBy: { name: "asc" } });
  return rows.map(fromDb);
}
