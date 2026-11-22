import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { loadCatalog } from "@/catalog/repository";
import { redirect } from "@/i18n/navigation";
import { getOwnedDiagnosis } from "@/lib/diagnosis";
import { Simulator } from "./Simulator";

export default async function SimulatorPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const owned = await getOwnedDiagnosis(id);
  if (!owned) notFound();
  // Full figures only for the paid tier.
  if (owned.diagnosis.tier !== "paid") return redirect({ href: `/pricing?d=${id}`, locale });
  return <Simulator id={id} profile={owned.profile} catalog={await loadCatalog()} />;
}
