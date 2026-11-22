"use client";

import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";

export function LanguageSwitch({ label }: { label: string }) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const other = locale === "he" ? "en" : "he";
  return (
    <button
      type="button"
      className="rounded border border-line px-2 py-1 text-sm text-muted hover:text-ink"
      onClick={() => {
        const qs = search.toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname, { locale: other });
      }}
    >
      {label}
    </button>
  );
}
