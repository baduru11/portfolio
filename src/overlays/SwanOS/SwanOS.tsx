"use client";

import "./duruos.css";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { tweenCameraToZone } from "@/effects/transitions";
import { SFX, playSfx, stopLoadingSfx } from "@/lib/useSfx";

// ---------------------------------------------------------------------------
// DURU OS — port of the claude.ai/design bundle into the 3D monitor overlay.
// Design space is 1920×1080; the outer container CSS-scales it to fit the
// monitor's 1280×737 DOM. Mouse deltas are converted via a module-level
// scale ref updated on every resize.
// ---------------------------------------------------------------------------

const DESIGN_W = 1920;
const DESIGN_H = 1080;

type Dot = "acc" | "mag" | "cyan";
type WinState = "idle" | "opening" | "closing" | "minimizing";
type WinId =
  | "whoami"
  | "edu"
  | "exp"
  | "contact"
  | "neo"
  | "hobbies"
  | "cmatrix";

interface Win {
  id: WinId;
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
  open: boolean;
  z: number;
  state: WinState;
  dot: Dot;
  /** Pre-maximize geometry. Present iff the window is currently maximized. */
  prev?: { x: number; y: number; w: number; h: number };
}

const INITIAL_WINS: Win[] = [
  { id: "whoami", title: "WHOAMI.EXE", x: 520, y: 240, w: 900, h: 600, open: false, z: 5, state: "idle", dot: "acc" },
  { id: "edu", title: "EDUCATION.LOG", x: 1100, y: 100, w: 600, h: 360, open: false, z: 4, state: "idle", dot: "cyan" },
  { id: "exp", title: "EXPERIENCE.DB", x: 320, y: 560, w: 900, h: 440, open: false, z: 3, state: "idle", dot: "acc" },
  { id: "contact", title: "CONTACT.SH", x: 1260, y: 520, w: 540, h: 400, open: false, z: 2, state: "idle", dot: "mag" },
  { id: "neo", title: "FASTFETCH", x: 700, y: 200, w: 480, h: 400, open: false, z: 1, state: "idle", dot: "cyan" },
  { id: "hobbies", title: "HOBBIES.SYS", x: 820, y: 460, w: 720, h: 560, open: false, z: 0, state: "idle", dot: "mag" },
  { id: "cmatrix", title: "CMATRIX", x: 300, y: 160, w: 760, h: 520, open: false, z: 0, state: "idle", dot: "acc" },
];

// Returns the effective screen-pixels-per-design-pixel ratio, live.
// Drei's <Html transform> applies its own matrix3d on top of our CSS scale,
// so a single static ref isn't enough for drag math — we measure the
// scaled div's rendered width (which reflects BOTH transforms) whenever a
// drag handler needs it.
function getScale(): number {
  if (typeof document === "undefined") return 1;
  const el = document.querySelector<HTMLElement>(".duru-scale");
  if (!el) return 1;
  const r = el.getBoundingClientRect();
  if (!r.width) return 1;
  return r.width / DESIGN_W;
}

// ---------------------------------------------------------------------------
// Shared visual primitives
// ---------------------------------------------------------------------------

function useTypewriter(text: string, speed = 30): string {
  const [out, setOut] = useState("");
  useEffect(() => {
    setOut("");
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setOut(text.slice(0, i));
      if (i >= text.length) window.clearInterval(id);
    }, speed);
    return () => window.clearInterval(id);
  }, [text, speed]);
  return out;
}

interface DecryptTextProps {
  text: string;
  delay?: number;
  speed?: number;
}
function DecryptText({ text, delay = 0, speed = 28 }: DecryptTextProps) {
  const [out, setOut] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const chars = "!@#$%^&*<>/\\|0123456789ABCDEF▓█▒░";
    const startT = window.setTimeout(() => {
      let frame = 0;
      const total = text.length * 2;
      const id = window.setInterval(() => {
        if (cancelled) {
          window.clearInterval(id);
          return;
        }
        frame += 1;
        const revealed = Math.min(text.length, Math.floor(frame / 2));
        let s = "";
        for (let i = 0; i < text.length; i += 1) {
          if (i < revealed) s += text[i];
          else if (text[i] === " ") s += " ";
          else s += chars[Math.floor(Math.random() * chars.length)];
        }
        setOut(s);
        if (frame >= total) {
          window.clearInterval(id);
          setOut(text);
          setDone(true);
        }
      }, speed);
    }, delay);
    return () => {
      cancelled = true;
      window.clearTimeout(startT);
    };
  }, [text, delay, speed]);
  return (
    <span className={`decrypt-text ${done ? "" : "scrambling"}`}>
      {out || "\u00A0"}
    </span>
  );
}

interface BarProps {
  pct: number;
  color?: string;
  live?: boolean;
}
function Bar({ pct: target, color = "var(--acc)", live = true }: BarProps) {
  const [pct, setP] = useState(target);
  useEffect(() => {
    if (!live) {
      setP(target);
      return;
    }
    const id = window.setInterval(() => {
      setP((p) => {
        const drift = (Math.random() - 0.5) * 6;
        const n = Math.max(target - 12, Math.min(target + 12, p + drift));
        return Math.max(2, Math.min(98, Math.round(n)));
      });
    }, 700 + Math.random() * 400);
    return () => window.clearInterval(id);
  }, [target, live]);
  const blocks = 8;
  const fill = Math.round((pct / 100) * blocks);
  return (
    <span style={{ color, fontFamily: "var(--font-mono)", letterSpacing: "-0.05em" }}>
      {"█".repeat(fill)}
      <span style={{ color: "var(--ink-faint)" }}>{"░".repeat(blocks - fill)}</span>
      <span style={{ color: "var(--ink-dim)", marginLeft: 6, fontSize: 10 }}>{pct}%</span>
    </span>
  );
}

interface SparklineProps {
  color?: string;
  bars?: number;
  height?: number;
}
function Sparkline({ color = "var(--acc)", bars = 24, height = 28 }: SparklineProps) {
  const [vals, setV] = useState<number[]>(() => Array.from({ length: bars }, () => Math.random()));
  useEffect(() => {
    const id = window.setInterval(() => {
      setV((v) => [
        ...v.slice(1),
        Math.random() * 0.7 + 0.15 + Math.sin(Date.now() / 700) * 0.15,
      ]);
    }, 220);
    return () => window.clearInterval(id);
  }, []);
  return (
    <span style={{ display: "inline-flex", alignItems: "flex-end", height, gap: 1 }}>
      {vals.map((v, i) => (
        <span
          key={i}
          className="sparkbar"
          style={{
            height: Math.max(2, v * height),
            background: color,
            opacity: 0.4 + (i / bars) * 0.6,
          }}
        />
      ))}
    </span>
  );
}

function Clock() {
  const [t, setT] = useState(() => new Date());
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    const id = window.setInterval(() => {
      setT(new Date());
      setFlash((f) => !f);
    }, 1000);
    return () => window.clearInterval(id);
  }, []);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", lineHeight: 1, gap: 2 }}>
      <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "0.14em", color: "var(--acc)" }}>
        {pad(t.getHours())}
        <span style={{ opacity: flash ? 1 : 0.3 }}>:</span>
        {pad(t.getMinutes())}
        <span style={{ opacity: flash ? 0.3 : 1 }}>:</span>
        {pad(t.getSeconds())}
      </div>
      <div style={{ fontSize: 12, letterSpacing: "0.2em", color: "var(--ink-dim)" }}>
        {t.getFullYear()}.{pad(t.getMonth() + 1)}.{pad(t.getDate())}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Animated ASCII plasma art
// ---------------------------------------------------------------------------

interface AsciiArtProps {
  cols?: number;
  rows?: number;
  color?: string;
}
function AsciiArt({ cols = 14, rows = 8, color = "var(--acc)" }: AsciiArtProps) {
  const preRef = useRef<HTMLPreElement | null>(null);
  useEffect(() => {
    const chars = " ·:;+=xX$&@#";
    let t = 0;
    let raf = 0;
    let last = 0;
    const FRAME_MS = 1000 / 30; // cap at ~30fps — plasma has no fast motion
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (now - last < FRAME_MS) return;
      last = now;
      // Step by 0.036 at 30fps so apparent motion speed matches the old
      // 60fps × 0.018 increment.
      t += 0.036;
      let out = "";
      for (let y = 0; y < rows; y += 1) {
        for (let x = 0; x < cols; x += 1) {
          const nx = x / cols;
          const ny = y / rows;
          const v =
            Math.sin(nx * 6 + t) * 0.3 +
            Math.sin(ny * 5 - t * 0.7) * 0.3 +
            Math.sin((nx + ny) * 4 + t * 0.9) * 0.2 +
            Math.sin(Math.sqrt((nx - 0.5) ** 2 + (ny - 0.5) ** 2) * 10 - t * 1.2) * 0.2;
          const idx = Math.floor(((v + 1) / 2) * (chars.length - 1));
          out += chars[Math.max(0, Math.min(chars.length - 1, idx))];
        }
        out += "\n";
      }
      if (preRef.current) preRef.current.textContent = out;
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [cols, rows]);
  return (
    <pre
      ref={preRef}
      style={{
        margin: 0,
        fontSize: 11,
        lineHeight: 1.25,
        color,
        letterSpacing: "0.05em",
        fontFamily: "var(--font-mono)",
        flexShrink: 0,
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Desktop icons
// ---------------------------------------------------------------------------

type IconName = "user" | "book" | "db" | "wave" | "guitar";

function GlyphIcon({ name, size = 28 }: { name: IconName; size?: number }) {
  const sw = 1.4;
  const stroke = "currentColor";
  switch (name) {
    case "user":
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke={stroke} strokeWidth={sw}>
          <rect x="4" y="4" width="24" height="24" />
          <circle cx="16" cy="13" r="4" />
          <path d="M8 26 Q8 19 16 19 Q24 19 24 26" />
        </svg>
      );
    case "book":
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke={stroke} strokeWidth={sw}>
          <rect x="4" y="4" width="24" height="24" />
          <path d="M8 8 L24 8 M8 12 L20 12 M8 16 L22 16 M8 20 L16 20" />
          <path d="M22 22 L26 22 L26 26" />
        </svg>
      );
    case "db":
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke={stroke} strokeWidth={sw}>
          <rect x="4" y="4" width="24" height="24" />
          <path d="M8 10 L24 10 M8 16 L24 16 M8 22 L24 22" />
          <rect x="11" y="12" width="2" height="2" fill={stroke} />
          <rect x="11" y="18" width="2" height="2" fill={stroke} />
        </svg>
      );
    case "wave":
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke={stroke} strokeWidth={sw}>
          <rect x="4" y="4" width="24" height="24" />
          <path d="M7 16 Q10 10 13 16 T19 16 T25 16" />
          <circle cx="7" cy="16" r="1" fill={stroke} />
          <circle cx="25" cy="16" r="1" fill={stroke} />
        </svg>
      );
    case "guitar":
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke={stroke} strokeWidth={sw}>
          <rect x="4" y="4" width="24" height="24" />
          <path d="M11 21 a4 4 0 1 0 4 -4 l5 -5 l3 -3 l-1 -1 l-3 3 l-5 5 a4 4 0 0 0 -3 5 z" />
          <circle cx="13" cy="19" r="1.3" fill={stroke} />
          <path d="M21 10 L22 11" />
        </svg>
      );
  }
}

interface DesktopIconProps {
  icon: IconName;
  label: string;
  onOpen: () => void;
}
function DesktopIcon({ icon, label, onOpen }: DesktopIconProps) {
  const [hover, setHover] = useState(false);
  const [scramble, setScramble] = useState<string | null>(null);
  const handleClick = () => {
    const chars = "▓█▒░/\\|#@$%*+-=<>";
    let i = 0;
    const id = window.setInterval(() => {
      if (i > 6) {
        window.clearInterval(id);
        setScramble(null);
        onOpen();
        return;
      }
      i += 1;
      setScramble(
        label
          .split("")
          .map((c) => (c === "." ? c : chars[Math.floor(Math.random() * chars.length)]))
          .join(""),
      );
    }, 30);
  };
  return (
    <div
      style={{ width: 180, cursor: "pointer", userSelect: "none" }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={handleClick}
    >
      <div
        style={{
          width: 112,
          height: 112,
          margin: "0 auto",
          border: `1px solid ${hover ? "var(--acc)" : "var(--ink-faint)"}`,
          background: hover ? "rgba(255,45,120,0.08)" : "rgba(15,10,26,0.6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: hover ? "var(--acc)" : "var(--ink)",
          boxShadow: hover
            ? "0 0 20px rgba(255,45,120,0.28), inset 0 0 0 1px rgba(255,45,120,0.12)"
            : "none",
          transition: "all 120ms",
          transform: hover ? "translateY(-1px)" : "translateY(0)",
        }}
      >
        <GlyphIcon name={icon} size={56} />
      </div>
      <div
        style={{
          marginTop: 10,
          textAlign: "center",
          fontFamily: "var(--font-mono)",
          fontSize: 17,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: hover ? "var(--acc)" : "var(--ink-dim)",
          textShadow: hover ? "0 0 8px rgba(255,45,120,0.6)" : "none",
        }}
      >
        [{scramble ?? label}]
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Background / ticker / topbar
// ---------------------------------------------------------------------------

function DesktopBackground() {
  const gridBg =
    "linear-gradient(rgba(90,50,140,0.35) 1px, transparent 1px), " +
    "linear-gradient(90deg, rgba(90,50,140,0.35) 1px, transparent 1px)";
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: gridBg,
        backgroundSize: "40px 40px",
      }}
    >
      <div
        style={{
          position: "absolute",
          right: 20,
          bottom: 44,
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.3em",
          color: "rgba(255,45,120,0.15)",
        }}
      >
        DURU OS // 2026
      </div>
      <svg
        style={{ position: "absolute", left: 0, bottom: 0, opacity: 0.15 }}
        width="300"
        height="300"
        viewBox="0 0 300 300"
      >
        <g stroke="#8b3dd6" strokeWidth="0.5" fill="none">
          {Array.from({ length: 8 }).map((_, i) => (
            <circle key={i} cx="0" cy="300" r={40 + i * 35} />
          ))}
          <path d="M0 250 L60 250 M0 200 L90 200 M0 150 L120 150 M0 100 L80 100" />
        </g>
      </svg>
    </div>
  );
}

function Ticker() {
  const content =
    "DURU OS v1.0 // ALL SYSTEMS NOMINAL // UPTIME 04:22:11 // LOCATION HKG // MEM 61% // CPU 74% // NET OK // ".repeat(8);
  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 32,
        background: "#05040a",
        borderTop: "1px solid var(--ink-faint)",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        fontFamily: "var(--font-mono)",
        fontSize: 14,
        letterSpacing: "0.22em",
        color: "var(--acc)",
        zIndex: 99,
      }}
    >
      <div style={{ whiteSpace: "nowrap", animation: "duru-ticker-scroll 90s linear infinite", paddingLeft: 20 }}>
        {content}
      </div>
    </div>
  );
}

type TextSize = "sm" | "md" | "lg";

interface TopbarProps {
  textSize: TextSize;
  onTextSize: (v: TextSize) => void;
}
function Topbar({ textSize, onTextSize }: TopbarProps) {
  const sizes: { l: string; v: TextSize }[] = [
    { l: "S", v: "sm" },
    { l: "M", v: "md" },
    { l: "L", v: "lg" },
  ];
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 60,
        background: "linear-gradient(180deg, rgba(10,6,20,0.98), rgba(10,6,20,0.92))",
        borderBottom: "1px solid var(--acc)",
        display: "flex",
        alignItems: "center",
        padding: "0 18px",
        gap: 20,
        fontFamily: "var(--font-mono)",
        fontSize: 15,
        zIndex: 100,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ color: "var(--acc)", letterSpacing: "0.2em", fontWeight: 600 }}>DURU OS</span>
        <span style={{ color: "var(--ink-dim)", letterSpacing: "0.14em" }}>v1.0</span>
        <span className="blink" style={{ color: "var(--acc)" }}>▮</span>
      </div>
      <div style={{ display: "flex", gap: 4, marginLeft: 8 }}>
        {sizes.map((s) => (
          <div
            key={s.v}
            onClick={() => onTextSize(s.v)}
            style={{
              width: 28,
              height: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid",
              borderColor: textSize === s.v ? "var(--acc)" : "var(--ink-faint)",
              color: textSize === s.v ? "var(--acc)" : "var(--ink-dim)",
              background: textSize === s.v ? "rgba(255,45,120,0.12)" : "transparent",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 120ms",
            }}
          >
            {s.l}
          </div>
        ))}
      </div>
      <div style={{ flex: 1 }} />
      <div
        style={{
          display: "flex",
          gap: 16,
          alignItems: "center",
          color: "var(--ink-dim)",
          fontSize: 14,
          letterSpacing: "0.12em",
        }}
      >
        <span>CPU <Bar pct={74} color="var(--acc)" /></span>
        <span>RAM <Bar pct={61} color="var(--acc-3)" /></span>
        <span>NET <Sparkline color="var(--acc-3)" height={16} bars={14} /></span>
        <span>VOL ▮▮▮▮▯▯</span>
      </div>
      <Clock />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Window
// ---------------------------------------------------------------------------

type ResizeDir = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

interface WindowProps {
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  focused: boolean;
  state: WinState;
  dot: Dot;
  noPad?: boolean;
  onFocus: () => void;
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  onGeom: (geom: { x: number; y: number; w: number; h: number }) => void;
  children: ReactNode;
}

const RESIZE_HANDLES: { d: ResizeDir; style: CSSProperties }[] = [
  { d: "n", style: { top: 0, left: 4, right: 4, height: 4, cursor: "n-resize" } },
  { d: "s", style: { bottom: 0, left: 4, right: 4, height: 4, cursor: "s-resize" } },
  { d: "e", style: { top: 4, bottom: 4, right: 0, width: 4, cursor: "e-resize" } },
  { d: "w", style: { top: 4, bottom: 4, left: 0, width: 4, cursor: "w-resize" } },
  { d: "ne", style: { top: 0, right: 0, width: 10, height: 10, cursor: "ne-resize" } },
  { d: "nw", style: { top: 0, left: 0, width: 10, height: 10, cursor: "nw-resize" } },
  { d: "se", style: { bottom: 0, right: 0, width: 10, height: 10, cursor: "se-resize" } },
  { d: "sw", style: { bottom: 0, left: 0, width: 10, height: 10, cursor: "sw-resize" } },
];

function Window({
  title,
  x,
  y,
  w,
  h,
  z,
  focused,
  state,
  dot,
  noPad = false,
  onFocus,
  onClose,
  onMinimize,
  onMaximize,
  onGeom,
  children,
}: WindowProps) {
  const typedTitle = useTypewriter(title, 28);
  const [pos, setPos] = useState({ x, y });
  const [size, setSize] = useState({ w, h });
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState<ResizeDir | null>(null);
  const [flicker, setFlicker] = useState(false);
  const startRef = useRef<{
    mx: number;
    my: number;
    px: number;
    py: number;
    pw: number;
    ph: number;
    scale: number;
  } | null>(null);
  const prevFocus = useRef(focused);
  // Keep refs synced with state so drag/resize handlers can read "live"
  // geometry without pulling pos/size into their effect deps (which would
  // re-register listeners on every mousemove and cause visible lag).
  const posRef = useRef(pos);
  const sizeRef = useRef(size);
  useEffect(() => {
    posRef.current = pos;
  }, [pos]);
  useEffect(() => {
    sizeRef.current = size;
  }, [size]);

  useEffect(() => setPos({ x, y }), [x, y]);
  useEffect(() => setSize({ w, h }), [w, h]);
  useEffect(() => {
    if (focused && !prevFocus.current) {
      setFlicker(true);
      const id = window.setTimeout(() => setFlicker(false), 300);
      prevFocus.current = focused;
      return () => window.clearTimeout(id);
    }
    prevFocus.current = focused;
  }, [focused]);

  const onTitleMouseDown = (e: ReactMouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest(".win-btn") || target.closest(".resize-handle")) return;
    onFocus();
    setDragging(true);
    // Cache scale once at mousedown — avoids a querySelector+getBoundingClientRect
    // round-trip on every mousemove (60+ Hz during drag).
    startRef.current = {
      mx: e.clientX,
      my: e.clientY,
      px: pos.x,
      py: pos.y,
      pw: size.w,
      ph: size.h,
      scale: getScale(),
    };
  };

  useEffect(() => {
    if (!dragging || !startRef.current) return;
    const start = startRef.current;
    const mv = (e: globalThis.MouseEvent) => {
      const dx = (e.clientX - start.mx) / start.scale;
      const dy = (e.clientY - start.my) / start.scale;
      setPos({ x: start.px + dx, y: start.py + dy });
    };
    const up = () => {
      setDragging(false);
      const p = posRef.current;
      const s = sizeRef.current;
      onGeom({ x: p.x, y: p.y, w: s.w, h: s.h });
    };
    window.addEventListener("mousemove", mv);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", mv);
      window.removeEventListener("mouseup", up);
    };
  }, [dragging, onGeom]);

  const startResize = (e: ReactMouseEvent, dir: ResizeDir) => {
    e.stopPropagation();
    e.preventDefault();
    onFocus();
    setResizing(dir);
    startRef.current = {
      mx: e.clientX,
      my: e.clientY,
      px: pos.x,
      py: pos.y,
      pw: size.w,
      ph: size.h,
      scale: getScale(),
    };
  };

  useEffect(() => {
    if (!resizing || !startRef.current) return;
    const start = startRef.current;
    const d = resizing;
    const minW = 260;
    const minH = 180;
    const mv = (e: globalThis.MouseEvent) => {
      const dx = (e.clientX - start.mx) / start.scale;
      const dy = (e.clientY - start.my) / start.scale;
      let nx = start.px;
      let ny = start.py;
      let nw = start.pw;
      let nh = start.ph;
      if (d.includes("e")) nw = Math.max(minW, nw + dx);
      if (d.includes("s")) nh = Math.max(minH, nh + dy);
      if (d.includes("w")) {
        const delta = Math.min(dx, nw - minW);
        nx += delta;
        nw -= delta;
      }
      if (d.includes("n")) {
        const delta = Math.min(dy, nh - minH);
        ny += delta;
        nh -= delta;
      }
      setPos({ x: nx, y: ny });
      setSize({ w: nw, h: nh });
    };
    const up = () => {
      setResizing(null);
      const p = posRef.current;
      const s = sizeRef.current;
      onGeom({ x: p.x, y: p.y, w: s.w, h: s.h });
    };
    window.addEventListener("mousemove", mv);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", mv);
      window.removeEventListener("mouseup", up);
    };
  }, [resizing, onGeom]);

  const dotColor: Record<Dot, string> = {
    acc: "var(--acc)",
    mag: "var(--acc-2)",
    cyan: "var(--acc-3)",
  };
  const stateClass =
    state === "opening"
      ? "win-opening"
      : state === "closing"
      ? "win-closing"
      : state === "minimizing"
      ? "win-minimizing"
      : "";

  const isActive = dragging || resizing;

  return (
    <div
      className={`window ${focused ? "focused" : ""} ${stateClass} ${flicker ? "focus-flicker" : ""}`}
      style={{
        left: pos.x,
        top: pos.y,
        width: size.w,
        height: size.h,
        zIndex: z,
        opacity: isActive ? 0.92 : 1,
        transition: isActive ? "none" : "opacity 150ms",
        willChange: isActive ? "left, top, width, height" : undefined,
      }}
      onMouseDown={onFocus}
    >
      {RESIZE_HANDLES.map(({ d, style }) => (
        <div
          key={d}
          className="resize-handle"
          style={style}
          onMouseDown={(e) => startResize(e, d)}
        />
      ))}
      <div className="window-title" onMouseDown={onTitleMouseDown}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              width: 8,
              height: 8,
              background: focused ? dotColor[dot] : "var(--ink-faint)",
              boxShadow: focused ? `0 0 8px ${dotColor[dot]}` : "none",
              display: "inline-block",
            }}
          />
          <span style={{ color: focused ? "var(--acc)" : "var(--ink-dim)" }}>▮ {typedTitle}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {resizing && (
            <span style={{ color: "var(--acc-3)", fontSize: 9, letterSpacing: "0.1em" }}>
              {Math.round(size.w)}×{Math.round(size.h)}
            </span>
          )}
          <div className="dots">
            <span
              className="btn win-btn"
              title="minimize"
              onClick={(e) => {
                e.stopPropagation();
                onMinimize();
              }}
            >
              −
            </span>
            <span
              className="btn win-btn"
              title="maximize"
              onClick={(e) => {
                e.stopPropagation();
                onMaximize();
              }}
            >
              □
            </span>
            <span
              className="btn win-btn close"
              title="close"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
            >
              ×
            </span>
          </div>
        </div>
      </div>
      <div className={`window-body${noPad ? " no-pad" : ""}`}>{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Window bodies
// ---------------------------------------------------------------------------

function linkStyle(): CSSProperties {
  return {
    cursor: "pointer",
    textDecoration: "underline",
    textDecorationColor: "rgba(255,45,120,0.5)",
    textUnderlineOffset: "3px",
  };
}

function WhoamiBody() {
  return (
    <div>
      <div style={{ display: "flex", gap: 20, marginBottom: 14 }}>
        <AsciiArt cols={13} rows={7} />
        <div style={{ flex: 1 }}>
          <div className="kv"><span className="k">name</span><span className="v hl"><DecryptText text="SEUNGWAN" delay={120} /></span></div>
          <div className="kv"><span className="k">University</span><span className="v"><DecryptText text="HKUST" delay={260} /></span></div>
          <div className="kv"><span className="k">location</span><span className="v"><DecryptText text="HONG KONG / SEOUL" delay={400} /></span></div>
          <div className="kv"><span className="k">status</span><span className="v"><DecryptText text="CS STUDENT @ HKUST" delay={560} /></span></div>
        </div>
      </div>
      <div className="kv"><span className="k">major</span><span className="v"><DecryptText text="COMPUTER SCIENCE + AI" delay={720} /></span></div>
      <div className="kv">
        <span className="k">bio</span>
        <span className="v" style={{ fontFamily: "var(--font-mono)", fontSize: 11, lineHeight: 1.6 }}>
          Year 2 CS student at HKUST. Passionate in Artificial Intelligence and Full-stack development.
          Likes to build, do hackathons, tackle real problems. Currently collaborating with HKUST CLE to assist instructors and students with AI.
        </span>
      </div>
      <div className="kv">
        <span className="k">github</span>
        <span
          className="v hl"
          style={linkStyle()}
          onClick={() => window.open("https://github.com/baduru11", "_blank")}
        >
          <DecryptText text="github.com/baduru11" delay={900} />
        </span>
      </div>
      <div className="kv">
        <span className="k">linkedin</span>
        <span
          className="v hl"
          style={linkStyle()}
          onClick={() => window.open("https://linkedin.com/in/seungwan-kang", "_blank")}
        >
          <DecryptText text="linkedin.com/in/seungwan-kang" delay={1060} />
        </span>
      </div>
    </div>
  );
}

function EducationBody() {
  return (
    <div>
      <div className="kv"><span className="k">institution</span><span className="v hl"><DecryptText text="HKUST" delay={100} /></span></div>
      <div className="kv"><span className="k">degree</span><span className="v"><DecryptText text="BEng in Computer Science" delay={240} /></span></div>
      <div className="kv"><span className="k">major</span><span className="v"><DecryptText text="Extended Major in AI" delay={400} /></span></div>
      <div className="kv"><span className="k">status</span><span className="v"><DecryptText text="YEAR 2 — IN PROGRESS" delay={560} /></span></div>
      <div className="kv"><span className="k">expected</span><span className="v"><DecryptText text="JUNE 2028" delay={720} /></span></div>
    </div>
  );
}

interface ExpItem {
  n: string;
  t: string;
  role: string;
  yr: string;
  desc: string;
  stack: string;
  color: string;
}

function ExperienceBody() {
  const items: ExpItem[] = [
    {
      n: "01",
      t: "HKUST CLE",
      role: "Software Engineer — AI Lang. Platform",
      yr: "Mar 2026–Present",
      desc:
        "Sole engineer building an AI-powered language teaching platform. REINFORCE contextual bandit, RAG pipeline (FastAPI, pgvector, Whisper), live WebSocket quizzes, FSRS-5 spaced repetition.",
      stack: "FastAPI · PyTorch · Next.js · RAG",
      color: "var(--acc)",
    },
    {
      n: "02",
      t: "REPUBLIC OF KOREA ARMY",
      role: "Administrative Specialist & Squad Leader",
      yr: "Sep 2023–Mar 2025",
      desc:
        "Led 9-soldier squad at 201 Quick Response Brigade HQ. Managed unit-wide operations, personnel records, and logistical data.",
      stack: "201 QRB HQ · Daegu, Korea",
      color: "var(--acc-3)",
    },
  ];
  return (
    <div>
      {items.map((it, i) => (
        <div key={it.n} style={{ padding: "10px 0", borderBottom: "1px solid var(--ink-faint)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <span
              style={{
                color: it.color,
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.1em",
                border: `1px solid ${it.color}`,
                padding: "1px 5px",
              }}
            >
              [{it.n}]
            </span>
            <span style={{ color: "var(--ink)", fontSize: 12, letterSpacing: "0.14em", fontWeight: 600 }}>
              <DecryptText text={it.t} delay={i * 200} />
            </span>
            <span style={{ marginLeft: "auto", color: "var(--ink-dim)", fontSize: 10, letterSpacing: "0.14em" }}>
              <DecryptText text={it.yr} delay={i * 200 + 120} />
            </span>
          </div>
          <div
            style={{
              fontSize: 10,
              color: "var(--acc-3)",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            <DecryptText text={it.role} delay={i * 200 + 200} />
          </div>
          <div style={{ fontSize: 11, color: "var(--ink-dim)", lineHeight: 1.5 }}>{it.desc}</div>
          <div style={{ fontSize: 10, color: "var(--acc)", marginTop: 4, letterSpacing: "0.1em" }}>
            <DecryptText text={it.stack} delay={i * 200 + 360} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ContactBody() {
  const [line, setLine] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => {
      setLine((l) => {
        const next = l + 1;
        if (next >= 6) window.clearInterval(id);
        return Math.min(next, 6);
      });
    }, 250);
    return () => window.clearInterval(id);
  }, []);
  const lines: { p: string; t: string; c: string; url?: string; blink?: boolean }[] = [
    { p: "$", t: "./contact.sh --verbose", c: "var(--ink)" },
    { p: ">", t: "mail · skangal@connect.ust.hk", c: "var(--acc)" },
    { p: ">", t: "github · github.com/baduru11", c: "var(--acc)", url: "https://github.com/baduru11" },
    { p: ">", t: "linkedin · linkedin.com/in/seungwan-kang", c: "var(--acc)", url: "https://linkedin.com/in/seungwan-kang" },
    { p: ">", t: "phone · +852 4717 8551", c: "var(--acc)" },
    { p: ">", t: "location · HKG", c: "var(--acc-3)" },
    { p: ">", t: "status · open to collab, hire, say hi", c: "var(--acc-2)" },
    { p: "$", t: "_", c: "var(--ink)", blink: true },
  ];
  return (
    <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, lineHeight: 2 }}>
      {lines.slice(0, line + 1).map((l, i) => (
        <div
          key={i}
          style={{ cursor: l.url ? "pointer" : "default" }}
          onClick={() => l.url && window.open(l.url, "_blank")}
        >
          <span style={{ color: "var(--ink-dim)", marginRight: 8 }}>{l.p}</span>
          <span
            style={{
              color: l.c,
              textDecoration: l.url ? "underline" : "none",
              textDecorationColor: "rgba(255,45,120,0.5)",
              textUnderlineOffset: "3px",
            }}
          >
            {l.t}
            {l.blink && <span className="blink">█</span>}
          </span>
        </div>
      ))}
    </div>
  );
}

function NeofetchBody() {
  return (
    <div>
      <div style={{ display: "flex", gap: 20, fontFamily: "var(--font-mono)", fontSize: 11 }}>
        <AsciiArt cols={12} rows={7} color="var(--acc-3)" />
        <div style={{ lineHeight: 1.8 }}>
          <div>
            <span style={{ color: "var(--acc-3)" }}>seungwan</span>@
            <span style={{ color: "var(--acc-2)" }}>duru-os</span>
          </div>
          <div style={{ color: "var(--ink-dim)" }}>─────────────────────</div>
          <div><span style={{ color: "var(--acc-3)" }}>OS     </span> DURU OS v1.0</div>
          <div><span style={{ color: "var(--acc-3)" }}>KERNEL </span> duru-rt/6.9</div>
          <div><span style={{ color: "var(--acc-3)" }}>SHELL  </span> zsh 5.9</div>
          <div><span style={{ color: "var(--acc-3)" }}>WM     </span> i3-gaps-duru</div>
          <div><span style={{ color: "var(--acc-3)" }}>CPU    </span> <Bar pct={74} /></div>
          <div><span style={{ color: "var(--acc-3)" }}>RAM    </span> <Bar pct={61} color="var(--acc-3)" /></div>
          <div><span style={{ color: "var(--acc-3)" }}>UPTIME </span> 4h 22m 11s</div>
        </div>
      </div>
      <div
        style={{
          marginTop: 14,
          paddingTop: 10,
          borderTop: "1px solid var(--ink-faint)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
        }}
      >
        <div style={{ fontSize: 10, color: "var(--ink-dim)", letterSpacing: "0.18em" }}>NET I/O</div>
        <Sparkline color="var(--acc)" height={32} bars={28} />
      </div>
    </div>
  );
}

function GuitarString({ pluck, color, delay, thickness }: { pluck: number; color: string; delay: number; thickness: number }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!pluck) return;
    const id = window.setTimeout(() => {
      setOn(true);
      window.setTimeout(() => setOn(false), 400);
    }, delay);
    return () => window.clearTimeout(id);
  }, [pluck, delay]);
  return (
    <div style={{ position: "relative", height: thickness + 1, marginBottom: 7 }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: "50%",
          height: thickness,
          background: color,
          opacity: 0.7,
          transform: `translateY(-50%) ${on ? "scaleY(2.5)" : "scaleY(1)"}`,
          filter: on ? `drop-shadow(0 0 4px ${color})` : "none",
          transition: "transform 300ms cubic-bezier(.2,.9,.3,1), filter 300ms",
        }}
      />
    </div>
  );
}

function EQBars({ color, count = 32, height = 42 }: { color: string; count?: number; height?: number }) {
  const [bars, setBars] = useState<number[]>(() => Array.from({ length: count }, () => 20));
  useEffect(() => {
    const id = window.setInterval(() => {
      setBars((bs) =>
        bs.map((_, i) => {
          const curve = Math.sin((i / count) * Math.PI) * 60 + 20;
          return Math.max(6, Math.min(100, curve + (Math.random() - 0.3) * 40));
        }),
      );
    }, 90);
    return () => window.clearInterval(id);
  }, [count]);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height, width: "100%" }}>
      {bars.map((b, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: `${b}%`,
            background: color,
            opacity: 0.85,
            transition: "height 90ms linear",
          }}
        />
      ))}
    </div>
  );
}

function HobbiesBody() {
  const [pluck, setPluck] = useState(0);
  const tone = "var(--acc)";
  const strings = [1, 1, 1.2, 1.4, 1.6, 2];
  return (
    <div style={{ fontFamily: "var(--font-mono)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: "0.3em", color: "var(--ink-dim)" }}>SIDE.PROCESS ∙ PID 0x6A</div>
          <div
            style={{
              fontSize: 18,
              letterSpacing: "0.14em",
              color: "var(--acc)",
              marginTop: 2,
              textShadow: "0 0 10px rgba(255,45,120,0.35)",
            }}
          >
            <DecryptText text="WHEN NOT CODING" />
          </div>
        </div>
        <div
          style={{
            padding: "3px 8px",
            border: "1px solid var(--acc)",
            color: "var(--acc)",
            fontSize: 9,
            letterSpacing: "0.22em",
          }}
        >
          STATUS: AMP ON
        </div>
      </div>

      <div
        style={{
          border: "1px solid var(--ink-faint)",
          padding: "12px 14px",
          marginBottom: 14,
          background: "rgba(255,45,120,0.025)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 10, color: "var(--ink-dim)", letterSpacing: "0.22em" }}>[ BAND ]</div>
            <div style={{ fontSize: 15, color: "var(--ink)", letterSpacing: "0.08em", marginTop: 2 }}>
              <DecryptText text="HKUSTKSA BAND" delay={120} />
            </div>
            <div style={{ fontSize: 11, color: "var(--acc)", letterSpacing: "0.14em", marginTop: 3 }}>
              ROLE — ELECTRIC GUITARIST
            </div>
          </div>
          <div
            style={{ width: 140, paddingTop: 4, cursor: "pointer" }}
            onClick={() => setPluck((p) => p + 1)}
            title="pluck"
          >
            <div
              style={{
                fontSize: 8,
                color: "var(--ink-dim)",
                letterSpacing: "0.2em",
                textAlign: "right",
                marginBottom: 4,
              }}
            >
              ▶ PLUCK
            </div>
            {strings.map((th, i) => (
              <GuitarString
                key={`${pluck}-${i}`}
                pluck={pluck}
                delay={i * 40}
                thickness={th}
                color={i < 3 ? "var(--acc)" : "var(--acc-3)"}
              />
            ))}
          </div>
        </div>
        <div style={{ fontSize: 11, color: "var(--ink-dim)", lineHeight: 1.65, marginTop: 4 }}>
          Plays electric guitar for the HKUST Korean Students&apos; Association band. Performed live at the{" "}
          <span style={{ color: "var(--acc)" }}>HKUST Atrium</span> — full kit, full crowd, full volume.
        </div>
      </div>

      <div style={{ border: "1px solid var(--ink-faint)", padding: "10px 12px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 9,
            letterSpacing: "0.22em",
            color: "var(--ink-dim)",
            marginBottom: 8,
          }}
        >
          <span>SPECTRUM ∙ 32ch</span>
          <span style={{ color: tone }}>■ BAND</span>
        </div>
        <EQBars color={tone} count={32} height={42} />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 8,
            letterSpacing: "0.2em",
            color: "var(--ink-dim)",
            marginTop: 6,
          }}
        >
          <span>20Hz</span><span>1kHz</span><span>20kHz</span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CMatrix digital rain (window-contained)
// ---------------------------------------------------------------------------

function CMatrix() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      const W = c.offsetWidth || 720;
      const H = c.offsetHeight || 440;
      c.width = W * dpr;
      c.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(c);
    const fontSize = 15;
    const cols = Math.max(1, Math.floor((c.offsetWidth || 720) / fontSize));
    const drops = Array.from({ length: cols }, () => Math.floor(Math.random() * 30));
    const chars = "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎ0123456789▓█▒░";
    let raf = 0;
    let last = 0;
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (now - last < 1000 / 18) return;
      last = now;
      const W = c.offsetWidth;
      const H = c.offsetHeight;
      ctx.fillStyle = "rgba(3,2,8,0.14)";
      ctx.fillRect(0, 0, W, H);
      ctx.font = `${fontSize}px "JetBrains Mono", monospace`;
      for (let i = 0; i < cols; i += 1) {
        const ch = chars[Math.floor(Math.random() * chars.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;
        ctx.fillStyle = "#e6ffe6";
        ctx.globalAlpha = 0.95;
        ctx.fillText(ch, x, y);
        ctx.fillStyle =
          getComputedStyle(document.documentElement).getPropertyValue("--acc").trim() || "#d4ff3a";
        ctx.globalAlpha = 0.55;
        if (y > fontSize) ctx.fillText(ch, x, y - fontSize);
        ctx.globalAlpha = 1;
        if (y > H && Math.random() > 0.975) drops[i] = 0;
        drops[i] += 1;
      }
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);
  return (
    <div style={{ width: "100%", height: "100%", background: "#03020a", overflow: "hidden" }}>
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Boot overlay + lock screen
// ---------------------------------------------------------------------------

interface BootLine {
  t: string;
  c: string;
  cls?: string;
}
const BOOT_LINES: BootLine[] = [
  { t: "[ 0.000000] DURU OS bootloader v1.0", c: "var(--acc)" },
  { t: "[ 0.012451] Probing CPU... duru-rt/6.9 detected", c: "var(--ink)" },
  { t: "[ 0.034219] Initializing memory      [ OK ]", c: "var(--ink)" },
  { t: "[ 0.058371] Mounting /dev/synapse    [ OK ]", c: "var(--ink)" },
  { t: "[ 0.124002] Loading neural extensions...", c: "var(--ink)" },
  { t: "[ 0.218445] WARN: aesthetic.module unstable", c: "var(--warn)", cls: "warn" },
  { t: "[ 0.301220] Starting i3-gaps-duru     [ OK ]", c: "var(--ink)" },
  { t: "[ 0.412889] Starting compositor       [ OK ]", c: "var(--ink)" },
  { t: "[ 0.534001] Starting polybar          [ OK ]", c: "var(--ink)" },
  { t: "[ 0.602771] Loading user: seungwan@duru-os", c: "var(--ink)" },
  { t: "[ 0.701002] Decrypting profile...     [ OK ]", c: "var(--ink)" },
  { t: "[ 0.812445] All systems nominal.", c: "var(--ok)", cls: "ok" },
  { t: "", c: "var(--ink)" },
  { t: "> launching desktop session...", c: "var(--acc)" },
];

function BootSequence({ onDone }: { onDone: () => void }) {
  const [shown, setShown] = useState(0);
  const [fading, setFading] = useState(false);
  useEffect(() => {
    if (shown >= BOOT_LINES.length) {
      const id = window.setTimeout(() => setFading(true), 300);
      const id2 = window.setTimeout(onDone, 1000);
      return () => {
        window.clearTimeout(id);
        window.clearTimeout(id2);
      };
    }
    const id = window.setTimeout(() => setShown((s) => s + 1), 70 + Math.random() * 80);
    return () => window.clearTimeout(id);
  }, [shown, onDone]);
  return (
    <div className={`boot-overlay ${fading ? "boot-fading" : ""}`}>
      {BOOT_LINES.slice(0, shown).map((l, i) => (
        <div key={i} className={`boot-line ${l.cls ?? ""}`} style={{ color: l.c }}>
          {l.t || "\u00A0"}
        </div>
      ))}
      {shown < BOOT_LINES.length && (
        <div className="boot-line">
          <span className="blink" style={{ color: "var(--acc)" }}>█</span>
        </div>
      )}
    </div>
  );
}

function LockScreen({ onUnlock, ready = true }: { onUnlock: () => void; ready?: boolean }) {
  const [fading, setFading] = useState(false);
  const [t, setT] = useState(() => new Date());
  const [hint, setHint] = useState(false);
  useEffect(() => {
    const id = window.setInterval(() => setT(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  useEffect(() => {
    if (!ready) return;
    const id = window.setTimeout(() => setHint(true), 1800);
    return () => window.clearTimeout(id);
  }, [ready]);
  const unlock = useCallback(() => {
    if (!ready) return;
    setFading((f) => {
      if (f) return f;
      window.setTimeout(onUnlock, 200);
      return true;
    });
  }, [onUnlock, ready]);
  useEffect(() => {
    if (!ready) return;
    const onKey = () => unlock();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [unlock, ready]);
  const pad = (n: number) => String(n).padStart(2, "0");
  const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  return (
    <div
      onClick={unlock}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 99997,
        background: "rgba(3,2,8,0.97)",
        cursor: "pointer",
        opacity: fading ? 0 : 1,
        transition: fading ? "opacity 200ms ease-in" : "none",
        fontFamily: "var(--font-mono)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='60' height='52' viewBox='0 0 60 52'><path d='M30 0 L60 15 L60 37 L30 52 L0 37 L0 15 Z' fill='none' stroke='%232a1840' stroke-width='0.8'/></svg>\")",
          backgroundSize: "60px 52px",
          opacity: 0.6,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "42%",
          transform: "translate(-50%,-50%)",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(180,100,255,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 40,
          left: 52,
          fontSize: 11,
          letterSpacing: "0.34em",
          color: "rgba(255,45,120,0.3)",
          textTransform: "uppercase",
        }}
      >
        DURU OS // LOCKED
      </div>
      <div
        style={{
          position: "absolute",
          top: "32%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 200,
            fontWeight: 700,
            lineHeight: 0.85,
            color: "var(--acc)",
            textShadow: "0 0 80px rgba(255,45,120,0.25), 0 0 200px rgba(255,45,120,0.08)",
            letterSpacing: "-0.04em",
            fontFeatureSettings: "'tnum'",
          }}
        >
          {pad(t.getHours())}:{pad(t.getMinutes())}
        </div>
        <div style={{ marginTop: 18, fontSize: 13, letterSpacing: "0.5em", color: "rgba(232,228,240,0.35)" }}>
          {days[t.getDay()]} · {pad(t.getDate())} {months[t.getMonth()]} {t.getFullYear()}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          bottom: "22%",
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            border: "1px solid rgba(139,61,214,0.4)",
            padding: "12px 28px",
            background: "rgba(13,8,23,0.8)",
            backdropFilter: "blur(8px)",
          }}
        >
          <div style={{ width: 10, height: 10, background: "var(--acc)", boxShadow: "0 0 10px var(--acc)" }} />
          <span style={{ fontSize: 13, letterSpacing: "0.28em", color: "rgba(232,228,240,0.7)" }}>
            seungwan@duru-os
          </span>
          <div style={{ width: 6, height: 6, background: "var(--ok)", boxShadow: "0 0 6px var(--ok)" }} />
        </div>
        <div
          className="duru-unlock-hint"
          style={{
            padding: "10px 22px",
            border: "1px solid rgba(255,45,120,0.6)",
            background: "rgba(255,45,120,0.08)",
            color: "var(--acc)",
            fontSize: 16,
            fontWeight: 600,
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            opacity: hint ? 1 : 0,
            transition: "opacity 800ms ease-in",
            textShadow: "0 0 10px rgba(255,45,120,0.6)",
            boxShadow: "0 0 18px rgba(255,45,120,0.3)",
          }}
        >
          ▶ press any key or click to unlock ◀
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "repeating-linear-gradient(to bottom, transparent 0, transparent 3px, rgba(0,0,0,0.12) 4px)",
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Context menu
// ---------------------------------------------------------------------------

type CtxAction = "reload" | "arrange" | "cmatrix" | "fastfetch" | "sysinfo" | "lock";

interface CtxItem {
  l?: string;
  k?: string;
  a?: CtxAction;
  sep?: boolean;
}
const CTX_ITEMS: CtxItem[] = [
  { l: "RELOAD DESKTOP", k: "⌘R", a: "reload" },
  { l: "ARRANGE WINDOWS", k: "⌘A", a: "arrange" },
  { l: "CMATRIX", k: "⌘M", a: "cmatrix" },
  { l: "FASTFETCH", k: "⌘F", a: "fastfetch" },
  { sep: true },
  { l: "SYSTEM INFO", k: "⌘I", a: "sysinfo" },
  { l: "LOCK SCREEN", k: "⌘L", a: "lock" },
];

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onAction: (a: CtxAction) => void;
}
function ContextMenu({ x, y, onClose, onAction }: ContextMenuProps) {
  useEffect(() => {
    const h = () => onClose();
    const id = window.setTimeout(() => window.addEventListener("click", h), 0);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("click", h);
    };
  }, [onClose]);
  return (
    <div className="ctx-menu" style={{ left: x, top: y }}>
      {CTX_ITEMS.map((it, i) =>
        it.sep ? (
          <div key={i} className="sep" />
        ) : (
          <div
            key={i}
            className="item"
            onClick={(e) => {
              e.stopPropagation();
              if (it.a) onAction(it.a);
              onClose();
            }}
          >
            <span>{it.l}</span>
            {it.k && <span className="shortcut">{it.k}</span>}
          </div>
        ),
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// HiFiHero — the desktop shell
// ---------------------------------------------------------------------------

function HiFiHero({ onLock }: { onLock: () => void }) {
  const [wins, setWins] = useState<Win[]>(INITIAL_WINS);
  const [focused, setFocused] = useState<WinId>("whoami");
  const [ctx, setCtx] = useState<{ x: number; y: number } | null>(null);
  const [zTop, setZTop] = useState(10);
  const [textSize, setTextSize] = useState<TextSize>("md");
  const [bootKey, setBootKey] = useState(0);
  const fsMap: Record<TextSize, number> = { sm: 14, md: 18, lg: 22 };

  useEffect(() => {
    // Must set on .duru-root (not documentElement) — the root rule in
    // duruos.css re-declares --win-fs/-sm locally, so any value set further
    // up the tree gets shadowed.
    const root = document.querySelector<HTMLElement>(".duru-root");
    if (!root) return;
    const fs = fsMap[textSize];
    root.style.setProperty("--win-fs", `${fs}px`);
    root.style.setProperty("--win-fs-sm", `${fs - 2}px`);
  }, [textSize]);

  // Boot choreography: pop open all → hold → close all except whoami.
  // Re-runs whenever bootKey changes (RELOAD DESKTOP bumps it).
  useEffect(() => {
    // Reset to initial geometry + closed state so the sequence replays cleanly.
    setWins(INITIAL_WINS);
    setFocused("whoami");
    const openOrder: WinId[] = ["whoami", "edu", "exp", "contact", "hobbies"];
    const closeOrder: WinId[] = ["hobbies", "contact", "exp", "edu"];
    const OPEN_GAP = 200;
    const HOLD = 200;
    const CLOSE_GAP = 180;
    const timers: number[] = [];
    // Boot-choreography open/close cues sit at half the interactive
    // volume so the sequence reads as ambient polish, not user action.
    openOrder.forEach((id, i) => {
      const t = window.setTimeout(() => {
        if (id !== "whoami") playSfx(SFX.windowOpen, 0.275);
        setWins((ws) => ws.map((w) => (w.id === id ? { ...w, open: true, state: "opening", z: 10 + i } : w)));
        const t2 = window.setTimeout(() => {
          setWins((ws) => ws.map((w) => (w.id === id ? { ...w, state: "idle" } : w)));
        }, 450);
        timers.push(t2);
      }, i * OPEN_GAP);
      timers.push(t);
    });
    const holdStart = openOrder.length * OPEN_GAP + HOLD;
    closeOrder.forEach((id, i) => {
      const t = window.setTimeout(() => {
        if (id !== "whoami") playSfx(SFX.windowClose, 0.275);
        setWins((ws) => ws.map((w) => (w.id === id ? { ...w, state: "closing" } : w)));
        const t2 = window.setTimeout(() => {
          setWins((ws) => ws.map((w) => (w.id === id ? { ...w, open: false, state: "idle" } : w)));
        }, 350);
        timers.push(t2);
      }, holdStart + i * CLOSE_GAP);
      timers.push(t);
    });
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [bootKey]);

  const focus = useCallback(
    (id: WinId) => {
      setFocused(id);
      setWins((w) => w.map((x) => (x.id === id ? { ...x, z: zTop + 1 } : x)));
      setZTop((z) => z + 1);
    },
    [zTop],
  );

  const close = useCallback((id: WinId) => {
    playSfx(SFX.windowClose, 0.55);
    setWins((w) => w.map((x) => (x.id === id ? { ...x, state: "closing" } : x)));
    window.setTimeout(() => {
      setWins((w) => w.map((x) => (x.id === id ? { ...x, open: false, state: "idle" } : x)));
    }, 320);
  }, []);

  const minimize = useCallback((id: WinId) => {
    playSfx(SFX.windowClose, 0.55);
    setWins((w) => w.map((x) => (x.id === id ? { ...x, state: "minimizing" } : x)));
    window.setTimeout(() => {
      setWins((w) => w.map((x) => (x.id === id ? { ...x, open: false, state: "idle" } : x)));
    }, 360);
  }, []);

  const maximize = useCallback((id: WinId) => {
    const TOP = 60;
    const BOT = 32;
    const PAD = 14;
    const rail = 14 + 180 + 8; // icon rail left + width + gutter
    const maxGeom = {
      x: rail,
      y: TOP + PAD,
      w: DESIGN_W - rail - PAD,
      h: DESIGN_H - TOP - BOT - PAD * 2,
    };
    setWins((ws) =>
      ws.map((x) => {
        if (x.id !== id) return x;
        // Toggle: if already maximized, restore saved geom; else stash current
        // geom in `prev` and apply max.
        if (x.prev) {
          const { x: px, y: py, w: pw, h: ph } = x.prev;
          return { ...x, x: px, y: py, w: pw, h: ph, prev: undefined };
        }
        return {
          ...x,
          prev: { x: x.x, y: x.y, w: x.w, h: x.h },
          ...maxGeom,
        };
      }),
    );
  }, []);

  const open = useCallback(
    (id: WinId) => {
      playSfx(SFX.windowOpen, 0.55);
      setWins((w) => w.map((x) => (x.id === id ? { ...x, open: true, z: zTop + 1, state: "opening" } : x)));
      setZTop((z) => z + 1);
      setFocused(id);
      window.setTimeout(() => {
        setWins((w) => w.map((x) => (x.id === id ? { ...x, state: "idle" } : x)));
      }, 400);
    },
    [zTop],
  );

  const toggle = useCallback(
    (id: WinId) => {
      const w = wins.find((x) => x.id === id);
      if (!w) return;
      if (w.open) close(id);
      else open(id);
    },
    [wins, close, open],
  );

  const updateGeom = useCallback(
    (id: WinId, geom: { x: number; y: number; w: number; h: number }) => {
      // Clearing prev: once the user moves or resizes, the stashed restore
      // geometry is no longer what they'd expect on the next maximize click.
      setWins((w) => w.map((x) => (x.id === id ? { ...x, ...geom, prev: undefined } : x)));
    },
    [],
  );

  const onDesktopCtx = (e: ReactMouseEvent) => {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const scale = getScale();
    setCtx({ x: (e.clientX - rect.left) / scale, y: (e.clientY - rect.top) / scale });
  };

  const doCtxAction = (a: CtxAction) => {
    if (a === "lock") {
      onLock();
      return;
    }
    if (a === "fastfetch") {
      toggle("neo");
      return;
    }
    if (a === "cmatrix") {
      toggle("cmatrix");
      return;
    }
    if (a === "reload") {
      setBootKey((k) => k + 1);
      return;
    }
    if (a === "sysinfo") {
      // No dedicated sysinfo window — open the fastfetch panel since it IS
      // the system info (OS, kernel, shell, CPU/RAM, uptime).
      const w = wins.find((x) => x.id === "neo");
      if (w && !w.open) open("neo");
      else if (w) focus("neo");
      return;
    }
    if (a === "arrange") {
      const openWins = wins.filter((w) => w.open);
      const n = openWins.length;
      if (n === 0) return;
      const TOP = 60;
      const BOT = 32;
      const PAD = 10;
      const inner = {
        x: PAD,
        y: TOP + PAD,
        w: DESIGN_W - PAD * 2,
        h: DESIGN_H - TOP - BOT - PAD * 2,
      };
      const getTiles = () => {
        if (n === 1) return [inner];
        if (n === 2) {
          return [
            { x: inner.x, y: inner.y, w: inner.w / 2 - PAD / 2, h: inner.h },
            { x: inner.x + inner.w / 2 + PAD / 2, y: inner.y, w: inner.w / 2 - PAD / 2, h: inner.h },
          ];
        }
        if (n === 3) {
          return [
            { x: inner.x, y: inner.y, w: inner.w / 2 - PAD / 2, h: inner.h },
            { x: inner.x + inner.w / 2 + PAD / 2, y: inner.y, w: inner.w / 2 - PAD / 2, h: inner.h / 2 - PAD / 2 },
            {
              x: inner.x + inner.w / 2 + PAD / 2,
              y: inner.y + inner.h / 2 + PAD / 2,
              w: inner.w / 2 - PAD / 2,
              h: inner.h / 2 - PAD / 2,
            },
          ];
        }
        if (n === 4) {
          return [
            { x: inner.x, y: inner.y, w: inner.w / 2 - PAD / 2, h: inner.h / 2 - PAD / 2 },
            { x: inner.x + inner.w / 2 + PAD / 2, y: inner.y, w: inner.w / 2 - PAD / 2, h: inner.h / 2 - PAD / 2 },
            { x: inner.x, y: inner.y + inner.h / 2 + PAD / 2, w: inner.w / 2 - PAD / 2, h: inner.h / 2 - PAD / 2 },
            {
              x: inner.x + inner.w / 2 + PAD / 2,
              y: inner.y + inner.h / 2 + PAD / 2,
              w: inner.w / 2 - PAD / 2,
              h: inner.h / 2 - PAD / 2,
            },
          ];
        }
        const cols = Math.ceil(Math.sqrt(n));
        const rows = Math.ceil(n / cols);
        const cellW = (inner.w - PAD * (cols - 1)) / cols;
        const cellH = (inner.h - PAD * (rows - 1)) / rows;
        return Array.from({ length: n }, (_, i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          return {
            x: inner.x + col * (cellW + PAD),
            y: inner.y + row * (cellH + PAD),
            w: cellW,
            h: cellH,
          };
        });
      };
      const tiles = getTiles();
      setWins((ws) =>
        ws.map((w) => {
          const i = openWins.findIndex((o) => o.id === w.id);
          if (i < 0 || !tiles[i]) return w;
          return { ...w, ...tiles[i] };
        }),
      );
    }
  };

  const bodies: Record<WinId, ReactNode> = {
    whoami: <WhoamiBody />,
    edu: <EducationBody />,
    exp: <ExperienceBody />,
    contact: <ContactBody />,
    neo: <NeofetchBody />,
    hobbies: <HobbiesBody />,
    cmatrix: <CMatrix />,
  };

  const icons: { id: WinId; icon: IconName; label: string }[] = [
    { id: "whoami", icon: "user", label: "whoami.exe" },
    { id: "edu", icon: "book", label: "education.log" },
    { id: "exp", icon: "db", label: "experience.db" },
    { id: "hobbies", icon: "guitar", label: "hobbies.sys" },
    { id: "contact", icon: "wave", label: "contact.sh" },
  ];

  return (
    <div
      style={{ position: "absolute", inset: 0, overflow: "hidden" }}
      className="crt-flicker"
      onContextMenu={onDesktopCtx}
    >
      <DesktopBackground />
      <Topbar textSize={textSize} onTextSize={setTextSize} />

      <div style={{ position: "absolute", left: 14, top: 72, display: "flex", flexDirection: "column", gap: 22 }}>
        {icons.map((ic) => (
          <div key={ic.id} style={{ height: 156 }}>
            <DesktopIcon
              icon={ic.icon}
              label={ic.label}
              onOpen={() => {
                const w = wins.find((x) => x.id === ic.id);
                if (!w) return;
                if (!w.open) open(ic.id);
                else focus(ic.id);
              }}
            />
          </div>
        ))}
      </div>

      {wins
        .filter((w) => w.open)
        .map((w) => (
          <Window
            key={w.id}
            title={w.title}
            x={w.x}
            y={w.y}
            w={w.w}
            h={w.h}
            z={w.z}
            focused={focused === w.id}
            state={w.state}
            dot={w.dot}
            noPad={w.id === "cmatrix"}
            onFocus={() => focus(w.id)}
            onClose={() => close(w.id)}
            onMinimize={() => minimize(w.id)}
            onMaximize={() => maximize(w.id)}
            onGeom={(g) => updateGeom(w.id, g)}
          >
            {bodies[w.id]}
          </Window>
        ))}

      {ctx && (
        <ContextMenu x={ctx.x} y={ctx.y} onClose={() => setCtx(null)} onAction={doCtxAction} />
      )}

      <Ticker />

      <div
        className="crt-scanlines"
        style={{ ["--scanline-opacity" as unknown as string]: 0.6 } as CSSProperties}
      />
      <div className="crt-noise" />
      <div className="crt-vignette" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Scale fitter
// ---------------------------------------------------------------------------

function useFitScale(
  hostRef: RefObject<HTMLDivElement | null>,
  scaleDivRef: RefObject<HTMLDivElement | null>,
) {
  useEffect(() => {
    const host = hostRef.current;
    const scale = scaleDivRef.current;
    if (!host || !scale) return;
    const fit = () => {
      // Use offsetWidth/offsetHeight — native CSS layout size, unaffected by
      // drei's matrix3d on the outer <Html transform>. getBoundingClientRect()
      // returns the post-3D screen rect, which breaks the scale math.
      const w = host.offsetWidth;
      const h = host.offsetHeight;
      if (w === 0 || h === 0) return;
      const s = Math.min(w / DESIGN_W, h / DESIGN_H);
      // Use CSS `zoom` instead of `transform: scale` so children lay out at
      // the final pixel size. `transform: scale` rasterizes the subtree at
      // design size then bitmap-upscales → blurry text. `zoom` triggers a
      // reflow so glyphs rasterize at real pixel size.
      scale.style.zoom = String(s);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(host);
    window.addEventListener("resize", fit);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", fit);
    };
  }, [hostRef, scaleDivRef]);
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function SwanOS() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const scaleDivRef = useRef<HTMLDivElement | null>(null);
  useFitScale(hostRef, scaleDivRef);

  const [booted, setBooted] = useState(false);
  const [locked, setLocked] = useState(true);
  const [loginKey, setLoginKey] = useState(0);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") tweenCameraToZone("room");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div ref={hostRef} className="duru-root">
      <div ref={scaleDivRef} className="duru-scale">
        {booted && !locked && (
          <HiFiHero key={loginKey} onLock={() => setLocked(true)} />
        )}
        {!booted && (
          <BootSequence
            onDone={() => {
              stopLoadingSfx();
              setBooted(true);
            }}
          />
        )}
        {locked && (
          // Mount lock screen whenever locked — boot overlay covers it at
          // z 99999 vs lock's 99997. When boot unmounts, lock is already
          // rendered, eliminating the one-frame desktop flash. `ready={booted}`
          // keeps unlock triggers inert until boot finishes.
          <LockScreen
            ready={booted}
            onUnlock={() => {
              playSfx(SFX.login, 0.7);
              setLocked(false);
              setLoginKey((k) => k + 1);
            }}
          />
        )}
      </div>
    </div>
  );
}
