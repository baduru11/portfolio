"use client";

import { useEffect, useRef, useState } from "react";
import { SFX, playSfx } from "@/lib/useSfx";
import { useSceneStore } from "@/scene/useSceneStore";

const W = 640;
const H = 360;
const PADDLE_W = 84;
const PADDLE_H = 9;
const BALL_R = 5;
const BRICK_COLS = 10;
const BRICK_ROWS = 5;
const BRICK_GAP = 4;
const BRICK_PAD_X = 24;
const BRICK_PAD_TOP = 28;

const ROW_COLORS = ["#f38ba8", "#fab387", "#f9e2af", "#a6e3a1", "#89b4fa"];

interface State {
  paddleX: number;
  ballX: number;
  ballY: number;
  vx: number;
  vy: number;
  bricks: boolean[];
  score: number;
  lives: number;
  status: "ready" | "playing" | "won" | "lost";
}

function initState(): State {
  return {
    paddleX: (W - PADDLE_W) / 2,
    ballX: W / 2,
    ballY: H - 40,
    vx: 0,
    vy: 0,
    bricks: Array(BRICK_COLS * BRICK_ROWS).fill(true),
    score: 0,
    lives: 3,
    status: "ready",
  };
}

function brickRect(i: number): { x: number; y: number; w: number; h: number } {
  const col = i % BRICK_COLS;
  const row = Math.floor(i / BRICK_COLS);
  const w = (W - BRICK_PAD_X * 2 - BRICK_GAP * (BRICK_COLS - 1)) / BRICK_COLS;
  const h = 16;
  return {
    x: BRICK_PAD_X + col * (w + BRICK_GAP),
    y: BRICK_PAD_TOP + row * (h + BRICK_GAP),
    w,
    h,
  };
}

export function Breakout() {
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
      const x = ((e.clientX - rect.left) / rect.width) * W;
      stateRef.current.paddleX = Math.max(
        0,
        Math.min(W - PADDLE_W, x - PADDLE_W / 2),
      );
    };

    const launch = () => {
      const s = stateRef.current;
      if (s.status === "ready") {
        s.vx = (Math.random() < 0.5 ? -1 : 1) * 4;
        s.vy = -5;
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
      if (e.key === "ArrowLeft") {
        e.stopPropagation();
        stateRef.current.paddleX = Math.max(0, stateRef.current.paddleX - 24);
      }
      if (e.key === "ArrowRight") {
        e.stopPropagation();
        stateRef.current.paddleX = Math.min(
          W - PADDLE_W,
          stateRef.current.paddleX + 24,
        );
      }
    };
    window.addEventListener("keydown", onKey);

    const tick = () => {
      const s = stateRef.current;

      ctx.fillStyle = "#11111b";
      ctx.fillRect(0, 0, W, H);

      ctx.strokeStyle = "#313244";
      ctx.lineWidth = 1;
      ctx.strokeRect(0.5, 0.5, W - 1, H - 1);

      if (s.status === "playing") {
        s.ballX += s.vx;
        s.ballY += s.vy;

        if (s.ballX < BALL_R) {
          s.ballX = BALL_R;
          s.vx = -s.vx;
        }
        if (s.ballX > W - BALL_R) {
          s.ballX = W - BALL_R;
          s.vx = -s.vx;
        }
        if (s.ballY < BALL_R) {
          s.ballY = BALL_R;
          s.vy = -s.vy;
        }

        const paddleY = H - 24;
        if (
          s.ballY + BALL_R >= paddleY &&
          s.ballY + BALL_R <= paddleY + PADDLE_H + 4 &&
          s.ballX >= s.paddleX &&
          s.ballX <= s.paddleX + PADDLE_W &&
          s.vy > 0
        ) {
          s.ballY = paddleY - BALL_R;
          const hitPos = (s.ballX - s.paddleX) / PADDLE_W - 0.5;
          s.vx = hitPos * 8;
          s.vy = -Math.abs(s.vy);
          playSfx(SFX.arcadeNav, 0.4);
        }

        for (let i = 0; i < s.bricks.length; i += 1) {
          if (!s.bricks[i]) continue;
          const r = brickRect(i);
          if (
            s.ballX + BALL_R >= r.x &&
            s.ballX - BALL_R <= r.x + r.w &&
            s.ballY + BALL_R >= r.y &&
            s.ballY - BALL_R <= r.y + r.h
          ) {
            s.bricks[i] = false;
            s.score += 10;
            playSfx(SFX.arcadeNav, 0.35);
            const overlapX = Math.min(
              s.ballX + BALL_R - r.x,
              r.x + r.w - (s.ballX - BALL_R),
            );
            const overlapY = Math.min(
              s.ballY + BALL_R - r.y,
              r.y + r.h - (s.ballY - BALL_R),
            );
            if (overlapX < overlapY) s.vx = -s.vx;
            else s.vy = -s.vy;
            if (s.bricks.every((b) => !b)) {
              s.status = "won";
            }
            break;
          }
        }

        if (s.ballY > H + BALL_R) {
          s.lives -= 1;
          if (s.lives <= 0) {
            s.status = "lost";
          } else {
            s.ballX = s.paddleX + PADDLE_W / 2;
            s.ballY = H - 40;
            s.vx = 0;
            s.vy = 0;
            s.status = "ready";
          }
        }
      }

      for (let i = 0; i < s.bricks.length; i += 1) {
        if (!s.bricks[i]) continue;
        const r = brickRect(i);
        const row = Math.floor(i / BRICK_COLS);
        ctx.fillStyle = ROW_COLORS[row % ROW_COLORS.length];
        ctx.globalAlpha = 0.85;
        ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = "#11111b";
        ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
      }

      ctx.fillStyle = "#cba6f7";
      ctx.fillRect(s.paddleX, H - 24, PADDLE_W, PADDLE_H);
      ctx.fillStyle = "#fab387";
      ctx.beginPath();
      ctx.arc(s.ballX, s.ballY, BALL_R, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#cdd6f4";
      ctx.font = "12px JetBrains Mono, monospace";
      ctx.fillText(`SCORE ${s.score.toString().padStart(4, "0")}`, 12, H - 4);
      ctx.fillText(`LIVES ${s.lives}`, 140, H - 4);

      if (s.status === "ready") {
        ctx.fillStyle = "#a6e3a1";
        ctx.font = "14px JetBrains Mono, monospace";
        ctx.fillText("▸ click or press SPACE to launch", W / 2 - 130, H / 2);
      }
      if (s.status === "won") {
        ctx.fillStyle = "#a6e3a1";
        ctx.font = "20px JetBrains Mono, monospace";
        ctx.fillText("★ CLEARED ★", W / 2 - 70, H / 2 - 8);
        ctx.font = "12px JetBrains Mono, monospace";
        ctx.fillText("click to play again", W / 2 - 70, H / 2 + 14);
      }
      if (s.status === "lost") {
        ctx.fillStyle = "#f38ba8";
        ctx.font = "20px JetBrains Mono, monospace";
        ctx.fillText("GAME OVER", W / 2 - 60, H / 2 - 8);
        ctx.font = "12px JetBrains Mono, monospace";
        ctx.fillText("click to retry", W / 2 - 50, H / 2 + 14);
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
        <span className="game-tag">[ BREAKOUT ]</span>
        <span className="game-spacer" />
        <span className="game-hint">mouse / ← → · SPACE to launch · type `home` to exit</span>
      </div>
      <canvas ref={canvasRef} className="game-canvas" />
    </div>
  );
}
