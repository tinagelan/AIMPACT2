import { NextResponse } from "next/server";
import { signOut } from "@/lib/auth";

export async function POST(req: Request) {
  const url = new URL(req.url);
  const locale = url.searchParams.get("locale") === "en" ? "en" : "he";
  await signOut();
  return NextResponse.redirect(new URL(`/${locale}`, url.origin), 303);
}
