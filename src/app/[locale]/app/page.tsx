import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { WelcomeToast } from "@/components/WelcomeToast";
import { DiagnosisList } from "./DiagnosisList";

export default async function Dashboard({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ welcome?: string }>;
}) {
  const { locale } = await params;
  const { welcome } = await searchParams;
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
      {welcome === "1" && <WelcomeToast message={t("welcomeBack")} />}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <Link href="/app/new" className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-ink">
          {t("new")}
        </Link>
      </div>
      <DiagnosisList
        items={diagnoses.map((d) => ({
          id: d.id,
          orgName: d.org.name,
          verticalLabel: tv(d.org.vertical as never),
          status: d.status === "completed" ? "completed" : "in_progress",
          tier: d.tier === "paid" ? "paid" : "free",
        }))}
      />
    </div>
  );
}
