import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Badge, Card } from "@/components/ui";
import { isStale } from "@/engine/context";
import { fromDb } from "@/catalog/repository";
import { Link } from "@/i18n/navigation";
import { currentUser, isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { decideProposal, markVerified } from "../actions";
import { PriceCheckButton } from "./PriceCheckButton";

export default async function AdminCatalog({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await currentUser();
  if (!user || !isAdmin(user.email)) notFound();
  const t = await getTranslations("admin");
  const rows = await db.catalogTool.findMany({ orderBy: [{ lastVerifiedAt: "asc" }, { name: "asc" }] });
  const proposals = await db.priceProposal.findMany({ where: { status: "pending" }, include: { tool: true }, orderBy: { createdAt: "desc" } });
  const now = new Date();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <h1 className="flex-1 text-2xl font-bold">{t("catalog")}</h1>
        <Link href="/admin/metrics" className="text-sm text-brand underline">
          {t("metrics")}
        </Link>
      </div>

      {proposals.length > 0 && (
        <Card>
          <h2 className="mb-3 font-semibold">{t("proposals")}</h2>
          <div className="flex flex-col gap-3">
            {proposals.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center gap-3 text-sm">
                <span className="font-medium">{p.tool.name}</span>
                <span className="num">
                  ${p.tool.usdPerSeatMonth} → ${p.usdPerSeatMonth ?? "—"}/seat · flat ${p.tool.usdFlatMonth ?? 0} → ${p.usdFlatMonth ?? "—"}
                </span>
                <q className="flex-1 text-xs text-muted">{p.evidence}</q>
                <form action={decideProposal.bind(null, p.id, true)}>
                  <button className="rounded bg-brand px-2 py-1 text-xs text-brand-ink">{t("approve")}</button>
                </form>
                <form action={decideProposal.bind(null, p.id, false)}>
                  <button className="rounded border border-line px-2 py-1 text-xs">{t("reject")}</button>
                </form>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full text-sm">
          <thead className="bg-bg text-xs text-muted">
            <tr>
              <th className="px-3 py-2 text-start">Tool</th>
              <th className="px-3 py-2 text-start">$/seat · flat</th>
              <th className="px-3 py-2 text-start">{t("lastVerified")}</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const tool = fromDb(row);
              const stale = isStale(tool, now);
              return (
                <tr key={tool.id} className="border-t border-line">
                  <td className="px-3 py-2">
                    <a href={tool.pricingUrl} target="_blank" rel="noopener noreferrer" className="text-brand underline">
                      {tool.name}
                    </a>
                  </td>
                  <td className="num px-3 py-2">
                    ${tool.usdPerSeatMonth} · ${tool.usdFlatMonth ?? 0}
                  </td>
                  <td className="px-3 py-2">
                    <Badge tone={stale ? "avoid" : "money"}>{stale ? t("stale") : t("fresh")}</Badge>{" "}
                    <span className="text-xs text-muted">{tool.lastVerifiedAt?.slice(0, 10) ?? t("never")}</span>
                  </td>
                  <td className="flex gap-2 px-3 py-2">
                    <form action={markVerified.bind(null, tool.id)}>
                      <button className="rounded border border-line px-2 py-1 text-xs">{t("markVerified")}</button>
                    </form>
                    <PriceCheckButton toolId={tool.id} label={t("verifyAi")} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
