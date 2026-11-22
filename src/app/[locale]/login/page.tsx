"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button, Card, Field, Input } from "@/components/ui";

function LoginForm() {
  const t = useTranslations("login");
  const locale = useLocale();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [devLink, setDevLink] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/auth/request", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, locale }) });
    const json = await res.json();
    setBusy(false);
    if (json.ok) {
      setSent(true);
      setDevLink(json.devLink);
    }
  }

  return (
    <Card className="mx-auto max-w-md">
      <h1 className="mb-4 text-xl font-bold">{t("title")}</h1>
      {params.get("error") && <p className="mb-3 rounded bg-warn-soft p-2 text-sm text-warn">{t("invalid")}</p>}
      {sent ? (
        <div className="flex flex-col gap-3 text-sm">
          <p>{t("sent")}</p>
          {devLink && (
            <p className="rounded bg-bg p-2">
              {t("devLink")}{" "}
              <a href={devLink} className="font-medium text-brand underline" data-testid="dev-login-link">
                {devLink.slice(0, 48)}…
              </a>
            </p>
          )}
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field label={t("email")}>
            <Input type="email" required dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} name="email" autoComplete="email" />
          </Field>
          <Button disabled={busy}>{t("submit")}</Button>
        </form>
      )}
    </Card>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
