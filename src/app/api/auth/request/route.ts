import { NextResponse } from "next/server";
import { z } from "zod";
import { createLoginLink } from "@/lib/auth";

const body = z.object({ email: z.string().email().max(200), locale: z.enum(["he", "en"]) });

export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
  const link = await createLoginLink(parsed.data.email, parsed.data.locale);
  // The link is returned to the browser ONLY in development (no mail server locally).
  return NextResponse.json({ ok: true, devLink: process.env.NODE_ENV !== "production" ? link : undefined });
}
