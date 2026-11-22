"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";
import { completeDiagnosis, saveProfile } from "@/app/actions";
import { Button, Card, cx } from "@/components/ui";
import type { BusinessProfile } from "@/engine/types";
import { BottlenecksStep, BusinessStep, ClarifyStep, EnrichStep, TeamStep, TechStep, type CatalogOption } from "./steps";

const STEPS = ["business", "team", "bottlenecks", "tech", "enrich", "clarify"] as const;

export function Wizard({
  id,
  initialProfile,
  initialStep,
  catalog,
  aiEnabled,
}: {
  id: string;
  initialProfile: BusinessProfile;
  initialStep: number;
  catalog: CatalogOption[];
  aiEnabled: boolean;
}) {
  const t = useTranslations("wizard");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [profile, setProfile] = useState(initialProfile);
  const [step, setStep] = useState(initialStep);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [pending, startTransition] = useTransition();
  const first = useRef(true);

  // Autosave (debounced) on every change.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setStatus("saving");
    const h = setTimeout(async () => {
      const res = await saveProfile(id, profile, step);
      setStatus(res.ok ? "saved" : "error");
    }, 700);
    return () => clearTimeout(h);
  }, [profile, step, id]);

  function go(next: number) {
    setStep(next);
    window.history.replaceState(null, "", `?step=${next}`);
    window.scrollTo({ top: 0 });
  }

  function finish() {
    startTransition(async () => {
      await saveProfile(id, profile, STEPS.length);
      await completeDiagnosis(id, locale);
    });
  }

  const update = (fn: (p: BusinessProfile) => BusinessProfile) => setProfile((p) => fn(structuredClone(p)));
  const props = { profile, update, catalog, aiEnabled };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="flex-1 text-2xl font-bold">{t(`steps.${STEPS[step]}`)}</h1>
        <span className="text-sm text-muted" aria-live="polite">
          {status === "saving" ? tc("saving") : status === "saved" ? tc("saved") : status === "error" ? tc("saveError") : ""}
        </span>
      </div>

      <ol className="grid grid-cols-6 gap-1" aria-label={t("stepOf", { current: step + 1, total: STEPS.length })}>
        {STEPS.map((s, i) => (
          <li key={s}>
            <button
              type="button"
              onClick={() => go(i)}
              className={cx("h-2 w-full rounded-full", i <= step ? "bg-brand" : "bg-line")}
              title={t(`steps.${s}`)}
              aria-label={t(`steps.${s}`)}
            />
          </li>
        ))}
      </ol>
      <p className="text-sm text-muted">{t("stepOf", { current: step + 1, total: STEPS.length })}</p>

      <Card>
        {step === 0 && <BusinessStep {...props} />}
        {step === 1 && <TeamStep {...props} />}
        {step === 2 && <BottlenecksStep {...props} />}
        {step === 3 && <TechStep {...props} />}
        {step === 4 && <EnrichStep {...props} />}
        {step === 5 && <ClarifyStep {...props} />}
      </Card>

      <div className="flex justify-between">
        <Button variant="secondary" disabled={step === 0} onClick={() => go(step - 1)}>
          {tc("back")}
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={() => go(step + 1)}>{tc("next")}</Button>
        ) : (
          <Button onClick={finish} disabled={pending} data-testid="see-report">
            {t("clarify.generate")}
          </Button>
        )}
      </div>
    </div>
  );
}
