"use client";

import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Badge, Card, Num } from "@/components/ui";
import { formatNis, useMsg } from "@/components/useMsg";
import type { Horizon, Recommendation } from "@/engine/types";
import { Link } from "@/i18n/navigation";
import type { ViewReport } from "@/paywall/redact";
import { RecommendationCard } from "./RecommendationCard";

const HORIZONS: Horizon[] = ["quick_win", "medium_term", "long_term"];

export function SummaryTiles({ report, months }: { report: ViewReport; months: number }) {
  const t = useTranslations("report");
  const tc = useTranslations("common");
  const { totals, locked } = report;
  const lock = "🔒";
  const be = totals.roi.breakEvenMonths;
  const timeOnly = totals.roi.monthlyFinancialBenefit === 0 && totals.timeSavedHours > 0;
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Tile tone="money" label={t("directSavings")} help={t("directSavingsHelp")} value={locked ? lock : `${formatNis(totals.directSavingsNis)}${tc("perMonth")}`} testId="tile-direct" />
      <Tile tone="avoid" label={t("avoidedCost")} help={t("avoidedCostHelp")} value={locked ? lock : `${formatNis(totals.avoidedCostNis)}${tc("perMonth")}`} />
      <Tile tone="time" label={t("timeSaved")} help={t("timeSavedHelp")} value={tc("hoursPerMonth", { value: totals.timeSavedHours })} testId="tile-hours" />
      <Tile tone="money" label={t("revenue")} help={t("revenueHelp")} value={locked ? lock : `${formatNis(totals.revenueImprovementNis)}${tc("perMonth")}`} />
      {!locked && (
        <>
          <Tile label={t("investment")} value={formatNis(totals.oneTimeNis)} />
          <Tile label={t("monthlyCost")} value={`${formatNis(totals.monthlyCostNis)}${tc("perMonth")}`} />
          {timeOnly ? (
            <div className="sm:col-span-2">
              <Tile tone="time" label={t("roi", { months })} value={<span className="text-base text-time">{t("timeOnly")}</span>} />
            </div>
          ) : (
            <>
              <Tile label={t("roi", { months })} value={totals.roi.roiPct === null ? t("noInvestment") : `${totals.roi.roiPct.toLocaleString("en-US")}%`} />
              <Tile label={t("breakEven")} value={be === null ? t("noPayback") : be === 0 ? t("immediate") : t("months", { value: be })} />
            </>
          )}
        </>
      )}
    </div>
  );
}

function Tile({ label, value, help, tone, testId }: { label: string; value: ReactNode; help?: string; tone?: "money" | "time" | "avoid"; testId?: string }) {
  const border = tone === "money" ? "border-s-money" : tone === "time" ? "border-s-time" : tone === "avoid" ? "border-s-avoid" : "border-s-line";
  return (
    <div className={`card rounded-lg border border-line border-s-4 ${border} bg-surface p-4`}>
      <div className="text-xs font-medium text-muted">{label}</div>
      <div className="num mt-1 text-xl font-bold" data-testid={testId}>
        {value}
      </div>
      {help && <div className="mt-1 text-xs text-muted">{help}</div>}
    </div>
  );
}

export function ImpactEffortMatrix({ recs }: { recs: Recommendation[] }) {
  const t = useTranslations("report");
  const render = useMsg();
  // Relative positioning: spread points over the actual range of scores in this report,
  // so they don't all bunch in one corner. Quadrant lines are the midpoint of that range.
  const scale = (vals: number[]) => {
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    return (v: number) => (hi === lo ? 50 : 10 + ((v - lo) / (hi - lo)) * 80);
  };
  const x = scale(recs.map((r) => r.effortScore));
  const y = scale(recs.map((r) => r.impactScore));
  return (
    <div className="relative aspect-[2/1] w-full rounded-md border border-line bg-bg" dir="ltr">
      <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-line" />
      <div className="absolute inset-y-0 left-1/2 border-s border-dashed border-line" />
      <span className="absolute bottom-1 right-2 text-xs text-muted">{t("effort")} →</span>
      <span className="absolute left-2 top-1 text-xs text-muted">↑ {t("impact")}</span>
      {recs.map((r, i) => (
        <span
          key={r.id}
          title={render(r.title)}
          className="absolute flex h-6 w-6 -translate-x-1/2 translate-y-1/2 items-center justify-center rounded-full bg-brand text-xs font-bold text-brand-ink"
          style={{ left: `${x(r.effortScore)}%`, bottom: `${y(r.impactScore)}%` }}
        >
          {i + 1}
        </span>
      ))}
    </div>
  );
}

export function ReportView({
  report,
  orgName,
  diagnosisId,
  implemented,
  months,
  print,
}: {
  report: ViewReport;
  orgName: string;
  diagnosisId: string;
  implemented: string[];
  months: number;
  print?: boolean;
}) {
  const t = useTranslations("report");
  const tc = useTranslations("common");
  const tr = useTranslations("enum");
  const tw = useTranslations("wizard.team");
  const locale = useLocale();
  const render = useMsg();
  const counted = report.recommendations.filter((r) => r.counted);
  const maxHours = Math.max(1, ...report.bottleneckMap.map((b) => b.hoursPerMonth));

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-bold">
            {t("title")} — {orgName}
          </h1>
          <p className="text-sm text-muted">{t("generated", { date: report.generatedAt.slice(0, 10) })}</p>
        </div>
        {!print && (
          <div className="no-print flex flex-wrap gap-2 text-sm">
            <Link href={`/diagnosis/${diagnosisId}/wizard?step=0`} className="rounded-md border border-line px-3 py-2">
              {t("editAnswers")}
            </Link>
            {!report.locked && (
              <>
                <Link href={`/diagnosis/${diagnosisId}/simulator`} className="rounded-md border border-line px-3 py-2">
                  {t("simulator")}
                </Link>
                <a href={`/${locale}/diagnosis/${diagnosisId}/print`} target="_blank" rel="noopener" className="rounded-md bg-brand px-3 py-2 text-brand-ink">
                  {t("exportPdf")}
                </a>
              </>
            )}
          </div>
        )}
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">{t("summary")}</h2>
        <SummaryTiles report={report} months={months} />
      </section>

      {report.locked && !print && (
        <Card className="no-print border-brand bg-brand-soft">
          <h2 className="mb-1 text-lg font-semibold">{t("lockedTitle")}</h2>
          <p className="mb-3 text-sm">{t("lockedBody")}</p>
          <Link href={`/pricing?d=${diagnosisId}`} className="inline-block rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-ink" data-testid="unlock-link">
            {tc("unlock")}
          </Link>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <div className="mb-2 flex items-center gap-2">
            <h2 className="flex-1 font-semibold">{t("confidence")}</h2>
            <Badge tone={report.confidence.level === "high" ? "money" : report.confidence.level === "medium" ? "avoid" : "warn"}>
              <span data-testid="confidence-level">{tr(`confidence.${report.confidence.level}`)}</span>
            </Badge>
          </div>
          <p className="mb-3 text-xs text-muted">{t("confidenceHelp")}</p>
          {report.confidence.improvements.length > 0 && (
            <>
              <h3 className="mb-1 text-sm font-medium">{t("improve")}</h3>
              <ul className="flex list-disc flex-col gap-1 ps-5 text-sm">
                {report.confidence.improvements.map((m, i) => (
                  <li key={i}>{render(m)}</li>
                ))}
              </ul>
            </>
          )}
          {report.openQuestions.length > 0 && (
            <>
              <h3 className="mb-1 mt-3 text-sm font-medium">{t("openQuestions")}</h3>
              <ul className="flex list-disc flex-col gap-1 ps-5 text-sm">
                {report.openQuestions.slice(0, 6).map((q) => (
                  <li key={q.id}>{render(q.message)}</li>
                ))}
              </ul>
            </>
          )}
        </Card>
        <Card>
          <h2 className="mb-3 font-semibold">{t("bottleneckMap")}</h2>
          <div className="flex flex-col gap-2">
            {report.bottleneckMap.map((b) => (
              <div key={b.process} className="text-sm">
                <div className="flex justify-between gap-2">
                  <span>{tr(`process.${b.process}`)}</span>
                  <span className="num text-muted">{tc("hoursPerMonth", { value: b.hoursPerMonth })}{b.hoursSource === "benchmark" ? " *" : ""}</span>
                </div>
                <div className="h-2 rounded bg-bg">
                  <div className="h-2 rounded bg-time" style={{ width: `${(b.hoursPerMonth / maxHours) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {report.directions.length > 0 && (
        <Card>
          <h2 className="mb-2 font-semibold">{t("directions")}</h2>
          <ul className="flex list-disc flex-col gap-1 ps-5 text-sm">
            {report.directions.map((m, i) => (
              <li key={i}>{render(m)}</li>
            ))}
          </ul>
        </Card>
      )}

      {counted.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">{t("matrix")}</h2>
          <ImpactEffortMatrix recs={counted} />
          <ol className="grid list-decimal gap-1 ps-5 text-xs text-muted sm:grid-cols-2">
            {counted.map((r) => (
              <li key={r.id}>{render(r.title)}</li>
            ))}
          </ol>
        </section>
      )}

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">{t("plan")}</h2>
        {HORIZONS.map((h) => {
          const recs = report.recommendations.filter((r) => r.horizon === h);
          if (recs.length === 0) return null;
          return (
            <div key={h} className="flex flex-col gap-3">
              <h3 className="font-semibold text-brand">{t(`horizon.${h}`)}</h3>
              {recs.map((r) => (
                <RecommendationCard key={r.id} r={r} locked={report.locked} months={months} diagnosisId={diagnosisId} implemented={implemented.includes(r.id)} print={print} />
              ))}
            </div>
          );
        })}
      </section>

      {!report.locked && report.payroll.lines.length > 0 && (
        <section className={`flex flex-col gap-3 ${print ? "print-break" : ""}`}>
          <h2 className="text-lg font-semibold">{t("payroll")}</h2>
          <div className="overflow-x-auto rounded-lg border border-line bg-surface">
            <table className="w-full text-sm">
              <thead className="bg-bg text-xs text-muted">
                <tr>
                  {[t("employee"), t("gross"), t("employerCost"), tw("section14"), t("severanceTopUp")].map((h) => (
                    <th key={h} className="px-3 py-2 text-start font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.payroll.lines.map((l) => (
                  <tr key={l.employeeId} className="border-t border-line">
                    <td className="px-3 py-2">
                      {l.title || tr(`role.${l.role}`)} <span className="text-xs text-muted">({t(`salarySource.${l.salarySource}`)})</span>
                    </td>
                    <td className="px-3 py-2"><RangeNis r={l.gross} /></td>
                    <td className="px-3 py-2"><RangeNis r={l.employerCost} /></td>
                    <td className="px-3 py-2">{tc(l.section14 === "yes" ? "yes" : l.section14 === "no" ? "no" : "unknown")}</td>
                    <td className="px-3 py-2"><RangeNis r={l.severanceTopUp} /></td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-line font-semibold">
                <tr>
                  <td className="px-3 py-2">{t("totalEmployerCost")}</td>
                  <td />
                  <td className="px-3 py-2"><RangeNis r={report.payroll.totalEmployerCost} /></td>
                  <td className="px-3 py-2 text-muted" colSpan={2}>
                    {t("software")}: <Num>{formatNis(report.payroll.totalSoftwareNis)}</Num>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      )}

      <p className="rounded bg-bg p-3 text-xs text-muted">{tc("notLegalAdvice")}</p>
    </div>
  );
}

function RangeNis({ r }: { r: { min: number; max: number } }) {
  return <Num>{Math.round(r.min) === Math.round(r.max) ? formatNis(r.min) : `${formatNis(r.min)}–${formatNis(r.max)}`}</Num>;
}
