"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState, useTransition } from "react";
import { saveScenario } from "@/app/actions";
import { RecommendationCard } from "@/components/report/RecommendationCard";
import { SummaryTiles } from "@/components/report/ReportView";
import { Button, Card, Field, NumberInput, Select } from "@/components/ui";
import { analyze } from "@/engine/analyze";
import { MAX_EMPLOYER_MULTIPLIER, MIN_EMPLOYER_MULTIPLIER } from "@/engine/employerCost";
import type { BusinessProfile, CatalogTool, Decisions } from "@/engine/types";
import { Link } from "@/i18n/navigation";
import { redactForTier } from "@/paywall/redact";

const toggle = (list: string[], id: string, on: boolean) => (on ? Array.from(new Set([...list, id])) : list.filter((x) => x !== id));

export function Simulator({ id, profile: initial, catalog }: { id: string; profile: BusinessProfile; catalog: CatalogTool[] }) {
  const t = useTranslations("simulator");
  const tc = useTranslations("common");
  const tr = useTranslations("enum");
  const [profile, setProfile] = useState(initial);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  // The engine is pure TS, so every change re-runs the full analysis instantly in the browser.
  const report = useMemo(() => redactForTier(analyze(profile, catalog), "paid"), [profile, catalog]);
  const { settings, decisions } = profile;

  const setDecisions = (fn: (d: Decisions) => Decisions) => {
    setSaved(false);
    setProfile((p) => ({ ...p, decisions: fn(p.decisions) }));
  };
  const setSettings = (patch: Partial<BusinessProfile["settings"]>) => {
    setSaved(false);
    setProfile((p) => ({ ...p, settings: { ...p.settings, ...patch } }));
  };
  const toolName = (tid: string) => catalog.find((c) => c.id === tid)?.name ?? tid;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-sm text-muted">{t("hint")}</p>
        </div>
        <Link href={`/diagnosis/${id}/report`} className="text-sm text-brand underline">
          ← {tc("back")}
        </Link>
        <Button variant="secondary" onClick={() => { setProfile(initial); setSaved(false); }}>
          {t("reset")}
        </Button>
        <Button
          disabled={pending}
          onClick={() => start(async () => setSaved((await saveScenario(id, { decisions: profile.decisions, settings: profile.settings, employees: profile.employees })).ok))}
        >
          {saved ? `✓ ${tc("saved")}` : t("saveScenario")}
        </Button>
      </div>

      <Card>
        <div className="grid gap-4 sm:grid-cols-4">
          <Field label={`${t("multiplier")}: ${Math.round(settings.employerMultiplier * 100)}%`}>
            <input
              type="range"
              min={MIN_EMPLOYER_MULTIPLIER}
              max={MAX_EMPLOYER_MULTIPLIER}
              step={0.01}
              value={settings.employerMultiplier}
              onChange={(e) => setSettings({ employerMultiplier: Number(e.target.value) })}
            />
          </Field>
          <Field label={t("horizon")}>
            <Select value={settings.horizonMonths} onChange={(e) => setSettings({ horizonMonths: Number(e.target.value) as 12 | 24 | 36 })}>
              {[12, 24, 36].map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("usdToNis")}>
            <NumberInput min={1} max={10} step={0.01} value={settings.usdToNis} onValue={(v) => v && v >= 1 && v <= 10 && setSettings({ usdToNis: v })} />
          </Field>
          <Field label={t("revenuePerHour")}>
            <NumberInput min={0} value={settings.revenuePerHourNis} onValue={(v) => setSettings({ revenuePerHourNis: v })} />
          </Field>
        </div>
        {profile.employees.length > 0 && (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-medium">{t("perEmployee")}</summary>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {profile.employees.map((e) => (
                <Field key={e.id} label={`${e.title || tr(`role.${e.role}`)}: ${e.scopePct}%`}>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={10}
                    value={e.scopePct}
                    onChange={(ev) => {
                      setSaved(false);
                      setProfile((p) => ({ ...p, employees: p.employees.map((x) => (x.id === e.id ? { ...x, scopePct: Number(ev.target.value) } : x)) }));
                    }}
                  />
                </Field>
              ))}
            </div>
          </details>
        )}
      </Card>

      <SummaryTiles report={report} months={settings.horizonMonths} />

      <div className="flex flex-col gap-3">
        {report.recommendations.map((r) => (
          <RecommendationCard
            key={r.id}
            r={r}
            locked={false}
            months={settings.horizonMonths}
            diagnosisId={id}
            implemented={false}
            print
            controls={
              <div className="mt-3 flex flex-wrap items-center gap-4 rounded-md bg-bg p-3 text-sm" data-testid={`sim-${r.id}`}>
                <label className="flex items-center gap-1">
                  <input type="checkbox" checked={!decisions.excluded.includes(r.id)} onChange={(e) => setDecisions((d) => ({ ...d, excluded: toggle(d.excluded, r.id, !e.target.checked) }))} />
                  {t("include")}
                </label>
                {r.convertibleHours && (
                  <>
                    <label className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        data-testid={`fte-${r.id}`}
                        checked={decisions.fteReductionConfirmed.includes(r.id)}
                        onChange={(e) =>
                          setDecisions((d) => ({
                            ...d,
                            fteReductionConfirmed: toggle(d.fteReductionConfirmed, r.id, e.target.checked),
                            redirectToRevenue: e.target.checked ? toggle(d.redirectToRevenue, r.id, false) : d.redirectToRevenue,
                          }))
                        }
                      />
                      {t("fte")}
                    </label>
                    <label className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={decisions.redirectToRevenue.includes(r.id)}
                        onChange={(e) =>
                          setDecisions((d) => ({
                            ...d,
                            redirectToRevenue: toggle(d.redirectToRevenue, r.id, e.target.checked),
                            fteReductionConfirmed: e.target.checked ? toggle(d.fteReductionConfirmed, r.id, false) : d.fteReductionConfirmed,
                          }))
                        }
                      />
                      {t("redirect")}
                    </label>
                  </>
                )}
                {r.toolOptions && r.toolOptions.length > 1 && (
                  <label className="flex items-center gap-2">
                    {t("swapTool")}
                    <Select
                      className="w-auto"
                      value={r.tools[0]?.toolId}
                      onChange={(e) => setDecisions((d) => ({ ...d, toolOverrides: { ...d.toolOverrides, [r.id]: e.target.value } }))}
                    >
                      {r.toolOptions.map((tid) => (
                        <option key={tid} value={tid}>
                          {toolName(tid)}
                        </option>
                      ))}
                    </Select>
                  </label>
                )}
              </div>
            }
          />
        ))}
      </div>
    </div>
  );
}
