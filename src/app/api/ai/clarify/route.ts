import { NextResponse } from "next/server";
import { z } from "zod";
import { aiEnabled } from "@/ai/client";
import { phraseQuestions } from "@/ai/clarifyingQuestions";
import { currentUser } from "@/lib/auth";

const body = z.object({
  locale: z.enum(["he", "en"]),
  vertical: z.string().max(40),
  goal: z.string().max(500).default(""),
  questions: z.array(z.object({ id: z.string().max(80), text: z.string().max(300) })).max(30),
});

export async function POST(req: Request) {
  if (!(await currentUser())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!aiEnabled()) return NextResponse.json({ phrasing: {} });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  try {
    return NextResponse.json({ phrasing: await phraseQuestions(parsed.data) });
  } catch (e) {
    console.error("[ai/clarify]", e);
    return NextResponse.json({ phrasing: {} }); // fall back to the static questions
  }
}
