"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { tweenCameraToZone } from "@/effects/transitions";
import { ScreenBoot } from "@/overlays/_shared/ScreenBoot";
import { CRTEffects } from "@/overlays/Arcade/CRTEffects";
import { Snake } from "@/overlays/Arcade/Snake";
import { Minesweeper } from "@/overlays/Arcade/Minesweeper";
import { Tetris } from "@/overlays/Arcade/Tetris";
import { SFX, playSfx, useLoopSfx } from "@/lib/useSfx";

// Arcade content was authored for a 480×575 design space. The ScreenHtml
// DOM was bumped to 1440×1725 for supersampling, so CSS-scale the design
// tree to fill whatever the parent DOM size actually is. Dynamic via
// ResizeObserver so it stays correct if the DOM resolution changes again.
const ARCADE_DESIGN_W = 480;
const ARCADE_DESIGN_H = 575;

function ArcadeFrame({ children }: { children: ReactNode }) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const host = hostRef.current;
    const inner = innerRef.current;
    if (!host || !inner) return;
    const fit = () => {
      const w = host.offsetWidth;
      const h = host.offsetHeight;
      if (!w || !h) return;
      const s = Math.min(w / ARCADE_DESIGN_W, h / ARCADE_DESIGN_H);
      // `zoom` (layout reflow) instead of `transform: scale` (bitmap upscale)
      // — prevents blurry text when the design space is smaller than the
      // supersampled ScreenHtml DOM.
      inner.style.zoom = String(s);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(host);
    return () => ro.disconnect();
  }, []);
  return (
    <div
      ref={hostRef}
      style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden" }}
    >
      <div
        ref={innerRef}
        style={{
          width: ARCADE_DESIGN_W,
          height: ARCADE_DESIGN_H,
          transformOrigin: "top left",
          position: "absolute",
          top: 0,
          left: 0,
        }}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Arcade menu — navigable game selector with retro CRT styling.
 * Games: Snake, Minesweeper, Tetris. ESC returns to room; Arrow/WASD navigate; Enter/Space select.
 * Rendered inside the 3D arcade screen via <ScreenHtml> in Room.tsx.
 */

type GameId = "snake" | "minesweeper" | "tetris";

interface GameEntry {
  id: GameId;
  name: string;
  tag: string;
}

const GAMES: GameEntry[] = [
  { id: "snake", name: "SNAKE", tag: "1978" },
  { id: "minesweeper", name: "MINESWEEPER", tag: "1989" },
  { id: "tetris", name: "TETRIS", tag: "1984" },
];

export function ArcadeMenu() {
  const [active, setActive] = useState<GameId | null>(null);
  const [cursor, setCursor] = useState(0);
  const [blink, setBlink] = useState(true);

  // Menu BGM: loop while on the selector, stop while a game is active
  useLoopSfx(SFX.arcadeMenuLoop, active === null, 0.35);

  useEffect(() => {
    const id = window.setInterval(() => setBlink((b) => !b), 500);
    return () => window.clearInterval(id);
  }, []);

  const exitGame = useCallback(() => setActive(null), []);

  useEffect(() => {
    if (active) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        tweenCameraToZone("room");
        return;
      }
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
        setCursor((c) => (c - 1 + GAMES.length) % GAMES.length);
        playSfx(SFX.arcadeNav, 0.6);
        e.preventDefault();
      } else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
        setCursor((c) => (c + 1) % GAMES.length);
        playSfx(SFX.arcadeNav, 0.6);
        e.preventDefault();
      } else if (e.key === "Enter" || e.key === " ") {
        playSfx(SFX.arcadeSelect, 0.8);
        setActive(GAMES[cursor].id);
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [active, cursor]);

  if (active === "snake") {
    return (
      <ArcadeFrame>
        <ScreenBoot>
          <CRTEffects>
            <Snake onExit={exitGame} />
          </CRTEffects>
        </ScreenBoot>
      </ArcadeFrame>
    );
  }
  if (active === "minesweeper") {
    return (
      <ArcadeFrame>
        <ScreenBoot>
          <CRTEffects>
            <Minesweeper onExit={exitGame} />
          </CRTEffects>
        </ScreenBoot>
      </ArcadeFrame>
    );
  }
  if (active === "tetris") {
    return (
      <ArcadeFrame>
        <ScreenBoot>
          <CRTEffects>
            <Tetris onExit={exitGame} />
          </CRTEffects>
        </ScreenBoot>
      </ArcadeFrame>
    );
  }

  return (
    <ArcadeFrame>
    <ScreenBoot>
      <CRTEffects>
        <div className="w-full h-full flex flex-col items-center justify-start pt-8 px-4 font-mono text-orange-200">
          <div className="text-[10px] tracking-widest text-orange-300 crt-glow mb-1">
            ━━━ ARCADE ━━━
          </div>
          <div className="text-[9px] tracking-widest text-orange-400/70 mb-5">
            INSERT COIN ▸ FREE PLAY
          </div>
          <h1 className="text-orange-400 text-[28px] leading-[1.15] tracking-[0.25em] crt-glow text-center font-black">
            SELECT
          </h1>
          <h1 className="text-orange-400 text-[28px] leading-[1.15] tracking-[0.25em] crt-glow mb-6 text-center font-black">
            GAME
          </h1>
          <div className="flex flex-col gap-2 items-stretch w-full max-w-[300px]">
            {GAMES.map((g, i) => {
              const selected = i === cursor;
              return (
                <button
                  key={g.id}
                  onClick={() => {
                    playSfx(SFX.arcadeSelect, 0.8);
                    setActive(g.id);
                  }}
                  onMouseEnter={() => {
                    if (cursor !== i) playSfx(SFX.arcadeNav, 0.6);
                    setCursor(i);
                  }}
                  className="relative text-left py-3 px-4 transition-colors"
                  style={{
                    border: `1px solid ${selected ? "#ffb050" : "rgba(255,140,40,0.35)"}`,
                    background: selected
                      ? "rgba(255,140,40,0.15)"
                      : "rgba(255,140,40,0.03)",
                    color: selected ? "#ffd27a" : "#ffa766",
                    textShadow: selected
                      ? "0 0 6px #ffcc66, 0 0 14px #ff9030"
                      : "0 0 3px currentColor",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-lg tracking-[0.3em]">
                      {selected ? (blink ? "▸ " : "  ") : "  "}
                      {g.name}
                    </span>
                    <span className="text-[9px] opacity-60 tracking-widest">
                      {g.tag}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="mt-8 flex flex-col items-center gap-1 text-[9px] tracking-widest text-orange-400/70">
            <div>▲▼ / WS : NAVIGATE</div>
            <div>ENTER : SELECT</div>
            <div>ESC : EXIT</div>
          </div>
          <div
            className="mt-6 text-orange-400/50 text-[9px] tracking-[0.3em] crt-glow"
            style={{ opacity: blink ? 1 : 0.35 }}
          >
            ▪ READY ▪
          </div>
        </div>
      </CRTEffects>
    </ScreenBoot>
    </ArcadeFrame>
  );
}
