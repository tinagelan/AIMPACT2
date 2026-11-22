"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { trackUpgradeClick, unlockDiagnosis } from "@/app/actions";
import { Button } from "@/components/ui";
import { useRouter } from "@/i18n/navigation";

export function UnlockButton({ diagnosisId }: { diagnosisId: string }) {
  const t = useTranslations("pricing");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);

  useEffect(() => {
    trackUpgradeClick(diagnosisId);
  }, [diagnosisId]);

  return (
    <div className="mt-4 flex flex-col gap-2">
      <Button
        disabled={pending || done}
        data-testid="buy"
        onClick={() =>
          start(async () => {
            const res = await unlockDiagnosis(diagnosisId);
            if (res.ok) {
              setDone(true);
              router.push(`/diagnosis/${diagnosisId}/report`);
            }
          })
        }
      >
        {t("buy")}
      </Button>
      <p className="text-xs text-muted">{done ? t("success") : t("mockNote")}</p>
    </div>
  );
}
