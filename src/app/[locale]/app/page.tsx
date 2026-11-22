import { getTranslations, setRequestLocale } from "next-intl/server";
import { Badge, Card } from "@/components/ui";
import { Link, redirect } from "@/i18n/navigation";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function Dashboard({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await currentUser();
  if (!user) return redirect({ href: "/login", locale });
  const t = await getTranslations("dashboard");
  const tv = await getTranslations("enum.vertical");
  const diagnoses = await db.diagnosis.findMany({
    where: { org: { ownerId: user.id } },
    include: { org: true },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <Link href="/app/new" className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-ink">
          {t("new")}
        </Link>
      </div>
      {diagnoses.length === 0 && <p className="text-muted">{t("empty")}</p>}
      <div className="grid gap-3">
        {diagnoses.map((d) => (
          <Card key={d.id} className="flex flex-wrap items-center gap-3">
            <div className="flex-1">
              <div className="font-semibold">{d.org.name}</div>
              <div className="text-sm text-muted">{tv(d.org.vertical as never)}</div>
            </div>
            <Badge tone={d.status === "completed" ? "money" : "neutral"}>{t(d.status as "in_progress" | "completed")}</Badge>
            <Badge tone={d.tier === "paid" ? "brand" : "neutral"}>{t(d.tier as "paid" | "free")}</Badge>
            <Link href={`/diagnosis/${d.id}/wizard`} className="text-sm text-brand underline">
              {t("continue")}
            </Link>
            {d.status === "completed" && (
              <Link href={`/diagnosis/${d.id}/report`} className="text-sm font-medium text-brand underline">
                {t("report")}
              </Link>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
