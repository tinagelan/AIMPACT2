"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Badge, Button, Field, Input, NumberInput, Select } from "@/components/ui";
import { useMsg } from "@/components/useMsg";
import { openQuestions } from "@/engine/confidence";
import { benchmarkBottlenecks } from "@/engine/defaults";
import type { Bottleneck, BusinessProfile, Employee, ProcessKey, Section14, Subscription, UsageLevel } from "@/engine/types";
import { PROCESS_KEYS, ROLE_KEYS, VERTICALS } from "@/lib/profileSchema";
import { CAPABILITY_KEYS } from "@/catalog/seedTools";

export interface CatalogOption {
  id: string;
  name: string;
  primaryCapability: string;
}

interface StepProps {
  profile: BusinessProfile;
  update: (fn: (p: BusinessProfile) => BusinessProfile) => void;
  catalog: CatalogOption[];
  aiEnabled: boolean;
}

const uid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10));

function RemoveBtn({ onClick }: { onClick: () => void }) {
  const tc = useTranslations("common");
  return (
    <Button type="button" variant="danger" className="px-2 py-1" onClick={onClick}>
      {tc("remove")}
    </Button>
  );
}

/* ---------------- Step 1: business ---------------- */

export function BusinessStep({ profile, update }: StepProps) {
  const t = useTranslations();
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <p className="text-sm text-muted sm:col-span-2">{t("wizard.business.hint")}</p>
      <Field label={t("onboarding.orgName")}>
        <Input value={profile.orgName} onChange={(e) => update((p) => ({ ...p, orgName: e.target.value }))} />
      </Field>
      <Field label={t("onboarding.vertical")}>
        <Select value={profile.vertical} onChange={(e) => update((p) => ({ ...p, vertical: e.target.value as BusinessProfile["vertical"] }))}>
          {VERTICALS.map((v) => (
            <option key={v} value={v}>
              {t(`enum.vertical.${v}`)}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t("wizard.business.employeeCount")}>
        <NumberInput min={0} value={profile.employeeCount || undefined} onValue={(v) => update((p) => ({ ...p, employeeCount: Math.max(0, Math.round(v ?? 0)) }))} />
      </Field>
      <Field label={t("onboarding.goal")} className="sm:col-span-2">
        <textarea
          rows={3}
          maxLength={500}
          value={profile.goal}
          placeholder={t("onboarding.goalPlaceholder")}
          onChange={(e) => update((p) => ({ ...p, goal: e.target.value }))}
          className="rounded-md border border-line p-3 text-sm"
        />
      </Field>
    </div>
  );
}

/* ---------------- Step 2: team ---------------- */

type SalaryMode = "exact" | "range" | "skip";
const salaryMode = (e: Employee): SalaryMode => (e.salary.exact !== undefined ? "exact" : e.salary.range ? "range" : "skip");

export function TeamStep({ profile, update }: StepProps) {
  const t = useTranslations();
  const tt = useTranslations("wizard.team");

  const setEmp = (id: string, patch: Partial<Employee>) =>
    update((p) => ({ ...p, employees: p.employees.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));

  const add = (base?: Employee) =>
    update((p) => ({
      ...p,
      employees: [
        ...p.employees,
        base ? { ...base, id: uid() } : { id: uid(), role: "admin_coordinator", scopePct: 100, salary: {}, section14: "unknown" },
      ],
      employeeCount: Math.max(p.employeeCount, p.employees.length + 1),
    }));

  const hire = profile.plannedHire;

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-muted">{tt("hint")}</p>
      {profile.employees.map((e, idx) => {
        const mode = salaryMode(e);
        return (
          <div key={e.id} className="grid gap-3 rounded-md border border-line p-4 sm:grid-cols-6" data-testid="employee-row">
            <div className="text-sm font-semibold text-muted sm:col-span-6">#{idx + 1}</div>
            <Field label={tt("role")} className="sm:col-span-2">
              <Select value={e.role} onChange={(ev) => setEmp(e.id, { role: ev.target.value as Employee["role"] })}>
                {ROLE_KEYS.map((r) => (
                  <option key={r} value={r}>
                    {t(`enum.role.${r}`)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={tt("title")} className="sm:col-span-2">
              <Input value={e.title ?? ""} maxLength={80} onChange={(ev) => setEmp(e.id, { title: ev.target.value || undefined })} />
            </Field>
            <Field label={tt("scope")}>
              <NumberInput min={0} max={100} value={e.scopePct} onValue={(v) => setEmp(e.id, { scopePct: Math.min(100, Math.max(0, v ?? 0)) })} />
            </Field>
            <Field label={tt("tenure")}>
              <NumberInput min={0} max={60} step={0.5} value={e.tenureYears} onValue={(v) => setEmp(e.id, { tenureYears: v })} />
            </Field>
            <Field label={tt("salaryMode")} className="sm:col-span-2">
              <Select
                value={mode}
                onChange={(ev) => {
                  const m = ev.target.value as SalaryMode;
                  setEmp(e.id, { salary: m === "exact" ? { exact: e.salary.range?.min ?? 0 } : m === "range" ? { range: { min: e.salary.exact ?? 0, max: e.salary.exact ?? 0 } } : {} });
                }}
              >
                <option value="exact">{tt("exact")}</option>
                <option value="range">{tt("range")}</option>
                <option value="skip">{tt("skip")}</option>
              </Select>
            </Field>
            {mode === "exact" && (
              <Field label={tt("salary")} className="sm:col-span-2">
                <NumberInput min={0} value={e.salary.exact} onValue={(v) => setEmp(e.id, { salary: { exact: v ?? 0 } })} />
              </Field>
            )}
            {mode === "range" && (
              <>
                <Field label={`${tt("salary")} ${tt("min")}`}>
                  <NumberInput min={0} value={e.salary.range?.min} onValue={(v) => setEmp(e.id, { salary: { range: { min: v ?? 0, max: e.salary.range?.max ?? 0 } } })} />
                </Field>
                <Field label={tt("max")}>
                  <NumberInput min={0} value={e.salary.range?.max} onValue={(v) => setEmp(e.id, { salary: { range: { min: e.salary.range?.min ?? 0, max: v ?? 0 } } })} />
                </Field>
              </>
            )}
            {mode === "skip" && <div className="sm:col-span-2" />}
            <Field label={tt("section14")} hint={idx === 0 ? tt("section14Help") : undefined} className="sm:col-span-2">
              <Select value={e.section14} onChange={(ev) => setEmp(e.id, { section14: ev.target.value as Section14 })}>
                <option value="yes">{t("common.yes")}</option>
                <option value="no">{t("common.no")}</option>
                <option value="unknown">{t("common.unknown")}</option>
              </Select>
            </Field>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" checked={!!e.revenueFacing} onChange={(ev) => setEmp(e.id, { revenueFacing: ev.target.checked })} />
              {tt("revenueFacing")}
            </label>
            <div className="flex items-end justify-end gap-2 sm:col-span-2">
              <Button type="button" variant="ghost" onClick={() => add(e)}>
                {tt("duplicate")}
              </Button>
              <RemoveBtn onClick={() => update((p) => ({ ...p, employees: p.employees.filter((x) => x.id !== e.id) }))} />
            </div>
          </div>
        );
      })}
      <div>
        <Button type="button" variant="secondary" onClick={() => add()} data-testid="add-employee">
          + {tt("addEmployee")}
        </Button>
      </div>

      <div className="rounded-md border border-dashed border-line p-4">
        <label className="flex items-center gap-2 font-medium">
          <input
            type="checkbox"
            checked={!!hire}
            onChange={(e) =>
              update((p) => ({
                ...p,
                plannedHire: e.target.checked ? { role: "customer_service", grossSalary: 0, scopePct: 100, hoursPerWeekNeeded: 0, processes: [] } : undefined,
              }))
            }
            data-testid="plan-hire"
          />
          {tt("planHire")}
        </label>
        {hire && (
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            <Field label={tt("hireRole")}>
              <Select value={hire.role} onChange={(e) => update((p) => ({ ...p, plannedHire: { ...p.plannedHire!, role: e.target.value as Employee["role"] } }))}>
                {ROLE_KEYS.map((r) => (
                  <option key={r} value={r}>
                    {t(`enum.role.${r}`)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={tt("hireSalary")}>
              <NumberInput min={0} value={hire.grossSalary || undefined} onValue={(v) => update((p) => ({ ...p, plannedHire: { ...p.plannedHire!, grossSalary: v ?? 0 } }))} />
            </Field>
            <Field label={tt("hireScope")}>
              <NumberInput min={1} max={100} value={hire.scopePct} onValue={(v) => update((p) => ({ ...p, plannedHire: { ...p.plannedHire!, scopePct: Math.min(100, Math.max(1, v ?? 100)) } }))} />
            </Field>
            <Field label={tt("hireHours")}>
              <NumberInput min={0} max={100} value={hire.hoursPerWeekNeeded || undefined} onValue={(v) => update((p) => ({ ...p, plannedHire: { ...p.plannedHire!, hoursPerWeekNeeded: v ?? 0 } }))} />
            </Field>
            <fieldset className="sm:col-span-4">
              <legend className="mb-2 text-sm font-medium">{tt("hireProcesses")}</legend>
              <div className="flex flex-wrap gap-3">
                {PROCESS_KEYS.map((pk) => (
                  <label key={pk} className="flex items-center gap-1 text-sm">
                    <input
                      type="checkbox"
                      checked={hire.processes.includes(pk)}
                      onChange={(e) =>
                        update((p) => {
                          const cur = p.plannedHire!.processes;
                          return { ...p, plannedHire: { ...p.plannedHire!, processes: e.target.checked ? [...cur, pk] : cur.filter((x) => x !== pk) } };
                        })
                      }
                    />
                    {t(`enum.process.${pk}`)}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- Step 3: bottlenecks ---------------- */

export function BottlenecksStep({ profile, update }: StepProps) {
  const t = useTranslations();
  const tb = useTranslations("wizard.bottlenecks");

  const setB = (id: string, patch: Partial<Bottleneck>) =>
    update((p) => ({ ...p, bottlenecks: p.bottlenecks.map((b) => (b.id === id ? { ...b, ...patch } : b)) }));

  const prefill = () =>
    update((p) => {
      const confirmed = p.bottlenecks.filter((b) => b.hoursSource === "user");
      const have = new Set(confirmed.map((b) => b.process));
      return { ...p, bottlenecks: [...confirmed, ...benchmarkBottlenecks(p.vertical, p.employees).filter((b) => !have.has(b.process))] };
    });

  // First visit: pre-fill automatically so the owner only confirms (PRD §5.1).
  useEffect(() => {
    if (profile.bottlenecks.length === 0 && profile.employees.length > 0) prefill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">{tb("hint")}</p>
      {profile.employees.length === 0 ? (
        <p className="rounded bg-avoid-soft p-3 text-sm text-avoid">{tb("needTeam")}</p>
      ) : (
        <div>
          <Button type="button" variant="secondary" onClick={prefill}>
            {tb("prefill")}
          </Button>
        </div>
      )}
      {profile.bottlenecks.map((b) => (
        <div key={b.id} className="grid items-end gap-3 rounded-md border border-line p-4 sm:grid-cols-12" data-testid="bottleneck-row">
          <Field label={tb("process")} className="sm:col-span-3">
            <Select value={b.process} onChange={(e) => setB(b.id, { process: e.target.value as ProcessKey })}>
              {PROCESS_KEYS.map((pk) => (
                <option key={pk} value={pk}>
                  {t(`enum.process.${pk}`)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={tb("hours")} className="sm:col-span-2">
            <NumberInput min={0} value={b.hoursPerWeek} onValue={(v) => setB(b.id, { hoursPerWeek: Math.max(0, v ?? 0), hoursSource: "user" })} />
          </Field>
          <Field label={tb("people")} className="sm:col-span-1">
            <NumberInput min={1} value={b.peopleInvolved} onValue={(v) => setB(b.id, { peopleInvolved: Math.max(1, Math.round(v ?? 1)) })} />
          </Field>
          <Field label={tb("role")} className="sm:col-span-3">
            <Select value={b.role} onChange={(e) => setB(b.id, { role: e.target.value as Employee["role"] })}>
              {ROLE_KEYS.map((r) => (
                <option key={r} value={r}>
                  {t(`enum.role.${r}`)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={tb("pain")} className="sm:col-span-1">
            <Select value={b.pain} onChange={(e) => setB(b.id, { pain: Number(e.target.value) })}>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex items-center gap-2 sm:col-span-2">
            {b.hoursSource === "benchmark" ? (
              <Button type="button" variant="secondary" className="px-2 py-1 text-xs" onClick={() => setB(b.id, { hoursSource: "user" })} title={tb("benchmark")}>
                {tb("confirm")}
              </Button>
            ) : (
              <Badge tone="money">{tb("confirmed")}</Badge>
            )}
            <RemoveBtn onClick={() => update((p) => ({ ...p, bottlenecks: p.bottlenecks.filter((x) => x.id !== b.id) }))} />
          </div>
          {b.hoursSource === "benchmark" && <p className="text-xs text-avoid sm:col-span-12">{tb("benchmark")}</p>}
        </div>
      ))}
      <div>
        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            update((p) => ({
              ...p,
              bottlenecks: [...p.bottlenecks, { id: uid(), process: "data_entry", hoursPerWeek: 0, hoursSource: "user", peopleInvolved: 1, role: p.employees[0]?.role ?? "admin_coordinator", pain: 3 }],
            }))
          }
        >
          + {tb("add")}
        </Button>
      </div>
    </div>
  );
}

/* ---------------- Step 4: software ---------------- */

export function TechStep({ profile, update, catalog }: StepProps) {
  const t = useTranslations();
  const tt = useTranslations("wizard.tech");
  const setS = (id: string, patch: Partial<Subscription>) =>
    update((p) => ({ ...p, subscriptions: p.subscriptions.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">{tt("hint")}</p>
      {profile.subscriptions.map((s) => (
        <div key={s.id} className="grid items-end gap-3 rounded-md border border-line p-4 sm:grid-cols-12" data-testid="software-row">
          <Field label={tt("tool")} className="sm:col-span-3">
            <Select
              value={s.toolId ?? "__custom"}
              onChange={(e) => {
                const v = e.target.value;
                const tool = catalog.find((c) => c.id === v);
                setS(s.id, tool ? { toolId: tool.id, name: tool.name, category: undefined } : { toolId: undefined, name: s.toolId ? "" : s.name });
              }}
            >
              {catalog.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
              <option value="__custom">{tt("custom")}</option>
            </Select>
          </Field>
          {!s.toolId && (
            <>
              <Field label={tt("name")} className="sm:col-span-2">
                <Input value={s.name} maxLength={80} onChange={(e) => setS(s.id, { name: e.target.value })} />
              </Field>
              <Field label={tt("category")} className="sm:col-span-2">
                <Select value={s.category ?? ""} onChange={(e) => setS(s.id, { category: e.target.value || undefined })}>
                  <option value="">—</option>
                  {CAPABILITY_KEYS.map((c) => (
                    <option key={c} value={c}>
                      {t.has(`enum.cap.${c}` as never) ? t(`enum.cap.${c}` as never) : c}
                    </option>
                  ))}
                </Select>
              </Field>
            </>
          )}
          <Field label={tt("seats")} className="sm:col-span-1">
            <NumberInput min={0} value={s.seats} onValue={(v) => setS(s.id, { seats: Math.max(0, Math.round(v ?? 0)) })} />
          </Field>
          <Field label={tt("activeSeats")} className="sm:col-span-1">
            <NumberInput min={0} value={s.activeSeats} onValue={(v) => setS(s.id, { activeSeats: v === undefined ? undefined : Math.max(0, Math.round(v)) })} />
          </Field>
          <Field label={tt("cost")} className="sm:col-span-2">
            <NumberInput min={0} value={s.monthlyCostNis} onValue={(v) => setS(s.id, { monthlyCostNis: Math.max(0, v ?? 0) })} />
          </Field>
          <Field label={tt("usage")} className="sm:col-span-2">
            <Select value={s.usage} onChange={(e) => setS(s.id, { usage: e.target.value as UsageLevel })}>
              {(["high", "medium", "low", "unknown"] as const).map((u) => (
                <option key={u} value={u}>
                  {t(`enum.usage.${u}`)}
                </option>
              ))}
            </Select>
          </Field>
          <div className="sm:col-span-1">
            <RemoveBtn onClick={() => update((p) => ({ ...p, subscriptions: p.subscriptions.filter((x) => x.id !== s.id) }))} />
          </div>
        </div>
      ))}
      <div>
        <Button
          type="button"
          variant="secondary"
          data-testid="add-software"
          onClick={() =>
            update((p) => ({
              ...p,
              subscriptions: [...p.subscriptions, { id: uid(), toolId: catalog[0]?.id, name: catalog[0]?.name ?? "", seats: Math.max(1, p.employees.length), monthlyCostNis: 0, usage: "unknown" }],
            }))
          }
        >
          + {tt("add")}
        </Button>
      </div>
    </div>
  );
}

/* ---------------- Step 5: enrichment (optional) ---------------- */

interface Suggestions {
  bottlenecks: Bottleneck[];
  subscriptions: Subscription[];
  employees: Employee[];
}

export function EnrichStep({ profile, update, aiEnabled }: StepProps) {
  const t = useTranslations();
  const te = useTranslations("wizard.enrich");
  const locale = useLocale();
  const [uploadMsg, setUploadMsg] = useState<string>();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [sugg, setSugg] = useState<Suggestions>();
  const [aiError, setAiError] = useState<string>();

  async function onFile(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const json = await res.json();
    if (!res.ok) return setUploadMsg(te("uploadError", { error: json.error ?? res.status }));
    update((p) => ({
      ...p,
      filesUploaded: true,
      employees: [...p.employees, ...(json.employees as Employee[])],
      subscriptions: [...p.subscriptions, ...(json.subscriptions as Subscription[])],
      employeeCount: Math.max(p.employeeCount, p.employees.length + json.employees.length),
    }));
    setUploadMsg(te("uploaded", { count: json.employees.length + json.subscriptions.length }));
  }

  async function analyzeText() {
    setBusy(true);
    setAiError(undefined);
    const res = await fetch("/api/ai/parse", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text, locale, vertical: profile.vertical }) });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return setAiError(json.error ?? String(res.status));
    setSugg(json);
    update((p) => ({ ...p, freeTextProvided: true }));
  }

  const take = <K extends keyof Suggestions>(k: K, item: Suggestions[K][number]) => {
    update((p) => ({ ...p, [k]: [...(p[k] as unknown[]), item] }));
    setSugg((s) => (s ? { ...s, [k]: (s[k] as { id: string }[]).filter((x) => x.id !== item.id) } : s));
  };

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted">{te("hint")}</p>
      <section className="flex flex-col gap-3">
        <p className="text-sm">{te("templates")}</p>
        <div className="flex flex-wrap gap-4 text-sm">
          <a className="text-brand underline" href="/templates/team.csv" download>
            {te("tplEmployees")}
          </a>
          <a className="text-brand underline" href="/templates/software.csv" download>
            {te("tplSoftware")}
          </a>
        </div>
        <label className="text-sm font-medium">
          {te("upload")}
          <input
            type="file"
            accept=".csv,.xlsx"
            className="mt-1 block text-sm"
            data-testid="upload-input"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
              e.target.value = "";
            }}
          />
        </label>
        {uploadMsg && <p className="text-sm text-muted" data-testid="upload-msg">{uploadMsg}</p>}
      </section>

      <section className="flex flex-col gap-3">
        <Field label={te("freeText")} hint={aiEnabled ? te("aiNote") : te("noAi")}>
          <textarea rows={5} maxLength={4000} value={text} onChange={(e) => setText(e.target.value)} placeholder={te("freeTextPlaceholder")} className="rounded-md border border-line p-3 text-sm" disabled={!aiEnabled} />
        </Field>
        <div>
          <Button type="button" variant="secondary" disabled={!aiEnabled || busy || text.trim().length < 10} onClick={analyzeText}>
            {busy ? te("analyzing") : te("analyze")}
          </Button>
        </div>
        {aiError && <p className="text-sm text-warn">{aiError}</p>}
        {sugg && (
          <div className="flex flex-col gap-2 rounded-md bg-bg p-3 text-sm">
            <p className="font-medium">{te("suggestions")}</p>
            {sugg.bottlenecks.map((b) => (
              <div key={b.id} className="flex items-center gap-3">
                <span className="flex-1">
                  {t(`enum.process.${b.process}`)} · {b.hoursPerWeek > 0 ? t("common.hours", { value: b.hoursPerWeek }) : "?"}
                </span>
                <Button type="button" variant="secondary" className="px-2 py-1" onClick={() => take("bottlenecks", b)}>
                  {te("accept")}
                </Button>
              </div>
            ))}
            {sugg.subscriptions.map((s) => (
              <div key={s.id} className="flex items-center gap-3">
                <span className="flex-1">{s.name}{s.monthlyCostNis > 0 ? ` · ₪${s.monthlyCostNis}` : ""}</span>
                <Button type="button" variant="secondary" className="px-2 py-1" onClick={() => take("subscriptions", s)}>
                  {te("accept")}
                </Button>
              </div>
            ))}
            {sugg.employees.map((e) => (
              <div key={e.id} className="flex items-center gap-3">
                <span className="flex-1">{t(`enum.role.${e.role}`)}{e.title ? ` · ${e.title}` : ""}</span>
                <Button type="button" variant="secondary" className="px-2 py-1" onClick={() => take("employees", e)}>
                  {te("accept")}
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/* ---------------- Step 6: clarifications ---------------- */

export function ClarifyStep({ profile, update, aiEnabled }: StepProps) {
  const t = useTranslations();
  const render = useMsg();
  const locale = useLocale();
  const qs = openQuestions(profile);
  const [phrasing, setPhrasing] = useState<Record<string, string>>({});
  const ids = qs.map((q) => q.id).join(",");

  useEffect(() => {
    if (!aiEnabled || qs.length === 0) return;
    const ctrl = new AbortController();
    fetch("/api/ai/clarify", {
      method: "POST",
      signal: ctrl.signal,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ locale, vertical: profile.vertical, goal: profile.goal, questions: qs.map((q) => ({ id: q.id, text: render(q.message) })) }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => j?.phrasing && setPhrasing(j.phrasing))
      .catch(() => undefined);
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids, aiEnabled, locale]);

  const setEmp = (id: string, patch: Partial<Employee>) =>
    update((p) => ({ ...p, employees: p.employees.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">{t("wizard.clarify.hint")}</p>
      {qs.length === 0 && <p className="rounded bg-brand-soft p-3 text-sm">{t("wizard.clarify.none")}</p>}
      {qs.map((q) => {
        const [kind, ref] = [q.id.split("_")[0], q.id.slice(q.id.indexOf("_") + 1)];
        const label = phrasing[q.id] || render(q.message);
        const emp = profile.employees.find((e) => e.id === ref);
        const sub = profile.subscriptions.find((s) => s.id === ref);
        return (
          <div key={q.id} className="grid items-end gap-3 rounded-md border border-line p-4 sm:grid-cols-[2fr_1fr]">
            <p className="text-sm">{label}</p>
            {kind === "s14" && emp && (
              <Select value={emp.section14} onChange={(e) => setEmp(emp.id, { section14: e.target.value as Section14 })}>
                <option value="unknown">{t("common.unknown")}</option>
                <option value="yes">{t("common.yes")}</option>
                <option value="no">{t("common.no")}</option>
              </Select>
            )}
            {kind === "tenure" && emp && <NumberInput min={0} value={emp.tenureYears} onValue={(v) => setEmp(emp.id, { tenureYears: v })} />}
            {kind === "usage" && sub && (
              <Select
                value={sub.usage}
                onChange={(e) => update((p) => ({ ...p, subscriptions: p.subscriptions.map((s) => (s.id === sub.id ? { ...s, usage: e.target.value as UsageLevel } : s)) }))}
              >
                {(["unknown", "high", "medium", "low"] as const).map((u) => (
                  <option key={u} value={u}>
                    {t(`enum.usage.${u}`)}
                  </option>
                ))}
              </Select>
            )}
            {q.id === "rev_per_hour" && (
              <NumberInput min={0} value={profile.settings.revenuePerHourNis} onValue={(v) => update((p) => ({ ...p, settings: { ...p.settings, revenuePerHourNis: v } }))} />
            )}
          </div>
        );
      })}
    </div>
  );
}
