import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { ReportView } from "@/components/report/ReportView";
import { db } from "@/lib/db";
import { buildReport } from "@/lib/diagnosis";

export default async function ReportPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const built = await buildReport(id);
  if (!built) notFound();
  const implemented = await db.implementedRecommendation.findMany({ where: { diagnosisId: id }, select: { recommendationId: true } });
  return (
    <ReportView
      report={built.view}
      orgName={built.profile.orgName || built.diagnosis.org.name}
      diagnosisId={id}
      implemented={implemented.map((i) => i.recommendationId)}
      months={built.profile.settings.horizonMonths}
    />
  );
}
