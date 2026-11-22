import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card } from "@/components/ui";
import { currentUser, isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export default async function Metrics({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await currentUser();
  if (!user || !isAdmin(user.email)) notFound();
  const t = await getTranslations("admin");

  const [started, reached, converted, implementedOrgs] = await Promise.all([
    db.event.count({ where: { name: "diagnosis_started" } }),
    db.event.findMany({ where: { name: "report_reached" }, select: { propsJson: true } }),
    db.event.count({ where: { name: "upgrade_converted" } }),
    db.implementedRecommendation.findMany({ distinct: ["diagnosisId"], select: { diagnosisId: true } }),
  ]);
  const minutes = reached.map((e) => Number(JSON.parse(e.propsJson).minutes)).filter(Number.isFinite);
  const ttv = median(minutes);
  const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)}%` : "—");

  const tiles = [
    { label: t("completion"), value: pct(reached.length, started), target: "≥65%", sub: `${t("reached")} ${reached.length} / ${t("started")} ${started}` },
    { label: t("ttv"), value: ttv === null ? "—" : `${ttv.toFixed(1)} min`, target: "<10 min" },
    { label: t("conversion"), value: pct(converted, reached.length), target: "≥8%", sub: `${converted}` },
    { label: t("northStar"), value: String(implementedOrgs.length), target: "90 days" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{t("metrics")}</h1>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((x) => (
          <Card key={x.label}>
            <div className="text-xs text-muted">{x.label}</div>
            <div className="num mt-1 text-2xl font-bold">{x.value}</div>
            <div className="text-xs text-muted">{t("target", { value: x.target })}{x.sub ? ` · ${x.sub}` : ""}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}
