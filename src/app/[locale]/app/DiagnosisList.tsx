"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { deleteDiagnosis } from "@/app/actions";
import { Badge, Button, cx } from "@/components/ui";
import { Link } from "@/i18n/navigation";

export interface DiagnosisItem {
  id: string;
  orgName: string;
  verticalLabel: string;
  status: "in_progress" | "completed";
  tier: "free" | "paid";
}

/** idle → deleting (server call, spinner) → removing (collapse animation) → gone */
type Phase = "idle" | "deleting" | "removing";

const COLLAPSE_MS = 450;

export function DiagnosisList({ items: initial }: { items: DiagnosisItem[] }) {
  const t = useTranslations("dashboard");
  const [items, setItems] = useState(initial);
  const [phase, setPhase] = useState<Record<string, Phase>>({});
  const [pending, setPending] = useState<DiagnosisItem | null>(null);
  const [toast, setToast] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (pending) dialog.current?.showModal();
    else dialog.current?.close();
  }, [pending]);

  useEffect(() => {
    if (!toast) return;
    const h = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(h);
  }, [toast]);

  async function confirmDelete() {
    const item = pending;
    if (!item) return;
    setPending(null);
    setPhase((p) => ({ ...p, [item.id]: "deleting" }));
    let ok = false;
    try {
      ok = (await deleteDiagnosis(item.id)).ok;
    } catch {
      ok = false;
    }
    if (!ok) {
      setPhase((p) => ({ ...p, [item.id]: "idle" }));
      setToast({ tone: "error", text: t("deleteError", { name: item.orgName }) });
      return;
    }
    setPhase((p) => ({ ...p, [item.id]: "removing" }));
    setTimeout(() => {
      setItems((list) => list.filter((x) => x.id !== item.id));
      setToast({ tone: "ok", text: t("deleted", { name: item.orgName }) });
    }, COLLAPSE_MS);
  }

  return (
    <>
      {items.length === 0 && <p className="text-muted">{t("empty")}</p>}
      <ul className="flex flex-col" aria-label={t("title")}>
        {items.map((d) => {
          const ph = phase[d.id] ?? "idle";
          const busy = ph !== "idle";
          return (
            <li
              key={d.id}
              data-testid="diagnosis-card"
              data-phase={ph}
              className={cx(
                "grid transition-all ease-in-out motion-reduce:transition-none",
                ph === "removing" ? "mb-0 grid-rows-[0fr] -translate-x-4 opacity-0" : "mb-3 grid-rows-[1fr] opacity-100",
              )}
              style={{ transitionDuration: `${COLLAPSE_MS}ms` }}
            >
              <div className="overflow-hidden">
                <div
                  aria-busy={busy}
                  className={cx(
                    "card relative flex flex-wrap items-center gap-3 rounded-lg border p-5 shadow-sm transition-colors duration-300",
                    busy ? "border-warn bg-warn-soft" : "border-line bg-surface",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className={cx("font-semibold", busy && "text-warn line-through")}>{d.orgName}</div>
                    <div className="text-sm text-muted">{d.verticalLabel}</div>
                  </div>
                  {busy ? (
                    <span className="flex items-center gap-2 text-sm font-medium text-warn" role="status">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-warn border-t-transparent motion-reduce:animate-none" aria-hidden />
                      {t("deleting")}
                    </span>
                  ) : (
                    <>
                      <Badge tone={d.status === "completed" ? "money" : "neutral"}>{t(d.status)}</Badge>
                      <Badge tone={d.tier === "paid" ? "brand" : "neutral"}>{t(d.tier)}</Badge>
                      <Link href={`/diagnosis/${d.id}/wizard`} className="text-sm text-brand underline">
                        {t("continue")}
                      </Link>
                      {d.status === "completed" && (
                        <Link href={`/diagnosis/${d.id}/report`} className="text-sm font-medium text-brand underline">
                          {t("report")}
                        </Link>
                      )}
                      <Button
                        type="button"
                        variant="danger"
                        className="px-2 py-1"
                        onClick={() => setPending(d)}
                        aria-label={t("deleteAria", { name: d.orgName })}
                        data-testid="delete-diagnosis"
                      >
                        <TrashIcon />
                        {t("delete")}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <dialog
        ref={dialog}
        onClose={() => setPending(null)}
        aria-labelledby="delete-title"
        className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-lg border border-line bg-surface p-0 text-ink shadow-xl backdrop:bg-black/40"
        data-testid="delete-dialog"
      >
        {pending && (
          <div className="flex flex-col gap-4 p-6">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warn-soft text-warn">
                <TrashIcon />
              </span>
              <div>
                <h2 id="delete-title" className="text-lg font-semibold">
                  {t("deleteTitle")}
                </h2>
                <p className="mt-1 text-sm text-muted">{t("deleteBody", { name: pending.orgName })}</p>
              </div>
            </div>
            {pending.tier === "paid" && <p className="rounded-md bg-avoid-soft p-3 text-sm text-avoid">{t("deletePaidWarning")}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setPending(null)} autoFocus>
                {t("cancel")}
              </Button>
              <Button type="button" className="bg-warn text-white hover:opacity-90" onClick={confirmDelete} data-testid="confirm-delete">
                {t("confirmDelete")}
              </Button>
            </div>
          </div>
        )}
      </dialog>

      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 flex justify-center px-4">
        {toast && (
          <div
            role="status"
            data-testid="delete-toast"
            className={cx(
              "pointer-events-auto rounded-md px-4 py-2 text-sm font-medium shadow-lg",
              toast.tone === "ok" ? "bg-ink text-surface" : "bg-warn text-white",
            )}
          >
            {toast.tone === "ok" ? "✓ " : ""}
            {toast.text}
          </div>
        )}
      </div>
    </>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
    </svg>
  );
}
