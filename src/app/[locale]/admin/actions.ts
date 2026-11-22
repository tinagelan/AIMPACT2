"use server";

import { revalidatePath } from "next/cache";
import { aiEnabled, aiErrorMessage } from "@/ai/client";
import { proposePrice } from "@/catalog/verifyPrice";
import { currentUser, isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

async function requireAdmin() {
  const user = await currentUser();
  if (!user || !isAdmin(user.email)) throw new Error("forbidden");
}

export async function markVerified(toolId: string) {
  await requireAdmin();
  await db.catalogTool.update({ where: { id: toolId }, data: { lastVerifiedAt: new Date() } });
  revalidatePath("/[locale]/admin/catalog", "page");
}

export async function requestPriceCheck(toolId: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  if (!aiEnabled()) return { ok: false, error: "ai_disabled" };
  const tool = await db.catalogTool.findUniqueOrThrow({ where: { id: toolId } });
  try {
    const p = await proposePrice(tool);
    if (!p) return { ok: false, error: "no_price_found" };
    await db.priceProposal.create({ data: { toolId, usdPerSeatMonth: p.usdPerSeatMonth, usdFlatMonth: p.usdFlatMonth, evidence: p.evidence } });
    revalidatePath("/[locale]/admin/catalog", "page");
    return { ok: true };
  } catch (e) {
    console.error("[admin] price check failed", e);
    return { ok: false, error: e instanceof Error && e.message.startsWith("fetch_") ? e.message : aiErrorMessage(e) };
  }
}

export async function decideProposal(id: string, approve: boolean) {
  await requireAdmin();
  const p = await db.priceProposal.findUniqueOrThrow({ where: { id } });
  if (approve) {
    await db.catalogTool.update({
      where: { id: p.toolId },
      data: {
        ...(p.usdPerSeatMonth !== null ? { usdPerSeatMonth: p.usdPerSeatMonth } : {}),
        ...(p.usdFlatMonth !== null ? { usdFlatMonth: p.usdFlatMonth } : {}),
        lastVerifiedAt: new Date(),
      },
    });
  }
  await db.priceProposal.update({ where: { id }, data: { status: approve ? "approved" : "rejected" } });
  revalidatePath("/[locale]/admin/catalog", "page");
}
