import { NextResponse } from "next/server";
import { z } from "zod";
import { aiEnabled, aiErrorMessage } from "@/ai/client";
import { parseFreeText } from "@/ai/parseFreeText";
import { currentUser } from "@/lib/auth";

const body = z.object({ text: z.string().min(10).max(4000) });

export async function POST(req: Request) {
  if (!(await currentUser())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!aiEnabled()) return NextResponse.json({ error: "ai_disabled" }, { status: 503 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  try {
    return NextResponse.json(await parseFreeText(parsed.data.text));
  } catch (e) {
    console.error("[ai/parse]", e);
    return NextResponse.json({ error: aiErrorMessage(e) }, { status: 502 });
  }
}
