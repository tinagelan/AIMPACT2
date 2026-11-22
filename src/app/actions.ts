"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { analyze, ENGINE_VERSION } from "@/engine/analyze";
import { emptyProfile } from "@/engine/defaults";
import type { BusinessProfile } from "@/engine/types";
import { loadCatalog } from "@/catalog/repository";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOwnedDiagnosis } from "@/lib/diagnosis";
import { track } from "@/lib/events";
import { WELCOME_COOKIE } from "@/lib/welcome";
import { profileSchema, VERTICALS } from "@/lib/profileSchema";
import { paymentProvider, PRICE_NIS } from "@/paywall/payments";

const createSchema = z.object({
  orgName: z.string().min(1).max(120),
  vertical: z.enum(VERTICALS),
  goal: z.string().max(500).default(""),
  locale: z.enum(["he", "en"]),
});

export async function createDiagnosis(formData: FormData) {
  const user = await currentUser();
  const input = createSchema.parse(Object.fromEntries(formData));
  if (!user) redirect(`/${input.locale}/login`);
  const profile: BusinessProfile = { ...emptyProfile(input.vertical), orgName: input.orgName, goal: input.goal };
  // A user with no organization yet is finishing sign-up: their first diagnosis gets a welcome.
  const isFirst = (await db.organization.count({ where: { ownerId: user.id } })) === 0;
  const org = await db.organization.create({ data: { ownerId: user.id, name: input.orgName, vertical: input.vertical } });
  const d = await db.diagnosis.create({ data: { orgId: org.id, profileJson: JSON.stringify(profile) } });
  await track("diagnosis_started", { userId: user.id, diagnosisId: d.id });
  if (isFirst) {
    // Read once by the wizard page; the welcome dialog deletes it, so a refresh doesn't replay it.
    (await cookies()).set(WELCOME_COOKIE, d.id, { path: "/", maxAge: 120, sameSite: "lax" });
  }
  redirect(`/${input.locale}/diagnosis/${d.id}/wizard`);
}

export async function saveProfile(id: string, profile: unknown, step: number): Promise<{ ok: boolean }> {
  const owned = await getOwnedDiagnosis(id);
  if (!owned) return { ok: false };
  const parsed = profileSchema.safeParse(profile);
  if (!parsed.success) {
    console.warn("[saveProfile] invalid profile", parsed.error.issues.slice(0, 3));
    return { ok: false };
  }
  const prevStep = owned.diagnosis.step;
  await db.diagnosis.update({
    where: { id },
    data: { profileJson: JSON.stringify(parsed.data), step: Math.max(prevStep, step) },
  });
  if (step > prevStep) await track("step_completed", { userId: owned.user.id, diagnosisId: id, props: { step: prevStep } });
  return { ok: true };
}

export async function completeDiagnosis(id: string, locale: string) {
  const owned = await getOwnedDiagnosis(id);
  if (!owned) redirect(`/${locale}/login`);
  const catalog = await loadCatalog();
  const report = analyze(owned.profile, catalog);
  const first = owned.diagnosis.status !== "completed";
  await db.$transaction([
    db.diagnosis.update({ where: { id }, data: { status: "completed", completedAt: owned.diagnosis.completedAt ?? new Date() } }),
    db.report.create({
      data: {
        diagnosisId: id,
        engineVersion: ENGINE_VERSION,
        inputJson: owned.diagnosis.profileJson,
        outputJson: JSON.stringify(report),
        confidence: report.confidence.level,
      },
    }),
  ]);
  if (first) {
    const minutes = (Date.now() - owned.diagnosis.startedAt.getTime()) / 60000;
    await track("report_reached", { userId: owned.user.id, diagnosisId: id, props: { minutes } });
  }
  redirect(`/${locale}/diagnosis/${id}/report`);
}

export async function trackUpgradeClick(id: string) {
  const owned = await getOwnedDiagnosis(id);
  if (owned) await track("upgrade_clicked", { userId: owned.user.id, diagnosisId: id });
}

export async function unlockDiagnosis(id: string): Promise<{ ok: boolean }> {
  const owned = await getOwnedDiagnosis(id);
  if (!owned) return { ok: false };
  if (owned.diagnosis.tier === "paid") return { ok: true };
  const provider = paymentProvider();
  const result = await provider.charge({ userId: owned.user.id, diagnosisId: id, amountNis: PRICE_NIS });
  await db.payment.create({
    data: { userId: owned.user.id, diagnosisId: id, provider: provider.name, amountNis: PRICE_NIS, status: result.status },
  });
  if (result.status !== "succeeded") return { ok: false };
  await db.diagnosis.update({ where: { id }, data: { tier: "paid" } });
  await track("upgrade_converted", { userId: owned.user.id, diagnosisId: id, props: { provider: provider.name } });
  return { ok: true };
}

export async function toggleImplemented(id: string, recommendationId: string): Promise<{ implemented: boolean }> {
  const owned = await getOwnedDiagnosis(id);
  if (!owned) return { implemented: false };
  const key = { diagnosisId_recommendationId: { diagnosisId: id, recommendationId } };
  const existing = await db.implementedRecommendation.findUnique({ where: key });
  if (existing) {
    await db.implementedRecommendation.delete({ where: key });
    return { implemented: false };
  }
  await db.implementedRecommendation.create({ data: { diagnosisId: id, recommendationId } });
  await track("recommendation_implemented", { userId: owned.user.id, diagnosisId: id, props: { recommendationId } });
  return { implemented: true };
}

/**
 * Permanently deletes a diagnosis the signed-in user owns, with its saved reports and
 * "implemented" marks (cascade). The organization row goes too once it has no other
 * diagnoses. Payment records are kept on purpose (financial history), and analytics
 * events stay as anonymous counts.
 */
export async function deleteDiagnosis(id: string): Promise<{ ok: boolean }> {
  const owned = await getOwnedDiagnosis(id);
  if (!owned) return { ok: false };
  const orgId = owned.diagnosis.orgId;
  await db.$transaction(async (tx) => {
    await tx.diagnosis.delete({ where: { id } });
    if ((await tx.diagnosis.count({ where: { orgId } })) === 0) await tx.organization.delete({ where: { id: orgId } });
  });
  await track("diagnosis_deleted", { userId: owned.user.id, props: { tier: owned.diagnosis.tier, status: owned.diagnosis.status } });
  revalidatePath("/[locale]/app", "page");
  return { ok: true };
}

/** Simulator: persist decisions + settings (paid tier only). */
export async function saveScenario(id: string, input: { decisions: unknown; settings: unknown; employees: unknown }): Promise<{ ok: boolean }> {
  const owned = await getOwnedDiagnosis(id);
  if (!owned || owned.diagnosis.tier !== "paid") return { ok: false };
  const next = profileSchema.safeParse({ ...owned.profile, decisions: input.decisions, settings: input.settings, employees: input.employees });
  if (!next.success) return { ok: false };
  await db.diagnosis.update({ where: { id }, data: { profileJson: JSON.stringify(next.data) } });
  return { ok: true };
}
