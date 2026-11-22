import { getTranslations, setRequestLocale } from "next-intl/server";
import { createDiagnosis } from "@/app/actions";
import { Button, Card, Field, Input, Select } from "@/components/ui";
import { redirect } from "@/i18n/navigation";
import { currentUser } from "@/lib/auth";
import { VERTICALS } from "@/lib/profileSchema";

export default async function NewDiagnosis({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (!(await currentUser())) return redirect({ href: "/login", locale });
  const t = await getTranslations("onboarding");
  const tv = await getTranslations("enum.vertical");

  return (
    <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-[3fr_2fr]">
      <Card>
        <h1 className="mb-5 text-2xl font-bold">{t("title")}</h1>
        <form action={createDiagnosis} className="flex flex-col gap-4">
          <input type="hidden" name="locale" value={locale} />
          <Field label={t("orgName")}>
            <Input name="orgName" required maxLength={120} />
          </Field>
          <Field label={t("vertical")}>
            <Select name="vertical" defaultValue="professional_services">
              {VERTICALS.map((v) => (
                <option key={v} value={v}>
                  {tv(v)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("goal")}>
            <textarea name="goal" maxLength={500} rows={3} placeholder={t("goalPlaceholder")} className="rounded-md border border-line p-3 text-sm" />
          </Field>
          <Button>{t("start")}</Button>
        </form>
      </Card>
      <Card className="bg-brand-soft">
        <h2 className="mb-3 font-semibold">{t("privacyTitle")}</h2>
        <ul className="flex list-disc flex-col gap-2 ps-5 text-sm">
          <li>{t("privacy1")}</li>
          <li>{t("privacy2")}</li>
          <li>{t("privacy3")}</li>
          <li>{t("privacy4")}</li>
        </ul>
      </Card>
    </div>
  );
}
