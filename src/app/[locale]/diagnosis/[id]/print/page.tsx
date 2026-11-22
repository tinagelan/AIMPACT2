import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { ReportView } from "@/components/report/ReportView";
import { redirect } from "@/i18n/navigation";
import { buildReport } from "@/lib/diagnosis";
import { track } from "@/lib/events";
import { AutoPrint } from "./AutoPrint";

/**
 * PDF export: a print-optimised render of the report. The browser's "Save as PDF"
 * handles Hebrew RTL text shaping correctly, which server-side PDF libraries don't.
 */
export default async function PrintPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const built = await buildReport(id);
  if (!built) notFound();
  if (built.tier !== "paid") return redirect({ href: `/diagnosis/${id}/report`, locale });
  await track("pdf_exported", { userId: built.user.id, diagnosisId: id });
  return (
    <>
      <AutoPrint />
      <ReportView report={built.view} orgName={built.profile.orgName || built.diagnosis.org.name} diagnosisId={id} implemented={[]} months={built.profile.settings.horizonMonths} print />
    </>
  );
}
