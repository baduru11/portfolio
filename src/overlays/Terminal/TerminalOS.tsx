"use client";

import "./terminal.css";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { tweenCameraToZone } from "@/effects/transitions";
import { useSceneStore } from "@/scene/useSceneStore";
import { SFX, playSfx, stopLoadingSfx } from "@/lib/useSfx";
import { Topbar } from "./layout/Topbar";
import { MainArea } from "./layout/MainArea";
import { InputBar } from "./layout/InputBar";
import { CommandPalette } from "./widgets/CommandPalette";
import { ProjectModal } from "./widgets/ProjectModal";
import { HomeScreen } from "./screens/HomeScreen";
import { ProjectsScreen } from "./screens/ProjectsScreen";
import { SkillsScreen } from "./screens/SkillsScreen";
import { LabScreen } from "./screens/LabScreen";
import { WhoamiScreen } from "./screens/WhoamiScreen";
import { ContactScreen } from "./screens/ContactScreen";
import { HelpScreen } from "./screens/HelpScreen";
import { Breakout } from "./games/Breakout";
import { Pong } from "./games/Pong";
import { HackSequence } from "./easter/HackSequence";
import { MatrixRain } from "./easter/MatrixRain";
import { KernelPanic } from "./easter/KernelPanic";
import { useKonamiCode } from "./easter/useKonamiCode";
import {
  useTerminalState,
  nextEntryId,
  type Route,
} from "./hooks/useTerminalState";
import {
  COMMANDS,
  commandCompletions,
  parseInput,
  type CommandDef,
} from "./data/commands";

const DESIGN_W = 1280;
const DESIGN_H = 740;

function viewForRoute(route: Route, key: string): React.ReactNode {
  switch (route.kind) {
    case "home":
      return <HomeScreen />;
    case "projects":
      return <ProjectsScreen key={key} />;
    case "project":
      // Detail is a modal overlay (rendered at TerminalOS level), not an
      // output block. The projects list output below stays untouched.
      return null;
    case "skills":
      return <SkillsScreen key={key} />;
    case "lab":
      return <LabScreen key={key} />;
    case "whoami":
      return <WhoamiScreen key={key} />;
    case "contact":
      return <ContactScreen key={key} />;
    case "help":
      return <HelpScreen key={key} />;
    case "game":
      return route.id === "breakout" ? <Breakout /> : <Pong />;
    case "hack":
      return <HackSequence target={route.target} />;
    case "matrix":
      return null;
    case "panic":
      return null;
    case "konami":
      return null;
  }
}

function commandLabel(cmd: CommandDef): string {
  return cmd.alias.split(" · ")[0];
}

export function TerminalOS() {
  const zone = useSceneStore((s) => s.zone);
  const active = zone === "laptop";

  const route = useTerminalState((s) => s.route);
  const setRoute = useTerminalState((s) => s.setRoute);
  const pushOutput = useTerminalState((s) => s.pushOutput);
  const clearOutput = useTerminalState((s) => s.clearOutput);
  const paletteOpen = useTerminalState((s) => s.paletteOpen);
  const setPalette = useTerminalState((s) => s.setPalette);
  const konamiUnlocked = useTerminalState((s) => s.konamiUnlocked);
  const unlockKonami = useTerminalState((s) => s.unlockKonami);

  // Start at "done" — TerminalOS mounts on page load (before the user has
  // entered the laptop zone). The boot animation is triggered when `active`
  // becomes true (see effect below).
  const [boot, setBoot] = useState<"crt" | "post" | "done">("done");
  // 1.5 = 1920/1280 = 1110/740 — exact ratio for the laptop DOM mounted by
  // ScreenHtml. We render the design at 1.5× to supersample (the DOM is
  // bigger than the design, then drei scales it back down to the world
  // screen quad → crisper text).
  const [scale, setScale] = useState(1.5);
  const [konamiBurst, setKonamiBurst] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);

  // Reset session state on every mount.
  // The Terminal store is module-scoped (zustand), so it survives between
  // visits. Without this, re-entering the laptop zone would keep the prior
  // session's output on screen and stack a new home seed on top of it.
  // Runs synchronously before paint to avoid a one-frame flash of stale UI.
  // Initial seed (runs once at mount on page load — terminal isn't visible yet).
  useLayoutEffect(() => {
    clearOutput();
    setRoute({ kind: "home" });
    setPalette(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Trigger boot animation each time the user enters the laptop zone.
  // Reset to a clean home + replay the POST log.
  useEffect(() => {
    if (!active) return;
    clearOutput();
    setRoute({ kind: "home" });
    setPalette(false);
    setBoot("post");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // Live CSS scale to fit the laptop screen DOM (provided by ScreenHtml in Room.tsx).
  // We use offsetWidth/offsetHeight (layout box, intrinsic) instead of
  // getBoundingClientRect (which is affected by drei's 3D transform on the
  // <Html> wrapper and would yield a tiny projected size mid-tween).
  useLayoutEffect(() => {
    const measure = () => {
      const parent = stageRef.current?.parentElement;
      if (!parent) return;
      const w = parent.offsetWidth || parent.clientWidth;
      const h = parent.offsetHeight || parent.clientHeight;
      if (!w || !h) return;
      const s = Math.min(w / DESIGN_W, h / DESIGN_H);
      // Guard against degenerate values in case offsetWidth is also briefly 0.
      if (s < 0.05) return;
      setScale(s);
    };
    measure();
    const raf = requestAnimationFrame(measure);
    const ro = new ResizeObserver(measure);
    if (stageRef.current?.parentElement) ro.observe(stageRef.current.parentElement);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  // ESC bubbles to room exit unless palette eats it.
  useEffect(() => {
    if (!active) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (paletteOpen) return;
      if (route.kind === "project") return;
      tweenCameraToZone("room");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [active, paletteOpen, route.kind]);

  // TerminalOS stays mounted across zone changes (see ScreenHtml keepMounted).
  // When the user leaves the laptop zone, exit any cinematic / transient route
  // so its requestAnimationFrame loops and timers stop. Persistent routes
  // (home, projects, skills, lab, whoami, help, game) are preserved so the
  // user returns to where they were.
  useEffect(() => {
    if (active) return;
    setPalette(false);
    setKonamiBurst(false);
    if (
      route.kind === "matrix" ||
      route.kind === "panic" ||
      route.kind === "hack" ||
      route.kind === "konami"
    ) {
      setRoute({ kind: "home" });
    }
  }, [active, route.kind, setPalette, setRoute]);

  // Cmd/Ctrl-K opens palette.
  useEffect(() => {
    if (!active) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [active, setPalette]);

  // Konami unlock + brief overlay.
  const onKonami = useCallback(() => {
    unlockKonami();
    setKonamiBurst(true);
    setRoute({ kind: "konami" });
    window.setTimeout(() => setKonamiBurst(false), 2400);
  }, [setRoute, unlockKonami]);
  useKonamiCode(active, onKonami);

  const completions = useMemo(() => commandCompletions(), []);

  const dispatch = useCallback(
    (raw: string) => {
      const parsed = parseInput(raw);
      if (!parsed) return;
      playSfx(SFX.terminalCmd, 0.5);
      const cmd = COMMANDS.find((c) => c.id === parsed.id);
      if (!cmd) {
        pushOutput({
          id: nextEntryId(),
          command: raw,
          ts: Date.now(),
          view: (
            <div className="glitch-x" style={{ color: "var(--red)" }}>
              command not found: {parsed.id} — try{" "}
              <span style={{ color: "var(--teal)" }}>help</span>
            </div>
          ),
        });
        return;
      }
      if (cmd.unlock === "konami" && !konamiUnlocked) {
        pushOutput({
          id: nextEntryId(),
          command: raw,
          ts: Date.now(),
          view: (
            <div className="glitch-x" style={{ color: "var(--red)" }}>
              command not found: {parsed.id}
            </div>
          ),
        });
        return;
      }
      const result = cmd.resolve(parsed.args);
      if (!result) {
        pushOutput({
          id: nextEntryId(),
          command: raw,
          ts: Date.now(),
          view: (
            <div className="glitch-x" style={{ color: "var(--red)" }}>
              project not found: {parsed.args.join(" ")}
            </div>
          ),
        });
        return;
      }
      if (cmd.id === "clear") {
        clearOutput();
        return;
      }
      if (result.side === "github") {
        window.open("https://github.com/baduru11", "_blank", "noopener,noreferrer");
        pushOutput({
          id: nextEntryId(),
          command: raw,
          ts: Date.now(),
          view: <div>opening github.com/baduru11 …</div>,
        });
        return;
      }
      if (result.route) {
        setRoute(result.route);
        const view = viewForRoute(result.route, nextEntryId());
        if (view !== null) {
          pushOutput({
            id: nextEntryId(),
            command: raw,
            ts: Date.now(),
            view,
          });
        }
      }
    },
    [clearOutput, konamiUnlocked, pushOutput, setRoute],
  );

  const onNavigate = useCallback(
    (r: Route) => {
      setRoute(r);
      const view = viewForRoute(r, nextEntryId());
      if (view !== null) {
        pushOutput({
          id: nextEntryId(),
          command: r.kind === "project" ? `project ${r.id}` : r.kind,
          ts: Date.now(),
          view,
        });
      }
    },
    [pushOutput, setRoute],
  );

  // Seed home screen as the first output every time the boot completes.
  // Triggered on the "post" → "done" transition so each laptop entry shows a
  // freshly seeded home after the POST log fades.
  const prevBootRef = useRef(boot);
  useEffect(() => {
    if (prevBootRef.current === "post" && boot === "done") {
      // Boot animation done — cut the loading cue so its duration
      // matches the visual loading state, then play the login cue
      // (same "you're in" moment as the SwanOS unlock).
      stopLoadingSfx();
      playSfx(SFX.login, 0.7);
      pushOutput({
        id: nextEntryId(),
        command: "",
        ts: Date.now(),
        view: <HomeScreen />,
      });
    }
    prevBootRef.current = boot;
  }, [boot, pushOutput]);

  const paletteCmds = useMemo(
    () =>
      COMMANDS.filter(
        (c) => !c.hidden || (c.unlock === "konami" && konamiUnlocked),
      ).map((c) => ({
        id: c.id,
        label: c.label,
        alias: commandLabel(c),
        keywords: c.keywords,
        section: c.section,
        icon: c.icon,
      })),
    [konamiUnlocked],
  );

  return (
    <>
      <div className={`duru-term ${konamiBurst ? "konami-invert" : ""}`}>
        <div
          className="duru-term-scale"
          ref={stageRef}
          // Use CSS `zoom` instead of `transform: scale` so children lay out
          // at the final (post-scale) pixel size — browsers rasterize text at
          // the actual rendered dimensions instead of rasterizing at design
          // size then bilinear-upscaling (which is the source of the blur).
          style={{ zoom: scale }}
        >
          <Topbar onNavigate={onNavigate} onOpenPalette={() => setPalette(true)} />
          <MainArea />
          <InputBar onSubmit={dispatch} completions={completions} active={active} />
          <span className="frame-corner-tr" aria-hidden />
          <span className="frame-corner-bl" aria-hidden />

          {/* Inside the scaled stage so the POST-log text benefits from the
              1.5× supersample like the rest of the terminal — otherwise it
              renders at native DOM size and looks blurry. */}
          {boot !== "done" && (
            <BootStage
              phase={boot}
              onPostDone={() => setBoot("done")}
            />
          )}
        </div>

        <div className="ambient-scanlines" />
        <div className="ambient-vignette" />

        {paletteOpen && (
          <CommandPalette
            commands={paletteCmds}
            onSelect={(c) => {
              setPalette(false);
              dispatch(c.alias.split(" ")[0]);
            }}
            onClose={() => setPalette(false)}
          />
        )}

        {route.kind === "project" && (
          <ProjectModal
            projectId={route.id}
            onClose={() => setRoute({ kind: "projects" })}
          />
        )}

        {route.kind === "matrix" && (
          <MatrixRain
            onExit={() => {
              setRoute({ kind: "home" });
            }}
          />
        )}

        {route.kind === "panic" && (
          <KernelPanic
            onExit={() => {
              setRoute({ kind: "home" });
              clearOutput();
              setBoot("crt");
              window.setTimeout(() => setBoot("post"), 620);
              window.setTimeout(() => setBoot("done"), 620 + 700 + 100);
            }}
          />
        )}

        {konamiBurst && (
          <div className="konami-overlay">
            <div className="konami-text">✦ CHEAT CODE ACTIVATED ✦</div>
          </div>
        )}
      </div>
    </>
  );
}

type PostLine =
  | { kind: "ok"; text: string }
  | { kind: "err"; text: string }
  | { kind: "warn"; text: string }
  | { kind: "info"; text: string }
  | { kind: "blank" };

const POST_LINES: PostLine[] = [
  { kind: "info", text: "DURU TERMINAL bootloader v1.0" },
  { kind: "info", text: "probing tty... duru-rt/6.9 detected" },
  { kind: "ok", text: "mounting /dev/duru" },
  { kind: "ok", text: "loading catppuccin-mocha.theme" },
  { kind: "ok", text: "starting input bus" },
  { kind: "warn", text: "WARN: aesthetic.module unstable" },
  { kind: "ok", text: "starting command palette" },
  { kind: "ok", text: "loading user: seungwan@hkust" },
  { kind: "ok", text: "decrypting profile..." },
  { kind: "ok", text: "all systems nominal" },
  { kind: "blank" },
  { kind: "info", text: "> launching DURU TERMINAL v1.0 ..." },
];

const LINE_STAGGER_MS = 130;
const HOLD_AFTER_LAST_MS = 500;
const FADE_MS = 600;

interface BootStageProps {
  phase: "crt" | "post";
  onPostDone: () => void;
}

function BootStage({ phase, onPostDone }: BootStageProps) {
  const [fading, setFading] = useState(false);
  // Pin onPostDone in a ref so the timer effect's deps don't include the
  // unstable callback identity. Otherwise every TerminalOS re-render makes
  // a new arrow → re-runs this effect → cancels the 700ms timer → boot
  // never reaches "done" and the opaque post overlay sits on top of the
  // terminal forever.
  const doneRef = useRef(onPostDone);
  useEffect(() => { doneRef.current = onPostDone; }, [onPostDone]);

  useEffect(() => {
    if (phase !== "post") return;
    const lastLineMs = (POST_LINES.length - 1) * LINE_STAGGER_MS;
    const fadeStartMs = lastLineMs + HOLD_AFTER_LAST_MS;
    const t = window.setTimeout(() => {
      setFading(true);
      window.setTimeout(() => doneRef.current(), FADE_MS);
    }, fadeStartMs);
    return () => window.clearTimeout(t);
  }, [phase]);

  if (phase === "crt") return null;
  return (
    <div className={`boot-stage ${fading ? "fading" : ""}`}>
      {POST_LINES.map((l, i) => (
        <div
          key={i}
          className="boot-line in"
          style={{ animationDelay: `${i * LINE_STAGGER_MS}ms` }}
        >
          {l.kind === "blank" && "\u00A0"}
          {l.kind === "ok" && (
            <>
              <span className="ok">[ ok ]</span> {l.text}
            </>
          )}
          {l.kind === "err" && (
            <>
              <span className="err">[ err ]</span> {l.text}
            </>
          )}
          {l.kind === "warn" && (
            <>
              <span className="warn">[ warn ]</span> {l.text}
            </>
          )}
          {l.kind === "info" && <span className="info">{l.text}</span>}
        </div>
      ))}
    </div>
  );
}
