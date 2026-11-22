"use client";

import { useState, useTransition } from "react";
import { requestPriceCheck } from "../actions";

export function PriceCheckButton({ toolId, label }: { toolId: string; label: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string>();
  return (
    <span className="flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        className="rounded border border-line px-2 py-1 text-xs disabled:opacity-50"
        onClick={() => start(async () => {
          const r = await requestPriceCheck(toolId);
          setMsg(r.ok ? "✓" : r.error);
        })}
      >
        {pending ? "…" : label}
      </button>
      {msg && <span className="text-xs text-muted">{msg}</span>}
    </span>
  );
}
