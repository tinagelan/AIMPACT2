import "server-only";
import { analyze } from "@/engine/analyze";
import { loadCatalog } from "@/catalog/repository";
import { redactForTier, type Tier } from "@/paywall/redact";
import { currentUser } from "./auth";
import { db } from "./db";
import { parseProfile } from "./profileSchema";

/** Loads a diagnosis only if it belongs to the signed-in user. */
export async function getOwnedDiagnosis(id: string) {
  const user = await currentUser();
  if (!user) return null;
  const d = await db.diagnosis.findUnique({ where: { id }, include: { org: true } });
  if (!d || d.org.ownerId !== user.id) return null;
  return { user, diagnosis: d, profile: parseProfile(d.profileJson) };
}

/** Runs the engine on the stored profile and returns the tier-appropriate view. */
export async function buildReport(id: string) {
  const owned = await getOwnedDiagnosis(id);
  if (!owned) return null;
  const catalog = await loadCatalog();
  const report = analyze(owned.profile, catalog);
  const tier = owned.diagnosis.tier as Tier;
  return { ...owned, catalog, report, view: redactForTier(report, tier), tier };
}
