"use client";

import { useEffect, useRef } from "react";

interface MatrixRainProps {
  onExit: () => void;
  durationMs?: number;
}

const CHARS = "ｦｧｨｩｪｫｬｭｮｯｰｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈ0123456789ABCDEF<>/\\|*+-";

export function MatrixRain({ onExit, durationMs = 10000 }: MatrixRainProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const fontSize = 16;
    let cssW = 0;
    let cssH = 0;
    let cols = 0;
    let drops: number[] = [];
    let speeds: number[] = [];

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      cssW = Math.max(1, Math.floor(rect.width));
      cssH = Math.max(1, Math.floor(rect.height));
      canvas.width = Math.floor(cssW * dpr);
      canvas.height = Math.floor(cssH * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.max(1, Math.floor(cssW / fontSize));
      drops = Array.from({ length: cols }, () => Math.random() * (cssH / fontSize) * -1);
      speeds = Array.from({ length: cols }, () => 0.45 + Math.random() * 0.95);
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, cssW, cssH);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let lastT = performance.now();
    const start = lastT;

    const tick = (t: number) => {
      const dt = Math.min(50, t - lastT);
      lastT = t;

      // Trail fade
      ctx.fillStyle = "rgba(0, 0, 0, 0.07)";
      ctx.fillRect(0, 0, cssW, cssH);

      ctx.font = `${fontSize}px JetBrains Mono, "JetBrains Mono", monospace`;
      ctx.textBaseline = "top";

      for (let i = 0; i < cols; i += 1) {
        const ch = CHARS[Math.floor(Math.random() * CHARS.length)];
        const y = drops[i] * fontSize;

        // Bright leading head
        ctx.fillStyle = "#dbffd6";
        ctx.shadowColor = "#a6e3a1";
        ctx.shadowBlur = 6;
        ctx.fillText(ch, i * fontSize, y);

        // Faint trail char a few rows back
        ctx.shadowBlur = 0;
        ctx.fillStyle = "rgba(166, 227, 161, 0.55)";
        const trailY = (drops[i] - 1) * fontSize;
        if (trailY > 0) {
          const trailCh = CHARS[Math.floor(Math.random() * CHARS.length)];
          ctx.fillText(trailCh, i * fontSize, trailY);
        }

        drops[i] += speeds[i] * (dt / 16);
        if (y > cssH && Math.random() > 0.972) {
          drops[i] = -2;
          speeds[i] = 0.45 + Math.random() * 0.95;
        }
      }

      if (t - start >= durationMs) {
        onExit();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    const onKey = () => onExit();
    const onClick = () => onExit();
    window.addEventListener("keydown", onKey);
    canvas.addEventListener("click", onClick);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      window.removeEventListener("keydown", onKey);
      canvas.removeEventListener("click", onClick);
    };
  }, [durationMs, onExit]);

  return (
    <div className="matrix-overlay">
      <canvas ref={canvasRef} />
      <div className="matrix-exit-hint">PRESS ANY KEY TO EXIT</div>
    </div>
  );
}
