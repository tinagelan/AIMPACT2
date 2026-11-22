"use client";

import { useTranslations } from "next-intl";
import type { Msg } from "@/engine/types";
import { ROLE_KEYS } from "@/lib/profileSchema";

/**
 * Renders engine messages. Parameters that are enum keys (process, capability,
 * role titles) are translated first so sentences read naturally in each language.
 */
export function useMsg() {
  const t = useTranslations();
  return (m: Msg): string => {
    const params: Record<string, string | number> = {};
    for (const [k, v] of Object.entries(m.params ?? {})) {
      if (k === "process" && typeof v === "string") params[k] = t(`enum.process.${v}` as never);
      else if (k === "capability" && typeof v === "string") params[k] = t.has(`enum.cap.${v}` as never) ? t(`enum.cap.${v}` as never) : v.replace(/^custom:/, "");
      else if (k === "title" && typeof v === "string" && (ROLE_KEYS as readonly string[]).includes(v)) params[k] = t(`enum.role.${v}` as never);
      else if (typeof v === "number") params[k] = Math.round(v).toLocaleString("en-US");
      else params[k] = v;
    }
    return t.has(m.key as never) ? t(m.key as never, params as never) : m.key;
  };
}

export function formatNis(n: number): string {
  return `₪${Math.round(n).toLocaleString("en-US")}`;
}
