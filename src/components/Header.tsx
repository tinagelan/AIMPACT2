import { Suspense } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { currentUser, isAdmin } from "@/lib/auth";
import { LanguageSwitch } from "./LanguageSwitch";

export async function Header() {
  const t = await getTranslations("common");
  const user = await currentUser();
  const locale = await getLocale();
  return (
    <header className="no-print border-b border-line bg-surface">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3">
        <Link href="/" className="text-lg font-bold text-brand">
          {t("appName")}
        </Link>
        <nav className="flex flex-1 flex-wrap items-center gap-4 text-sm text-muted">
          {user && <Link href="/app">{t("dashboard")}</Link>}
          <Link href="/pricing">{t("pricing")}</Link>
          {user && isAdmin(user.email) && <Link href="/admin/catalog">{t("admin")}</Link>}
        </nav>
        <Suspense>
          <LanguageSwitch label={t("language")} />
        </Suspense>
        {user ? (
          <form action={`/api/auth/signout?locale=${locale}`} method="post">
            <button className="text-sm text-muted hover:text-ink">{t("signOut")}</button>
          </form>
        ) : (
          <Link href="/login" className="text-sm font-medium text-brand">
            {t("signIn")}
          </Link>
        )}
      </div>
    </header>
  );
}
