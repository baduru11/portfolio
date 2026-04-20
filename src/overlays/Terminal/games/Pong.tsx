"use client";

import { useEffect, useRef, useState } from "react";
import { SFX, playSfx } from "@/lib/useSfx";
import { useSceneStore } from "@/scene/useSceneStore";

const W = 640;
const H = 360;
const PADDLE_W = 7;
const PADDLE_H = 60;
const BALL_R = 6;
const WIN_SCORE = 7;

interface State {
  py: number;
  cy: number;
  bx: number;
  by: number;
  vx: number;
  vy: number;
  pScore: number;
  cScore: number;
  status: "ready" | "playing" | "won" | "lost";
  flashSide: "p" | "c" | null;
  flashUntil: number;
  speedTier: number;
}

function initState(): State {
  return {
    py: H / 2 - PADDLE_H / 2,
    cy: H / 2 - PADDLE_H / 2,
    bx: W / 2,
    by: H / 2,
    vx: 0,
    vy: 0,
    pScore: 0,
    cScore: 0,
    status: "ready",
    flashSide: null,
    flashUntil: 0,
    speedTier: 0,
  };
}

function serve(s: State, dir: number) {
  s.bx = W / 2;
  s.by = H / 2;
  const speed = 4.6 + s.speedTier * 0.4;
  s.vx = dir * speed;
  s.vy = (Math.random() - 0.5) * speed * 0.9;
}

export function Pong() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<State>(initState());
  const rafRef = useRef<number | null>(null);
  const [, force] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const y = ((e.clientY - rect.top) / rect.height) * H;
      stateRef.current.py = Math.max(0, Math.min(H - PADDLE_H, y - PADDLE_H / 2));
    };

    const launch = () => {
      const s = stateRef.current;
      if (s.status === "ready") {
        serve(s, Math.random() < 0.5 ? -1 : 1);
        s.status = "playing";
      } else if (s.status === "won" || s.status === "lost") {
        stateRef.current = initState();
        force((n) => n + 1);
      }
    };

    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("click", launch);

    const onKey = (e: KeyboardEvent) => {
      // Only react when the laptop is the active zone. getState() is read
      // synchronously so there's no stale-ref race window when zone flips.
      if (useSceneStore.getState().zone !== "laptop") return;
      if (e.key === " " || e.key === "Enter") {
        e.stopPropagation();
        launch();
      }
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
        e.stopPropagation();
        stateRef.current.py = Math.max(0, stateRef.current.py - 28);
      }
      if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
        e.stopPropagation();
        stateRef.current.py = Math.min(H - PADDLE_H, stateRef.current.py + 28);
      }
    };
    window.addEventListener("keydown", onKey);

    const tick = (t: number) => {
      const s = stateRef.current;

      // Background
      ctx.fillStyle = "#11111b";
      ctx.fillRect(0, 0, W, H);

      // Center dotted line
      ctx.strokeStyle = "#45475a";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 8]);
      ctx.beginPath();
      ctx.moveTo(W / 2, 12);
      ctx.lineTo(W / 2, H - 24);
      ctx.stroke();
      ctx.setLineDash([]);

      // Border
      ctx.strokeStyle = "#313244";
      ctx.lineWidth = 1;
      ctx.strokeRect(0.5, 0.5, W - 1, H - 1);

      if (s.status === "playing") {
        // CPU AI: track ball with delay + cap
        const target = s.by - PADDLE_H / 2;
        const diff = target - s.cy;
        const cap = 4.4 + s.speedTier * 0.3;
        s.cy += Math.max(-cap, Math.min(cap, diff * 0.085));
        s.cy = Math.max(0, Math.min(H - PADDLE_H, s.cy));

        s.bx += s.vx;
        s.by += s.vy;

        // Wall bounce
        if (s.by < BALL_R) { s.by = BALL_R; s.vy = -s.vy; }
        if (s.by > H - BALL_R) { s.by = H - BALL_R; s.vy = -s.vy; }

        // Player paddle (left)
        if (
          s.vx < 0 &&
          s.bx - BALL_R <= 18 + PADDLE_W &&
          s.bx - BALL_R >= 14 &&
          s.by >= s.py &&
          s.by <= s.py + PADDLE_H
        ) {
          s.bx = 18 + PADDLE_W + BALL_R;
          const hit = (s.by - s.py) / PADDLE_H - 0.5;
          s.vx = Math.abs(s.vx);
          s.vy = hit * 7;
          playSfx(SFX.arcadeNav, 0.4);
        }

        // CPU paddle (right)
        const cpuX = W - 18 - PADDLE_W;
        if (
          s.vx > 0 &&
          s.bx + BALL_R >= cpuX &&
          s.bx + BALL_R <= cpuX + PADDLE_W + 4 &&
          s.by >= s.cy &&
          s.by <= s.cy + PADDLE_H
        ) {
          s.bx = cpuX - BALL_R;
          const hit = (s.by - s.cy) / PADDLE_H - 0.5;
          s.vx = -Math.abs(s.vx);
          s.vy = hit * 7;
          playSfx(SFX.arcadeNav, 0.4);
        }

        // Score
        if (s.bx < -BALL_R) {
          s.cScore += 1;
          s.flashSide = "c";
          s.flashUntil = t + 220;
          if (s.cScore >= WIN_SCORE) s.status = "lost";
          else { s.speedTier += 1; serve(s, -1); }
        } else if (s.bx > W + BALL_R) {
          s.pScore += 1;
          s.flashSide = "p";
          s.flashUntil = t + 220;
          if (s.pScore >= WIN_SCORE) s.status = "won";
          else { s.speedTier += 1; serve(s, 1); }
        }
      }

      // Score flash background tint
      if (s.flashSide && t < s.flashUntil) {
        ctx.fillStyle = s.flashSide === "p" ? "rgba(203,166,247,0.10)" : "rgba(137,180,250,0.10)";
        ctx.fillRect(s.flashSide === "p" ? 0 : W / 2, 0, W / 2, H);
      } else {
        s.flashSide = null;
      }

      // Paddles
      ctx.fillStyle = "#cba6f7";
      ctx.fillRect(18, s.py, PADDLE_W, PADDLE_H);
      ctx.fillStyle = "#89b4fa";
      ctx.fillRect(W - 18 - PADDLE_W, s.cy, PADDLE_W, PADDLE_H);

      // Ball
      ctx.fillStyle = "#fab387";
      ctx.beginPath();
      ctx.arc(s.bx, s.by, BALL_R, 0, Math.PI * 2);
      ctx.fill();

      // Score text
      ctx.fillStyle = "#cdd6f4";
      ctx.font = "28px JetBrains Mono, monospace";
      ctx.textAlign = "right";
      ctx.fillText(s.pScore.toString().padStart(2, "0"), W / 2 - 24, 36);
      ctx.textAlign = "left";
      ctx.fillText(s.cScore.toString().padStart(2, "0"), W / 2 + 24, 36);
      ctx.textAlign = "left";

      ctx.font = "11px JetBrains Mono, monospace";
      ctx.fillStyle = "#7f849c";
      ctx.fillText("YOU", 18, H - 8);
      ctx.textAlign = "right";
      ctx.fillText("CPU", W - 18, H - 8);
      ctx.textAlign = "left";

      if (s.status === "ready") {
        ctx.fillStyle = "#a6e3a1";
        ctx.font = "14px JetBrains Mono, monospace";
        ctx.fillText("▸ click or press SPACE to serve", W / 2 - 130, H / 2 + 80);
      }
      if (s.status === "won") {
        ctx.fillStyle = "#a6e3a1";
        ctx.font = "22px JetBrains Mono, monospace";
        ctx.fillText("★ YOU WIN ★", W / 2 - 80, H / 2 - 20);
        ctx.font = "12px JetBrains Mono, monospace";
        ctx.fillText("click to play again", W / 2 - 70, H / 2 + 6);
      }
      if (s.status === "lost") {
        ctx.fillStyle = "#f38ba8";
        ctx.font = "22px JetBrains Mono, monospace";
        ctx.fillText("CPU WINS", W / 2 - 60, H / 2 - 20);
        ctx.font = "12px JetBrains Mono, monospace";
        ctx.fillText("click to retry", W / 2 - 50, H / 2 + 6);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("click", launch);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className="game-frame">
      <div className="game-head">
        <span className="game-tag">[ PONG · vs CPU ]</span>
        <span className="game-spacer" />
        <span className="game-hint">mouse / W S / ↑ ↓ · SPACE to serve · first to 7</span>
      </div>
      <canvas ref={canvasRef} className="game-canvas" />
    </div>
  );
}
