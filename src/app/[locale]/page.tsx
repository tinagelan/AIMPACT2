import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { currentUser } from "@/lib/auth";

export default async function Landing({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("landing");
  const user = await currentUser();
  const points = ["p1", "p2", "p3", "p4"] as const;
  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col items-start gap-5 py-8">
        <h1 className="max-w-3xl text-4xl font-bold leading-tight">{t("title")}</h1>
        <p className="max-w-2xl text-lg text-muted">{t("subtitle")}</p>
        <Link href={user ? "/app/new" : "/login"} className="rounded-md bg-brand px-6 py-3 font-medium text-brand-ink hover:opacity-90">
          {t("cta")}
        </Link>
      </section>
      <section className="grid gap-4 sm:grid-cols-2">
        {points.map((p) => (
          <Card key={p}>
            <h2 className="mb-2 font-semibold">{t(`${p}t`)}</h2>
            <p className="text-sm text-muted">{t(`${p}b`)}</p>
          </Card>
        ))}
      </section>
    </div>
  );
}
