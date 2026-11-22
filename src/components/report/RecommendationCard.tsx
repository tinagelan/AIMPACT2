"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toggleImplemented } from "@/app/actions";
import { Badge, Button, Card, Num } from "@/components/ui";
import { formatNis, useMsg } from "@/components/useMsg";
import type { Recommendation } from "@/engine/types";

/** Recommendation kinds whose benefit is a cut in existing expenses. */
const EXPENSE_KINDS: Recommendation["kind"][] = ["cancel_duplicate", "reduce_seats", "review_low_usage"];

export function BenefitChips({ r, locked }: { r: Recommendation; locked: boolean }) {
  const t = useTranslations("report");
  const tc = useTranslations("common");
  const b = r.benefits;
  const lock = <span aria-label={tc("locked")}>🔒</span>;
  return (
    <div className="flex flex-wrap gap-2 text-sm">
      {(b.directSavingsNis > 0 || (locked && EXPENSE_KINDS.includes(r.kind))) && (
        <Chip tone="money" label={t("directSavings")} value={locked ? lock : <Num>{formatNis(b.directSavingsNis)}{tc("perMonth")}</Num>} />
      )}
      {(b.avoidedCostNis > 0 || (locked && r.kind === "hire_vs_automate")) && (
        <Chip tone="avoid" label={t("avoidedCost")} value={locked ? lock : <Num>{formatNis(b.avoidedCostNis)}{tc("perMonth")}</Num>} />
      )}
      {b.timeSavedHours > 0 && <Chip tone="time" label={t("timeSaved")} value={<Num>{tc("hoursPerMonth", { value: Math.round(b.timeSavedHours) })}</Num>} />}
      {b.revenueImprovementNis > 0 && <Chip tone="money" label={t("revenue")} value={<Num>{formatNis(b.revenueImprovementNis)}{tc("perMonth")}</Num>} />}
    </div>
  );
}

function Chip({ tone, label, value }: { tone: "money" | "time" | "avoid"; label: string; value: React.ReactNode }) {
  const bg = { money: "bg-brand-soft text-money", time: "bg-time-soft text-time", avoid: "bg-avoid-soft text-avoid" }[tone];
  return (
    <span className={`inline-flex items-center gap-2 rounded-md px-2 py-1 ${bg}`}>
      <span className="text-xs">{label}</span>
      <strong>{value}</strong>
    </span>
  );
}

export function RoiLine({ roi, costs, months }: { roi: Recommendation["roi"]; costs: Recommendation["costs"]; months: number }) {
  const t = useTranslations("report");
  const tc = useTranslations("common");
  const be = roi.breakEvenMonths;
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
      <div>
        <dt className="text-xs text-muted">{t("investment")}</dt>
        <dd><Num>{formatNis(costs.oneTimeNis)}</Num></dd>
      </div>
      <div>
        <dt className="text-xs text-muted">{t("monthlyCost")}</dt>
        <dd><Num>{formatNis(costs.monthlyNis)}{tc("perMonth")}</Num></dd>
      </div>
      <div>
        <dt className="text-xs text-muted">{t("roi", { months })}</dt>
        <dd><Num>{roi.roiPct === null ? t("noInvestment") : `${roi.roiPct.toLocaleString("en-US")}%`}</Num></dd>
      </div>
      <div>
        <dt className="text-xs text-muted">{t("breakEven")}</dt>
        <dd>{be === null ? <span className="text-avoid">{t("noPayback")}</span> : be === 0 ? t("immediate") : t("months", { value: be })}</dd>
      </div>
    </dl>
  );
}

export function RecommendationCard({
  r,
  locked,
  months,
  diagnosisId,
  implemented,
  print,
  controls,
}: {
  r: Recommendation;
  locked: boolean;
  months: number;
  diagnosisId: string;
  implemented: boolean;
  print?: boolean;
  controls?: React.ReactNode;
}) {
  const t = useTranslations("report");
  const render = useMsg();
  const [done, setDone] = useState(implemented);
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(!!print);

  return (
    <Card className={r.counted ? "" : "opacity-75"}>
      <div className="flex flex-wrap items-start gap-2">
        <h3 className="flex-1 font-semibold" data-testid="rec-title">{render(r.title)}</h3>
        {!r.counted && <Badge>{t("alternative")}</Badge>}
        {r.tools.some((x) => x.isAI) && <Badge tone="time">{t("aiTool")}</Badge>}
        <Badge>{t("complexity", { value: r.complexity })}</Badge>
        <Badge tone={r.confidence === "high" ? "money" : r.confidence === "medium" ? "avoid" : "warn"}>
          {t("confidence")}: {render({ key: `enum.confidence.${r.confidence}` })}
        </Badge>
      </div>
      <p className="mt-2 text-sm text-muted">{render(r.rationale)}</p>
      <div className="mt-3">
        <BenefitChips r={r} locked={locked} />
      </div>
      {!locked && (
        <div className="mt-3 border-t border-line pt-3">
          <RoiLine roi={r.roi} costs={r.costs} months={months} />
          {r.severanceExposure && r.severanceExposure.max > 0 && (
            <p className="mt-2 text-sm text-avoid">
              {t("severance")}: <Num>{formatNis(r.severanceExposure.min)}–{formatNis(r.severanceExposure.max)}</Num>
            </p>
          )}
        </div>
      )}
      {controls}
      {r.tools.length > 0 && (
        <div className="mt-3 flex flex-col gap-1 text-xs">
          {r.tools.map((tool) => (
            <div key={tool.toolId} className="flex flex-wrap gap-2">
              <a href={tool.pricingUrl} target="_blank" rel="noopener noreferrer" className="text-brand underline">
                {tool.name}
              </a>
              <span className={tool.stale ? "text-avoid" : "text-muted"}>
                {tool.lastVerifiedAt && !tool.stale ? t("priceVerified", { date: tool.lastVerifiedAt.slice(0, 10) }) : t("priceUnverified")}
              </span>
            </div>
          ))}
        </div>
      )}
      {!locked && (
        <div className="mt-3">
          {!print && (
            <button type="button" className="no-print text-sm text-brand underline" onClick={() => setOpen((o) => !o)}>
              {t("steps")} · {t("assumptions")}
            </button>
          )}
          {open && (
            <div className="mt-2 grid gap-4 text-sm sm:grid-cols-3">
              <Section title={t("steps")} items={r.steps.map(render)} ordered />
              <Section title={t("assumptions")} items={r.assumptions.map(render)} />
              <Section title={t("changeManagement")} items={[...r.changeManagement, ...r.benefits.quality].map(render)} />
            </div>
          )}
          {!print && (
            <div className="no-print mt-3">
              <Button
                variant={done ? "secondary" : "ghost"}
                className="px-2 py-1 text-xs"
                disabled={pending}
                onClick={() => start(async () => setDone((await toggleImplemented(diagnosisId, r.id)).implemented))}
              >
                {done ? `✓ ${t("implemented")}` : t("markImplemented")}
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function Section({ title, items, ordered }: { title: string; items: string[]; ordered?: boolean }) {
  if (items.length === 0) return null;
  const List = ordered ? "ol" : "ul";
  return (
    <div>
      <h4 className="mb-1 text-xs font-semibold uppercase text-muted">{title}</h4>
      <List className={`${ordered ? "list-decimal" : "list-disc"} flex flex-col gap-1 ps-5`}>
        {items.map((i, k) => (
          <li key={k}>{i}</li>
        ))}
      </List>
    </div>
  );
}
