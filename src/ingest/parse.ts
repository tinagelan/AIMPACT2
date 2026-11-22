import Papa from "papaparse";
import { SEED_TOOLS } from "@/catalog/seedTools";
import type { Employee, Subscription } from "@/engine/types";
import { employeeSchema, ROLE_KEYS, subscriptionSchema } from "@/lib/profileSchema";

export type Row = Record<string, string>;

const uid = () => Math.random().toString(36).slice(2, 10);
const num = (v: string | undefined) => {
  if (v === undefined || v.trim() === "") return undefined;
  const n = Number(v.replace(/[,₪\s]/g, ""));
  return Number.isFinite(n) ? n : undefined;
};
const norm = (s: string) => s.trim().toLowerCase().replace(/[\s-]+/g, "_");

export function parseCsv(text: string): Row[] {
  const res = Papa.parse<Row>(text.replace(/^﻿/, ""), { header: true, skipEmptyLines: true, transformHeader: norm });
  return res.data;
}

export async function parseXlsx(buf: ArrayBuffer): Promise<Row[]> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const ws = wb.worksheets[0];
  if (!ws) return [];
  const headers: string[] = [];
  const rows: Row[] = [];
  ws.eachRow((row, i) => {
    const values = (row.values as unknown[]).slice(1).map((v) => (v === null || v === undefined ? "" : typeof v === "object" && "text" in (v as object) ? String((v as { text: unknown }).text) : String(v)));
    if (i === 1) headers.push(...values.map(norm));
    else rows.push(Object.fromEntries(headers.map((h, j) => [h, values[j] ?? ""])));
  });
  return rows;
}

/** Converts template rows into typed, validated records. Invalid rows are skipped. */
export function rowsToRecords(rows: Row[]): { employees: Employee[]; subscriptions: Subscription[]; skipped: number } {
  const employees: Employee[] = [];
  const subscriptions: Subscription[] = [];
  let skipped = 0;
  for (const r of rows) {
    if (r.role !== undefined) {
      const role = (ROLE_KEYS as readonly string[]).includes(norm(r.role)) ? norm(r.role) : "other";
      const exact = num(r.gross_salary);
      const min = num(r.salary_min);
      const max = num(r.salary_max);
      const s14 = norm(r.section14 ?? "");
      const candidate = {
        id: uid(),
        role,
        title: r.title?.trim() || undefined,
        scopePct: Math.min(100, Math.max(0, num(r.scope_pct) ?? 100)),
        salary: exact !== undefined ? { exact } : min !== undefined || max !== undefined ? { range: { min: min ?? max!, max: max ?? min! } } : {},
        tenureYears: num(r.tenure_years),
        section14: s14 === "yes" || s14 === "כן" ? "yes" : s14 === "no" || s14 === "לא" ? "no" : "unknown",
        revenueFacing: ["yes", "true", "1", "כן"].includes(norm(r.revenue_facing ?? "")),
      };
      const ok = employeeSchema.safeParse(candidate);
      if (ok.success) employees.push(ok.data as Employee);
      else skipped++;
    } else if (r.tool !== undefined) {
      const name = r.tool.trim();
      const tool = SEED_TOOLS.find((t) => t.id === norm(name) || t.name.toLowerCase() === name.toLowerCase());
      const usage = norm(r.usage ?? "");
      const candidate = {
        id: uid(),
        toolId: tool?.id,
        name: tool?.name ?? name,
        category: tool ? undefined : r.category?.trim() || undefined,
        seats: Math.round(num(r.seats) ?? 1),
        activeSeats: num(r.active_seats) !== undefined ? Math.round(num(r.active_seats)!) : undefined,
        monthlyCostNis: num(r.monthly_cost_nis) ?? 0,
        usage: ["high", "medium", "low"].includes(usage) ? usage : "unknown",
      };
      const ok = subscriptionSchema.safeParse(candidate);
      if (ok.success && name) subscriptions.push(ok.data as Subscription);
      else skipped++;
    } else skipped++;
  }
  return { employees, subscriptions, skipped };
}
