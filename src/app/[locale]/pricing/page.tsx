import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card } from "@/components/ui";
import { PRICE_NIS } from "@/paywall/payments";
import { UnlockButton } from "./UnlockButton";

export default async function Pricing({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ d?: string }> }) {
  const { locale } = await params;
  const { d } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("pricing");
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="mb-1 text-lg font-semibold">{t("free")}</h2>
          <p className="text-2xl font-bold">₪0</p>
          <p className="mt-3 text-sm text-muted">{t("freeItems")}</p>
        </Card>
        <Card className="border-brand">
          <h2 className="mb-1 text-lg font-semibold">{t("paid")}</h2>
          <p className="text-2xl font-bold">{t("paidPrice", { price: PRICE_NIS })}</p>
          <p className="mt-3 text-sm text-muted">{t("paidItems")}</p>
          {d && <UnlockButton diagnosisId={d} />}
        </Card>
      </div>
    </div>
  );
}
