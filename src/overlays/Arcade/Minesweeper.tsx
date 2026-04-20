"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { SFX, playSfx, useLoopSfx } from "@/lib/useSfx";

interface MinesweeperProps {
  onExit: () => void;
}

const COLS = 10;
const ROWS = 14;
const MINES = 20;
const CELL = 28;

interface Cell {
  mine: boolean;
  revealed: boolean;
  flagged: boolean;
  adj: number;
}

type Board = Cell[][];

const NUM_COLORS: Record<number, string> = {
  1: "#ffd27a",
  2: "#ff9f3a",
  3: "#ff6a1a",
  4: "#ff4a6a",
  5: "#ff2a8a",
  6: "#ffd0ff",
  7: "#ffffff",
  8: "#888888",
};

function emptyBoard(): Board {
  return Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => ({
      mine: false,
      revealed: false,
      flagged: false,
      adj: 0,
    }))
  );
}

function buildBoard(safeX: number, safeY: number): Board {
  const board = emptyBoard();
  const safe = new Set<string>();
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const nx = safeX + dx;
      const ny = safeY + dy;
      if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS) {
        safe.add(`${nx},${ny}`);
      }
    }
  }
  let placed = 0;
  while (placed < MINES) {
    const x = Math.floor(Math.random() * COLS);
    const y = Math.floor(Math.random() * ROWS);
    if (safe.has(`${x},${y}`) || board[y][x].mine) continue;
    board[y][x].mine = true;
    placed++;
  }
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (board[y][x].mine) continue;
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS && board[ny][nx].mine) n++;
        }
      }
      board[y][x].adj = n;
    }
  }
  return board;
}

function cloneBoard(b: Board): Board {
  return b.map((row) => row.map((c) => ({ ...c })));
}

function floodReveal(b: Board, x: number, y: number) {
  const stack: [number, number][] = [[x, y]];
  while (stack.length) {
    const [cx, cy] = stack.pop()!;
    const cell = b[cy][cx];
    if (cell.revealed || cell.flagged) continue;
    cell.revealed = true;
    if (cell.adj === 0 && !cell.mine) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS) {
            stack.push([nx, ny]);
          }
        }
      }
    }
  }
}

function checkWin(b: Board): boolean {
  for (const row of b) {
    for (const c of row) {
      if (!c.mine && !c.revealed) return false;
    }
  }
  return true;
}

type Status = "idle" | "playing" | "lost" | "won";

interface MineCellProps {
  x: number;
  y: number;
  mine: boolean;
  revealed: boolean;
  flagged: boolean;
  adj: number;
}

const MineCell = memo(function MineCell({
  x,
  y,
  mine,
  revealed,
  flagged,
  adj,
}: MineCellProps) {
  const bg = revealed
    ? mine
      ? "rgba(255,40,40,0.35)"
      : "rgba(255,140,40,0.08)"
    : "rgba(255,140,40,0.18)";
  const color = mine ? "#ff3030" : adj > 0 ? NUM_COLORS[adj] : "transparent";
  const label = revealed ? (mine ? "✱" : adj > 0 ? adj : "") : flagged ? "⚑" : "";
  return (
    <button
      data-x={x}
      data-y={y}
      style={{
        position: "absolute",
        left: x * CELL,
        top: y * CELL,
        width: CELL,
        height: CELL,
        background: bg,
        border: "1px solid rgba(255,140,40,0.35)",
        color,
        fontSize: 14,
        fontWeight: 700,
        textShadow:
          revealed && color !== "transparent" ? `0 0 4px ${color}` : "none",
        cursor: "pointer",
        padding: 0,
        fontFamily: "inherit",
      }}
    >
      {label}
    </button>
  );
});

export function Minesweeper({ onExit }: MinesweeperProps) {
  const [board, setBoard] = useState<Board | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [flags, setFlags] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [startMs, setStartMs] = useState<number | null>(null);

  // Gameplay BGM while alive; death cue when a mine is revealed
  useLoopSfx(SFX.arcadeGameLoop, status !== "lost", 0.3);
  useEffect(() => {
    if (status === "lost") playSfx(SFX.arcadeDeath, 0.7);
  }, [status]);

  const reset = useCallback(() => {
    setBoard(null);
    setStatus("idle");
    setFlags(0);
    setElapsed(0);
    setStartMs(null);
  }, []);

  useEffect(() => {
    if (status !== "playing" || startMs === null) return;
    const id = window.setInterval(() => {
      setElapsed(Math.floor((performance.now() - startMs) / 1000));
    }, 250);
    return () => window.clearInterval(id);
  }, [status, startMs]);

  const handleReveal = useCallback(
    (x: number, y: number) => {
      if (status === "lost" || status === "won") return;
      if (status === "idle" || board === null) {
        playSfx(SFX.arcadeNav, 0.5);
        const fresh = buildBoard(x, y);
        floodReveal(fresh, x, y);
        setBoard(fresh);
        setStatus("playing");
        setStartMs(performance.now());
        return;
      }
      const cell = board[y][x];
      if (cell.revealed || cell.flagged) return;
      const next = cloneBoard(board);
      if (next[y][x].mine) {
        for (const row of next) for (const c of row) if (c.mine) c.revealed = true;
        setBoard(next);
        setStatus("lost");
        return;
      }
      playSfx(SFX.arcadeNav, 0.5);
      floodReveal(next, x, y);
      setBoard(next);
      if (checkWin(next)) {
        for (const row of next) for (const c of row) if (c.mine) c.flagged = true;
        setStatus("won");
      }
    },
    [board, status]
  );

  const handleFlag = useCallback(
    (x: number, y: number) => {
      if (status !== "playing" || !board) return;
      const cell = board[y][x];
      if (cell.revealed) return;
      const next = cloneBoard(board);
      next[y][x].flagged = !next[y][x].flagged;
      setBoard(next);
      setFlags((f) => f + (next[y][x].flagged ? 1 : -1));
    },
    [board, status]
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onExit();
      else if ((e.key === "Enter" || e.key === " ") && (status === "lost" || status === "won")) {
        reset();
      } else if (e.key === "r" || e.key === "R") reset();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onExit, reset, status]);

  const displayBoard = useMemo<Board>(() => board ?? emptyBoard(), [board]);

  const minesLeft = Math.max(0, MINES - flags);
  const boardW = COLS * CELL;
  const boardH = ROWS * CELL;

  const readXY = useCallback((target: EventTarget | null): [number, number] | null => {
    if (!(target instanceof HTMLElement)) return null;
    const bx = target.getAttribute("data-x");
    const by = target.getAttribute("data-y");
    if (bx === null || by === null) return null;
    return [parseInt(bx, 10), parseInt(by, 10)];
  }, []);

  const onBoardClick = useCallback(
    (e: React.MouseEvent) => {
      const xy = readXY(e.target);
      if (xy) handleReveal(xy[0], xy[1]);
    },
    [handleReveal, readXY]
  );
  const onBoardContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const xy = readXY(e.target);
      if (xy) handleFlag(xy[0], xy[1]);
    },
    [handleFlag, readXY]
  );

  const boardStyle = useMemo<React.CSSProperties>(
    () => ({
      width: boardW,
      height: boardH,
      boxShadow: "inset 0 0 24px rgba(255,120,20,0.12)",
    }),
    [boardW, boardH]
  );

  return (
    <div className="w-full h-full flex flex-col items-center justify-start pt-3 px-2 font-mono text-orange-200">
      <div className="flex justify-between items-center w-full max-w-[360px] text-[10px] tracking-widest text-orange-300 crt-glow mb-2">
        <span>MINES {minesLeft.toString().padStart(3, "0")}</span>
        <span className="text-orange-400 text-sm tracking-[0.3em] crt-glow">
          {status === "lost" ? "BOOM" : status === "won" ? "CLEAR" : "◆"}
        </span>
        <span>TIME {elapsed.toString().padStart(3, "0")}</span>
      </div>
      <div
        className="relative border border-orange-500/60 crt-glow select-none"
        style={boardStyle}
        onClick={onBoardClick}
        onContextMenu={onBoardContextMenu}
      >
        {displayBoard.map((row, y) =>
          row.map((cell, x) => (
            <MineCell
              key={`${x},${y}`}
              x={x}
              y={y}
              mine={cell.mine}
              revealed={cell.revealed}
              flagged={cell.flagged}
              adj={cell.adj}
            />
          ))
        )}
        {(status === "lost" || status === "won") && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 gap-3 pointer-events-none">
            <div
              className="text-2xl tracking-[0.3em] crt-glow"
              style={{ color: status === "won" ? "#ffcc66" : "#ff5a3a" }}
            >
              {status === "won" ? "CLEARED" : "DETONATED"}
            </div>
            <div className="text-orange-200 text-sm tracking-widest crt-glow">
              TIME {elapsed}S
            </div>
            <div className="text-orange-300/80 text-[10px] tracking-widest mt-2">
              ENTER:NEW • ESC:EXIT
            </div>
          </div>
        )}
      </div>
      <div className="mt-3 text-orange-400/70 text-[10px] tracking-widest text-center">
        LCLICK:REVEAL • RCLICK:FLAG • R:RESET • ESC:EXIT
      </div>
    </div>
  );
}
