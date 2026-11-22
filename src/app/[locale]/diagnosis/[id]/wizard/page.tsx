import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { loadCatalog } from "@/catalog/repository";
import { getOwnedDiagnosis } from "@/lib/diagnosis";
import { aiEnabled } from "@/ai/client";
import { Wizard } from "./Wizard";

export default async function WizardPage({ params, searchParams }: { params: Promise<{ locale: string; id: string }>; searchParams: Promise<{ step?: string }> }) {
  const { locale, id } = await params;
  const { step } = await searchParams;
  setRequestLocale(locale);
  const owned = await getOwnedDiagnosis(id);
  if (!owned) notFound();
  const catalog = (await loadCatalog()).map((t) => ({ id: t.id, name: t.name, primaryCapability: t.primaryCapability }));
  const initialStep = step !== undefined ? Math.max(0, Math.min(5, Number(step) || 0)) : Math.min(owned.diagnosis.step, 5);
  return <Wizard id={id} initialProfile={owned.profile} initialStep={initialStep} catalog={catalog} aiEnabled={aiEnabled()} />;
}
