"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SFX, playSfx, useLoopSfx } from "@/lib/useSfx";

interface SnakeProps {
  onExit: () => void;
}

type Vec = { x: number; y: number };
type Dir = "UP" | "DOWN" | "LEFT" | "RIGHT";

const GRID_W = 16;
const GRID_H = 20;
const TICK_MS = 110;
const CELL = 22;

const BOARD_BG =
  `repeating-linear-gradient(0deg,rgba(255,140,30,0.04) 0,rgba(255,140,30,0.04) 1px,transparent 1px,transparent ${CELL}px),` +
  `repeating-linear-gradient(90deg,rgba(255,140,30,0.04) 0,rgba(255,140,30,0.04) 1px,transparent 1px,transparent ${CELL}px)`;

const SEGMENT_HEAD_SHADOW = "0 0 10px #ffcc66, 0 0 18px #ff9030";
const SEGMENT_BODY_SHADOW = "0 0 6px #ff9030";

interface SegmentProps {
  x: number;
  y: number;
  head: boolean;
  opacity: number;
}
const Segment = memo(function Segment({ x, y, head, opacity }: SegmentProps) {
  return (
    <div
      style={{
        position: "absolute",
        left: x * CELL + 1,
        top: y * CELL + 1,
        width: CELL - 2,
        height: CELL - 2,
        background: head ? "#ffcc66" : "#ff9030",
        boxShadow: head ? SEGMENT_HEAD_SHADOW : SEGMENT_BODY_SHADOW,
        opacity,
      }}
    />
  );
});

const DIR_VEC: Record<Dir, Vec> = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
};

const OPPOSITE: Record<Dir, Dir> = {
  UP: "DOWN",
  DOWN: "UP",
  LEFT: "RIGHT",
  RIGHT: "LEFT",
};

function randomFood(snake: Vec[]): Vec {
  while (true) {
    const p = {
      x: Math.floor(Math.random() * GRID_W),
      y: Math.floor(Math.random() * GRID_H),
    };
    if (!snake.some((s) => s.x === p.x && s.y === p.y)) return p;
  }
}

function initialSnake(): Vec[] {
  const cx = Math.floor(GRID_W / 2);
  const cy = Math.floor(GRID_H / 2);
  return [
    { x: cx, y: cy },
    { x: cx - 1, y: cy },
    { x: cx - 2, y: cy },
  ];
}

export function Snake({ onExit }: SnakeProps) {
  const [snake, setSnake] = useState<Vec[]>(initialSnake);
  const [dir, setDir] = useState<Dir>("RIGHT");
  const [food, setFood] = useState<Vec>(() => randomFood(initialSnake()));
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [paused, setPaused] = useState(false);
  const dirRef = useRef(dir);
  const queuedDir = useRef<Dir | null>(null);

  // Gameplay BGM while not over/paused; death cue on transition to game-over
  useLoopSfx(SFX.arcadeGameLoop, !gameOver && !paused, 0.3);
  useEffect(() => {
    if (gameOver) playSfx(SFX.arcadeDeath, 0.7);
  }, [gameOver]);

  useEffect(() => {
    dirRef.current = dir;
  }, [dir]);

  const reset = useCallback(() => {
    const s = initialSnake();
    setSnake(s);
    setDir("RIGHT");
    dirRef.current = "RIGHT";
    queuedDir.current = null;
    setFood(randomFood(s));
    setScore(0);
    setGameOver(false);
    setPaused(false);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onExit();
        return;
      }
      if (gameOver) {
        if (e.key === "Enter" || e.key === " ") reset();
        return;
      }
      if (e.key === "p" || e.key === "P") {
        setPaused((p) => !p);
        return;
      }
      const k = e.key;
      let next: Dir | null = null;
      if (k === "ArrowUp" || k === "w" || k === "W") next = "UP";
      else if (k === "ArrowDown" || k === "s" || k === "S") next = "DOWN";
      else if (k === "ArrowLeft" || k === "a" || k === "A") next = "LEFT";
      else if (k === "ArrowRight" || k === "d" || k === "D") next = "RIGHT";
      if (next && next !== OPPOSITE[dirRef.current]) {
        queuedDir.current = next;
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [gameOver, onExit, reset]);

  useEffect(() => {
    if (gameOver || paused) return;
    const id = window.setInterval(() => {
      setSnake((prev) => {
        const qd = queuedDir.current;
        if (qd && qd !== OPPOSITE[dirRef.current]) {
          dirRef.current = qd;
          setDir(qd);
          queuedDir.current = null;
        }
        const d = DIR_VEC[dirRef.current];
        const head = { x: prev[0].x + d.x, y: prev[0].y + d.y };
        if (
          head.x < 0 ||
          head.x >= GRID_W ||
          head.y < 0 ||
          head.y >= GRID_H ||
          prev.some((s) => s.x === head.x && s.y === head.y)
        ) {
          setGameOver(true);
          return prev;
        }
        const grew = head.x === food.x && head.y === food.y;
        const next = [head, ...prev];
        if (!grew) next.pop();
        else {
          playSfx(SFX.arcadeNav, 0.6);
          setScore((s) => s + 10);
          setFood(randomFood(next));
        }
        return next;
      });
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [food, gameOver, paused]);

  const boardW = GRID_W * CELL;
  const boardH = GRID_H * CELL;

  const boardStyle = useMemo<React.CSSProperties>(
    () => ({
      width: boardW,
      height: boardH,
      background: BOARD_BG,
      boxShadow: "inset 0 0 24px rgba(255,120,20,0.15)",
    }),
    [boardW, boardH]
  );

  return (
    <div className="w-full h-full flex flex-col items-center justify-start pt-3 px-2 font-mono text-orange-200">
      <div className="flex justify-between w-full max-w-[360px] text-[10px] tracking-widest text-orange-300 crt-glow mb-2">
        <span>SCORE {score.toString().padStart(4, "0")}</span>
        <span>ESC:EXIT</span>
      </div>
      <div
        className="relative border border-orange-500/60 crt-glow"
        style={boardStyle}
      >
        <div
          style={{
            position: "absolute",
            left: food.x * CELL + 3,
            top: food.y * CELL + 3,
            width: CELL - 6,
            height: CELL - 6,
            background: "#ff7a18",
            boxShadow: "0 0 8px #ff7a18, 0 0 16px #ff7a18",
            borderRadius: "50%",
            animation: "foodPulse 0.8s ease-in-out infinite alternate",
          }}
        />
        {snake.map((s, i) => (
          <Segment
            key={i}
            x={s.x}
            y={s.y}
            head={i === 0}
            opacity={i === 0 ? 1 : Math.max(0.35, 0.9 - i * 0.015)}
          />
        ))}
        {paused && !gameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <div className="text-orange-300 text-xl tracking-[0.4em] crt-glow">
              PAUSED
            </div>
          </div>
        )}
        {gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 gap-3">
            <div className="text-orange-400 text-2xl tracking-[0.3em] crt-glow">
              GAME OVER
            </div>
            <div className="text-orange-200 text-sm tracking-widest crt-glow">
              SCORE {score}
            </div>
            <div className="text-orange-300/80 text-[10px] tracking-widest mt-2">
              ENTER:RETRY • ESC:EXIT
            </div>
          </div>
        )}
      </div>
      <div className="mt-3 text-orange-400/70 text-[10px] tracking-widest">
        WASD/ARROWS • P:PAUSE
      </div>
      <style jsx>{`
        @keyframes foodPulse {
          from {
            transform: scale(0.85);
            opacity: 0.8;
          }
          to {
            transform: scale(1.1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
