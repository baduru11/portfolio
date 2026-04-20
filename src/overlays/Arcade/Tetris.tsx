"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import { SFX, playSfx, useLoopSfx } from "@/lib/useSfx";

interface TetrisProps {
  onExit: () => void;
}

const COLS = 10;
const ROWS = 20;
const CELL = 20;

const BOARD_BG =
  `repeating-linear-gradient(0deg,rgba(255,140,30,0.04) 0,rgba(255,140,30,0.04) 1px,transparent 1px,transparent ${CELL}px),` +
  `repeating-linear-gradient(90deg,rgba(255,140,30,0.04) 0,rgba(255,140,30,0.04) 1px,transparent 1px,transparent ${CELL}px)`;

type PieceId = "I" | "O" | "T" | "S" | "Z" | "J" | "L";

interface PieceDef {
  rotations: number[][][];
  color: string;
}

const PIECES: Record<PieceId, PieceDef> = {
  I: {
    color: "#ffcc66",
    rotations: [
      [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ],
      [
        [0, 0, 1, 0],
        [0, 0, 1, 0],
        [0, 0, 1, 0],
        [0, 0, 1, 0],
      ],
      [
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
      ],
      [
        [0, 1, 0, 0],
        [0, 1, 0, 0],
        [0, 1, 0, 0],
        [0, 1, 0, 0],
      ],
    ],
  },
  O: {
    color: "#ffd27a",
    rotations: [
      [
        [1, 1],
        [1, 1],
      ],
    ],
  },
  T: {
    color: "#ff9f3a",
    rotations: [
      [
        [0, 1, 0],
        [1, 1, 1],
        [0, 0, 0],
      ],
      [
        [0, 1, 0],
        [0, 1, 1],
        [0, 1, 0],
      ],
      [
        [0, 0, 0],
        [1, 1, 1],
        [0, 1, 0],
      ],
      [
        [0, 1, 0],
        [1, 1, 0],
        [0, 1, 0],
      ],
    ],
  },
  S: {
    color: "#ff7a18",
    rotations: [
      [
        [0, 1, 1],
        [1, 1, 0],
        [0, 0, 0],
      ],
      [
        [0, 1, 0],
        [0, 1, 1],
        [0, 0, 1],
      ],
      [
        [0, 0, 0],
        [0, 1, 1],
        [1, 1, 0],
      ],
      [
        [1, 0, 0],
        [1, 1, 0],
        [0, 1, 0],
      ],
    ],
  },
  Z: {
    color: "#ff5a3a",
    rotations: [
      [
        [1, 1, 0],
        [0, 1, 1],
        [0, 0, 0],
      ],
      [
        [0, 0, 1],
        [0, 1, 1],
        [0, 1, 0],
      ],
      [
        [0, 0, 0],
        [1, 1, 0],
        [0, 1, 1],
      ],
      [
        [0, 1, 0],
        [1, 1, 0],
        [1, 0, 0],
      ],
    ],
  },
  J: {
    color: "#ffa766",
    rotations: [
      [
        [1, 0, 0],
        [1, 1, 1],
        [0, 0, 0],
      ],
      [
        [0, 1, 1],
        [0, 1, 0],
        [0, 1, 0],
      ],
      [
        [0, 0, 0],
        [1, 1, 1],
        [0, 0, 1],
      ],
      [
        [0, 1, 0],
        [0, 1, 0],
        [1, 1, 0],
      ],
    ],
  },
  L: {
    color: "#ffb050",
    rotations: [
      [
        [0, 0, 1],
        [1, 1, 1],
        [0, 0, 0],
      ],
      [
        [0, 1, 0],
        [0, 1, 0],
        [0, 1, 1],
      ],
      [
        [0, 0, 0],
        [1, 1, 1],
        [1, 0, 0],
      ],
      [
        [1, 1, 0],
        [0, 1, 0],
        [0, 1, 0],
      ],
    ],
  },
};

const PIECE_IDS: PieceId[] = ["I", "O", "T", "S", "Z", "J", "L"];

/**
 * 7-bag randomizer (Tetris Guideline). Refills a bag with one of each piece,
 * Fisher–Yates shuffles it, then hands them out in order. Guarantees every
 * piece appears once per 7 picks — no triple repeats, no long droughts.
 */
function makeBag(): PieceId[] {
  const bag = [...PIECE_IDS];
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}

interface ActivePiece {
  id: PieceId;
  rot: number;
  x: number;
  y: number;
}

type Cell = PieceId | null;
type Grid = Cell[][];

function emptyGrid(): Grid {
  return Array.from({ length: ROWS }, () => Array<Cell>(COLS).fill(null));
}

function spawnPiece(id: PieceId): ActivePiece {
  const shape = PIECES[id].rotations[0];
  return {
    id,
    rot: 0,
    x: Math.floor((COLS - shape[0].length) / 2),
    y: id === "I" ? -1 : 0,
  };
}

function shapeOf(p: ActivePiece): number[][] {
  return PIECES[p.id].rotations[p.rot % PIECES[p.id].rotations.length];
}

function collides(grid: Grid, p: ActivePiece, dx = 0, dy = 0, rot = p.rot): boolean {
  const shape = PIECES[p.id].rotations[rot % PIECES[p.id].rotations.length];
  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[y].length; x++) {
      if (!shape[y][x]) continue;
      const gx = p.x + x + dx;
      const gy = p.y + y + dy;
      if (gx < 0 || gx >= COLS || gy >= ROWS) return true;
      if (gy >= 0 && grid[gy][gx]) return true;
    }
  }
  return false;
}

function merge(grid: Grid, p: ActivePiece): Grid {
  const next = grid.map((row) => row.slice());
  const shape = shapeOf(p);
  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[y].length; x++) {
      if (!shape[y][x]) continue;
      const gx = p.x + x;
      const gy = p.y + y;
      if (gy >= 0 && gy < ROWS && gx >= 0 && gx < COLS) {
        next[gy][gx] = p.id;
      }
    }
  }
  return next;
}

function clearLines(grid: Grid): { grid: Grid; cleared: number } {
  const kept = grid.filter((row) => row.some((c) => c === null));
  const cleared = ROWS - kept.length;
  while (kept.length < ROWS) kept.unshift(Array<Cell>(COLS).fill(null));
  return { grid: kept, cleared };
}

function levelSpeed(level: number): number {
  return Math.max(80, 700 - level * 55);
}

const LINE_SCORES = [0, 100, 300, 500, 800];

export function Tetris({ onExit }: TetrisProps) {
  const bagRef = useRef<PieceId[]>([]);
  const drawNext = useCallback((): PieceId => {
    if (bagRef.current.length === 0) bagRef.current = makeBag();
    return bagRef.current.shift()!;
  }, []);
  const initialFirst = useRef<PieceId | null>(null);
  const initialNext = useRef<PieceId | null>(null);
  if (initialFirst.current === null) {
    bagRef.current = makeBag();
    initialFirst.current = bagRef.current.shift()!;
    if (bagRef.current.length === 0) bagRef.current = makeBag();
    initialNext.current = bagRef.current.shift()!;
  }

  const [grid, setGrid] = useState<Grid>(emptyGrid);
  const [piece, setPiece] = useState<ActivePiece>(() =>
    spawnPiece(initialFirst.current!)
  );
  const [nextId, setNextId] = useState<PieceId>(initialNext.current!);
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [paused, setPaused] = useState(false);

  // Gameplay BGM while not over/paused; death cue on transition to game-over
  useLoopSfx(SFX.arcadeGameLoop, !gameOver && !paused, 0.3);
  useEffect(() => {
    if (gameOver) playSfx(SFX.arcadeDeath, 0.7);
  }, [gameOver]);
  const [hold, setHold] = useState<PieceId | null>(null);
  const [holdUsed, setHoldUsed] = useState(false);
  const pieceRef = useRef(piece);
  const gridRef = useRef(grid);

  useEffect(() => {
    pieceRef.current = piece;
  }, [piece]);
  useEffect(() => {
    gridRef.current = grid;
  }, [grid]);

  const reset = useCallback(() => {
    setGrid(emptyGrid());
    bagRef.current = makeBag();
    const first = bagRef.current.shift()!;
    if (bagRef.current.length === 0) bagRef.current = makeBag();
    const next = bagRef.current.shift()!;
    setPiece(spawnPiece(first));
    setNextId(next);
    setScore(0);
    setLines(0);
    setLevel(0);
    setGameOver(false);
    setPaused(false);
    setHold(null);
    setHoldUsed(false);
  }, []);

  const lockPiece = useCallback(
    (p: ActivePiece, g: Grid) => {
      playSfx(SFX.arcadeNav, 0.5);
      const merged = merge(g, p);
      const { grid: cleared, cleared: n } = clearLines(merged);
      setGrid(cleared);
      if (n > 0) {
        setScore((s) => s + LINE_SCORES[n] * (level + 1));
        setLines((l) => {
          const nl = l + n;
          setLevel(Math.floor(nl / 10));
          return nl;
        });
      }
      const spawn = spawnPiece(nextId);
      if (collides(cleared, spawn)) {
        setGameOver(true);
        setPiece(spawn);
        return;
      }
      setPiece(spawn);
      setNextId(drawNext());
      setHoldUsed(false);
    },
    [level, nextId, drawNext]
  );

  const doHold = useCallback(() => {
    if (holdUsed) return;
    const p = pieceRef.current;
    if (hold === null) {
      setHold(p.id);
      const spawn = spawnPiece(nextId);
      if (collides(gridRef.current, spawn)) {
        setGameOver(true);
        setPiece(spawn);
        return;
      }
      setPiece(spawn);
      setNextId(drawNext());
    } else {
      const spawn = spawnPiece(hold);
      if (collides(gridRef.current, spawn)) {
        setGameOver(true);
        setPiece(spawn);
        return;
      }
      setHold(p.id);
      setPiece(spawn);
    }
    setHoldUsed(true);
  }, [hold, holdUsed, nextId, drawNext]);

  const tryMove = useCallback((dx: number, dy: number): boolean => {
    const p = pieceRef.current;
    const g = gridRef.current;
    if (!collides(g, p, dx, dy)) {
      setPiece({ ...p, x: p.x + dx, y: p.y + dy });
      return true;
    }
    return false;
  }, []);

  const tryRotate = useCallback(() => {
    const p = pieceRef.current;
    const g = gridRef.current;
    const nextRot = (p.rot + 1) % PIECES[p.id].rotations.length;
    const kicks = [0, -1, 1, -2, 2];
    for (const kick of kicks) {
      if (!collides(g, p, kick, 0, nextRot)) {
        setPiece({ ...p, rot: nextRot, x: p.x + kick });
        return;
      }
    }
  }, []);

  const softDrop = useCallback(() => {
    const p = pieceRef.current;
    const g = gridRef.current;
    if (!collides(g, p, 0, 1)) {
      setPiece({ ...p, y: p.y + 1 });
      setScore((s) => s + 1);
    } else {
      lockPiece(p, g);
    }
  }, [lockPiece]);

  const hardDrop = useCallback(() => {
    const p = pieceRef.current;
    const g = gridRef.current;
    let dy = 0;
    while (!collides(g, p, 0, dy + 1)) dy++;
    setScore((s) => s + dy * 2);
    lockPiece({ ...p, y: p.y + dy }, g);
  }, [lockPiece]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onExit();
        return;
      }
      if (gameOver) {
        if (e.key === "Enter") reset();
        return;
      }
      if (e.key === "p" || e.key === "P") {
        setPaused((v) => !v);
        return;
      }
      if (paused) return;
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        tryMove(-1, 0);
        e.preventDefault();
      } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        tryMove(1, 0);
        e.preventDefault();
      } else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
        softDrop();
        e.preventDefault();
      } else if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
        tryRotate();
        e.preventDefault();
      } else if (e.key === " ") {
        hardDrop();
        e.preventDefault();
      } else if (e.key === "c" || e.key === "C") {
        doHold();
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [gameOver, paused, onExit, reset, tryMove, tryRotate, softDrop, hardDrop, doHold]);

  useEffect(() => {
    if (gameOver || paused) return;
    const speed = levelSpeed(level);
    const id = window.setInterval(() => {
      const p = pieceRef.current;
      const g = gridRef.current;
      if (!collides(g, p, 0, 1)) {
        setPiece({ ...p, y: p.y + 1 });
      } else {
        lockPiece(p, g);
      }
    }, speed);
    return () => window.clearInterval(id);
  }, [level, gameOver, paused, lockPiece]);

  const boardW = COLS * CELL;
  const boardH = ROWS * CELL;

  const activeShape = shapeOf(piece);
  let ghostOffset = 0;
  if (!gameOver) {
    while (!collides(grid, piece, 0, ghostOffset + 1)) ghostOffset++;
  }

  const boardStyle = useMemo<React.CSSProperties>(
    () => ({
      width: boardW,
      height: boardH,
      background: BOARD_BG,
      boxShadow: "inset 0 0 24px rgba(255,120,20,0.15)",
    }),
    [boardW, boardH]
  );

  const settledCells = useMemo(() => {
    const out: ReactElement[] = [];
    for (let y = 0; y < grid.length; y++) {
      const row = grid[y];
      for (let x = 0; x < row.length; x++) {
        const cell = row[x];
        if (!cell) continue;
        const color = PIECES[cell].color;
        out.push(
          <div
            key={`b-${x}-${y}`}
            style={{
              position: "absolute",
              left: x * CELL + 1,
              top: y * CELL + 1,
              width: CELL - 2,
              height: CELL - 2,
              background: color,
              boxShadow: `0 0 6px ${color}, 0 0 10px ${color}`,
              opacity: 0.9,
            }}
          />
        );
      }
    }
    return out;
  }, [grid]);

  const columnHighlights = useMemo(() => {
    if (gameOver) return null;
    const cols = new Set<number>();
    for (let yy = 0; yy < activeShape.length; yy++) {
      for (let xx = 0; xx < activeShape[yy].length; xx++) {
        if (activeShape[yy][xx]) cols.add(piece.x + xx);
      }
    }
    const color = PIECES[piece.id].color;
    return Array.from(cols).map((cx) => (
      <div
        key={`col-${cx}`}
        style={{
          position: "absolute",
          left: cx * CELL,
          top: 0,
          width: CELL,
          height: boardH,
          background: `linear-gradient(to bottom, ${color}00, ${color}22)`,
          pointerEvents: "none",
        }}
      />
    ));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameOver, piece.id, piece.x, piece.rot, boardH]);

  return (
    <div className="w-full h-full flex flex-col items-center justify-start pt-3 px-2 font-mono text-orange-200">
      <div className="flex justify-between w-full max-w-[380px] text-[10px] tracking-widest text-orange-300 crt-glow mb-2">
        <span>LV {level.toString().padStart(2, "0")}</span>
        <span className="text-orange-400">TETRIS</span>
        <span>ESC:EXIT</span>
      </div>
      <div className="flex gap-3 items-start">
        <div
          className="relative border border-orange-500/60 crt-glow"
          style={boardStyle}
        >
          {columnHighlights}
          {settledCells}
          {!gameOver &&
            ghostOffset > 0 &&
            activeShape.map((row, y) =>
              row.map((v, x) => {
                if (!v) return null;
                const gx = piece.x + x;
                const gy = piece.y + ghostOffset + y;
                if (gy < 0 || gy >= ROWS) return null;
                const color = PIECES[piece.id].color;
                return (
                  <div
                    key={`g-${x}-${y}`}
                    style={{
                      position: "absolute",
                      left: gx * CELL,
                      top: gy * CELL,
                      width: CELL,
                      height: CELL,
                      background: `${color}33`,
                      border: `2px solid ${color}`,
                      boxShadow: `inset 0 0 8px ${color}, 0 0 6px ${color}`,
                      opacity: 0.85,
                      boxSizing: "border-box",
                      animation: "ghostPulse 1.1s ease-in-out infinite",
                    }}
                  />
                );
              })
            )}
          {!gameOver &&
            activeShape.map((row, y) =>
              row.map((v, x) => {
                if (!v) return null;
                const gx = piece.x + x;
                const gy = piece.y + y;
                if (gy < 0 || gy >= ROWS) return null;
                const color = PIECES[piece.id].color;
                return (
                  <div
                    key={`p-${x}-${y}`}
                    style={{
                      position: "absolute",
                      left: gx * CELL + 1,
                      top: gy * CELL + 1,
                      width: CELL - 2,
                      height: CELL - 2,
                      background: color,
                      boxShadow: `0 0 8px ${color}, 0 0 14px ${color}`,
                    }}
                  />
                );
              })
            )}
          {paused && !gameOver && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <div className="text-orange-300 text-xl tracking-[0.4em] crt-glow">
                PAUSED
              </div>
            </div>
          )}
          {gameOver && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-3">
              <div className="text-orange-400 text-xl tracking-[0.3em] crt-glow">
                GAME OVER
              </div>
              <div className="text-orange-200 text-sm tracking-widest crt-glow">
                SCORE {score}
              </div>
              <div className="text-orange-300/80 text-[10px] tracking-widest mt-2 text-center">
                ENTER:RETRY
                <br />
                ESC:EXIT
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-3 text-[10px] tracking-widest text-orange-300 crt-glow min-w-[82px]">
          <div>
            <div className="text-orange-400/80 mb-1">HOLD</div>
            <NextPreview id={hold} dim={holdUsed} />
          </div>
          <div>
            <div className="text-orange-400/80 mb-1">NEXT</div>
            <NextPreview id={nextId} />
          </div>
          <div>
            <div className="text-orange-400/80">SCORE</div>
            <div className="text-orange-200 text-sm">
              {score.toString().padStart(5, "0")}
            </div>
          </div>
          <div>
            <div className="text-orange-400/80">LINES</div>
            <div className="text-orange-200 text-sm">
              {lines.toString().padStart(3, "0")}
            </div>
          </div>
        </div>
      </div>
      <div className="mt-3 text-orange-400/70 text-[9px] tracking-widest text-center leading-relaxed">
        ←→:MOVE • ↑:ROTATE • ↓:SOFT
        <br />
        SPACE:HARD • C:HOLD • P:PAUSE
      </div>
      <style jsx>{`
        @keyframes ghostPulse {
          0%, 100% { opacity: 0.7; }
          50%      { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function NextPreview({ id, dim = false }: { id: PieceId | null; dim?: boolean }) {
  const size = 12;
  return (
    <div
      className="border border-orange-500/40"
      style={{
        width: 72,
        height: 56,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(255,140,40,0.04)",
        opacity: dim ? 0.35 : 1,
      }}
    >
      {id === null ? (
        <div className="text-orange-500/50 text-[10px] tracking-widest">—</div>
      ) : (
        <div
          style={{
            position: "relative",
            width: PIECES[id].rotations[0][0].length * size,
            height: PIECES[id].rotations[0].length * size,
          }}
        >
          {PIECES[id].rotations[0].map((row, y) =>
            row.map((v, x) => {
              if (!v) return null;
              return (
                <div
                  key={`${x}-${y}`}
                  style={{
                    position: "absolute",
                    left: x * size,
                    top: y * size,
                    width: size - 1,
                    height: size - 1,
                    background: PIECES[id].color,
                    boxShadow: `0 0 4px ${PIECES[id].color}`,
                  }}
                />
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
