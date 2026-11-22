"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";

const VISIBLE_MS = 3500;
const FADE_MS = 400;

/** Short "welcome back" toast shown right after login; fades out by itself. */
export function WelcomeToast({ message }: { message: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [phase, setPhase] = useState<"in" | "out" | "gone">("in");

  useEffect(() => {
    // Drop ?welcome=1 so a refresh doesn't show the toast again.
    router.replace(pathname, { scroll: false });
    const fade = setTimeout(() => setPhase("out"), VISIBLE_MS);
    const hide = setTimeout(() => setPhase("gone"), VISIBLE_MS + FADE_MS);
    return () => {
      clearTimeout(fade);
      clearTimeout(hide);
    };
  }, [router, pathname]);

  if (phase === "gone") return null;

  return (
    <div
      role="status"
      aria-live="polite"
      onClick={() => setPhase("out")}
      className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 cursor-pointer rounded-lg bg-brand px-5 py-3 text-sm font-medium text-brand-ink shadow-lg transition-all duration-[400ms] ${
        phase === "in" ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      }`}
    >
      {message}
    </div>
  );
}
