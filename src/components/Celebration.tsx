"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { WELCOME_COOKIE } from "@/lib/welcome";
import { Button } from "./ui";

const COLORS = ["#0f6e5c", "#3b5bdb", "#f2b705", "#e8590c", "#d6336c", "#20c997"];
const DURATION_MS = 3500;

type Piece = { x: number; y: number; vx: number; vy: number; size: number; rot: number; vr: number; color: string };

/**
 * One-time welcome for a new user's first diagnosis: a confetti burst plus a short
 * message. Confetti is skipped for users who prefer reduced motion; the message
 * still shows. The welcome cookie is deleted right away, so a refresh or the back
 * button doesn't replay it.
 *
 * `active` is only read on mount: the page stays rendered with the component in
 * place, so a later server refresh (wizard autosave), which sees the cookie gone,
 * doesn't close the dialog early.
 */
export function Celebration({ active }: { active: boolean }) {
  const t = useTranslations("celebration");
  const [shown] = useState(active);
  const [open, setOpen] = useState(active);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (shown) document.cookie = `${WELCOME_COOKIE}=; path=/; max-age=0; samesite=lax`;
  }, [shown]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!shown || !canvas || !ctx || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const w = window.innerWidth;
    const h = window.innerHeight;
    const pieces: Piece[] = Array.from({ length: 160 }, (_, i) => {
      const fromLeft = i % 2 === 0;
      const angle = (fromLeft ? -60 : -120) * (Math.PI / 180) + (Math.random() - 0.5) * 0.9;
      const speed = 9 + Math.random() * 9;
      return {
        x: fromLeft ? 0 : w,
        y: h * 0.75,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 6 + Math.random() * 6,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        color: COLORS[i % COLORS.length],
      };
    });

    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const elapsed = now - start;
      ctx.clearRect(0, 0, w, h);
      ctx.globalAlpha = Math.max(0, 1 - Math.max(0, elapsed - DURATION_MS * 0.7) / (DURATION_MS * 0.3));
      for (const p of pieces) {
        p.vy += 0.25;
        p.vx *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      }
      if (elapsed < DURATION_MS) frame = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, w, h);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, [shown]);

  if (!shown) return null;
  return (
    <>
      <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-[60] h-full w-full" aria-hidden data-testid="confetti" />
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="celebration-title"
            data-testid="celebration"
            onClick={(e) => e.stopPropagation()}
            className="flex w-full max-w-sm flex-col items-center gap-4 rounded-lg border border-line bg-surface p-6 text-center shadow-lg"
          >
            <span className="text-4xl" aria-hidden>
              🎉
            </span>
            <h2 id="celebration-title" className="text-xl font-bold">
              {t("title")}
            </h2>
            <Button autoFocus onClick={() => setOpen(false)}>
              {t("cta")}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
