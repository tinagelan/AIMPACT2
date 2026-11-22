import { PrismaClient } from "@prisma/client";
import { SEED_TOOLS } from "../src/catalog/seedTools";

const prisma = new PrismaClient();

async function main() {
  for (const t of SEED_TOOLS) {
    const data = {
      name: t.name,
      primaryCapability: t.primaryCapability,
      capabilitiesJson: JSON.stringify(t.capabilities),
      pricingModel: t.pricingModel,
      usdPerSeatMonth: t.usdPerSeatMonth,
      usdFlatMonth: t.usdFlatMonth ?? null,
      pricingUrl: t.pricingUrl,
      hebrewSupport: t.hebrewSupport,
      isAI: t.isAI,
      automatesJson: JSON.stringify(t.automates),
      setupHours: t.setupHours,
      complexity: t.complexity,
    };
    // Never overwrite verified prices on re-seed.
    await prisma.catalogTool.upsert({ where: { id: t.id }, create: { id: t.id, ...data, lastVerifiedAt: null }, update: {} });
  }
  console.log(`Seeded ${SEED_TOOLS.length} catalog tools`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
