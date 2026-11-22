import { NextResponse } from "next/server";
import { parseCsv, parseXlsx, rowsToRecords } from "@/ingest/parse";
import { currentUser } from "@/lib/auth";

const MAX_BYTES = 2 * 1024 * 1024;

/**
 * Ephemeral import (PRD risk 1): the file is read in memory, converted to rows and
 * discarded. Nothing is written to disk or the database here — the client merges
 * the returned records into the profile, which the owner can still edit.
 */
export async function POST(req: Request) {
  if (!(await currentUser())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "no_file" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "too_large" }, { status: 413 });

  const name = file.name.toLowerCase();
  try {
    const rows = name.endsWith(".xlsx") ? await parseXlsx(await file.arrayBuffer()) : name.endsWith(".csv") ? parseCsv(await file.text()) : null;
    if (!rows) return NextResponse.json({ error: "unsupported_type" }, { status: 415 });
    return NextResponse.json(rowsToRecords(rows));
  } catch (e) {
    console.error("[upload] parse failed", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "unreadable" }, { status: 422 });
  }
}
