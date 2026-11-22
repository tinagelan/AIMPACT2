import { NextResponse } from "next/server";
import { verifyLoginToken } from "@/lib/auth";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";
  const locale = url.searchParams.get("locale") === "en" ? "en" : "he";
  const ok = token ? await verifyLoginToken(token) : null;
  return NextResponse.redirect(new URL(ok ? `/${locale}/app?welcome=1` : `/${locale}/login?error=invalid`, url.origin));
}
