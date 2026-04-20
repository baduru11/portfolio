"use client";

import { Suspense, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { AgXToneMapping } from "three";
import {
  AdaptiveDpr,
  AdaptiveEvents,
  Environment,
  ContactShadows,
} from "@react-three/drei";
import { Room } from "@/scene/Room";
import { CameraRig } from "@/scene/CameraRig";
import { PostFX } from "@/scene/PostFX";
import { ZoneMarkers } from "@/scene/ZoneMarkers";
import { TurntableControls } from "@/overlays/Turntable/TurntableControls";
import { useSceneStore } from "@/scene/useSceneStore";
import { useMusicPlayer } from "@/lib/useSfx";
import { MasterMute } from "@/overlays/_shared/MasterMute";
import { NowPlayingToast } from "@/overlays/_shared/NowPlayingToast";
import { BackButton } from "@/overlays/_shared/BackButton";

// Streaming kernel-style boot splash shown while the GLB/Canvas is loading.
// Unmounts automatically when Suspense resolves.
interface BootLine {
  t: string;
  c: string;
}
const BOOT_LINES: BootLine[] = [
  { t: "[ 0.000000] portfolio bootloader v1.0", c: "#ff2d78" },
  { t: "[ 0.018441] Mounting WebGL2 context...       [ OK ]", c: "#e8e4f0" },
  { t: "[ 0.042319] Loading /public/portfolio_room.glb (21.5 MB)", c: "#e8e4f0" },
  { t: "[ 0.089173] Decoding Draco meshes...         [ OK ]", c: "#e8e4f0" },
  { t: "[ 0.152004] Streaming texture atlas...       [ OK ]", c: "#e8e4f0" },
  { t: "[ 0.214881] Warming up three.js scene graph...", c: "#e8e4f0" },
  { t: "[ 0.281217] Attaching camera rig             [ OK ]", c: "#e8e4f0" },
  { t: "[ 0.344002] Compiling shaders...             [ OK ]", c: "#e8e4f0" },
  { t: "[ 0.401778] Loading HDR environment map...   [ OK ]", c: "#e8e4f0" },
  { t: "[ 0.452091] Initializing post-fx composer... [ OK ]", c: "#e8e4f0" },
  { t: "[ 0.508332] Hydrating scene store            [ OK ]", c: "#e8e4f0" },
  { t: "[ 0.571994] WARN: reduced motion preference not detected", c: "#ffaa3a" },
  { t: "[ 0.629017] All systems nominal.", c: "#6dff8a" },
  { t: "", c: "#e8e4f0" },
  { t: "> launching seungwan_kang // portfolio ...", c: "#ff2d78" },
];

function LoadingFallback() {
  const [shown, setShown] = useState(0);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    if (shown >= BOOT_LINES.length) return;
    const id = window.setTimeout(() => setShown((s) => s + 1), 80 + Math.random() * 90);
    return () => window.clearTimeout(id);
  }, [shown]);
  // Progress creeps 0→94% then holds. Final 6% only fills when Suspense
  // actually resolves (component unmounts), so a stalled bar signals a hang.
  useEffect(() => {
    const id = window.setInterval(() => {
      setProgress((p) => (p >= 94 ? 94 : p + (94 - p) * 0.08));
    }, 50);
    return () => window.clearInterval(id);
  }, []);
  return (
    <div className="duru-preboot">
      <div className="pre-header">
        <span className="pre-accent">SEUNGWAN_KANG</span>
        <span className="pre-dim"> // PORTFOLIO // 2026</span>
      </div>
      <div className="pre-log">
        {BOOT_LINES.slice(0, shown).map((l, i) => (
          <div key={i} style={{ color: l.c }} className="pre-line">
            {l.t || "\u00A0"}
          </div>
        ))}
        {shown < BOOT_LINES.length && (
          <div className="pre-line">
            <span className="pre-cursor">█</span>
          </div>
        )}
      </div>
      <div className="pre-progress-wrap">
        <div className="pre-progress-label">
          <span>LOADING</span>
          <span>{Math.floor(progress)}%</span>
        </div>
        <div className="pre-progress-track">
          <div className="pre-progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>
      <div className="pre-scanlines" aria-hidden />
      <div className="pre-vignette" aria-hidden />
      <style jsx>{`
        .duru-preboot {
          position: absolute;
          inset: 0;
          background: #05040a;
          color: #e8e4f0;
          font-family: ui-monospace, "JetBrains Mono", "IBM Plex Mono", monospace;
          font-size: 13px;
          padding: 40px 60px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .pre-header {
          font-size: 14px;
          letter-spacing: 0.32em;
          text-transform: uppercase;
          border-bottom: 1px solid #3a3050;
          padding-bottom: 16px;
        }
        .pre-accent {
          color: #ff2d78;
          text-shadow: 0 0 8px rgba(255, 45, 120, 0.5);
          font-weight: 600;
        }
        .pre-dim { color: #7a6d92; }
        .pre-log {
          flex: 1;
          line-height: 1.7;
          overflow: hidden;
        }
        .pre-line { white-space: pre; animation: pre-line-in 200ms ease-out; }
        @keyframes pre-line-in {
          from { opacity: 0; transform: translateX(-4px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .pre-cursor {
          color: #ff2d78;
          animation: pre-blink 1s step-end infinite;
        }
        @keyframes pre-blink {
          50% { opacity: 0; }
        }
        .pre-progress-wrap {
          margin-top: auto;
          border-top: 1px solid #3a3050;
          padding-top: 14px;
        }
        .pre-progress-label {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          letter-spacing: 0.3em;
          color: #7a6d92;
          margin-bottom: 8px;
          font-variant-numeric: tabular-nums;
        }
        .pre-progress-track {
          height: 6px;
          background: #1a0f2e;
          position: relative;
          overflow: hidden;
        }
        .pre-progress-fill {
          position: absolute;
          top: 0; bottom: 0; left: 0;
          background: linear-gradient(90deg, #ff2d78, #ffaa3a);
          box-shadow: 0 0 12px rgba(255, 45, 120, 0.6);
          transition: width 80ms linear;
        }
        .pre-progress-fill::after {
          content: "";
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(
            90deg,
            rgba(255, 255, 255, 0.18) 0 4px,
            transparent 4px 8px
          );
          animation: pre-chevron 600ms linear infinite;
        }
        @keyframes pre-chevron {
          from { transform: translateX(0); }
          to { transform: translateX(8px); }
        }
        .pre-scanlines {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: repeating-linear-gradient(
            to bottom,
            rgba(0, 0, 0, 0) 0,
            rgba(0, 0, 0, 0) 2px,
            rgba(0, 0, 0, 0.22) 3px,
            rgba(0, 0, 0, 0) 4px
          );
          mix-blend-mode: multiply;
          opacity: 0.7;
        }
        .pre-vignette {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: radial-gradient(
            ellipse at center,
            transparent 60%,
            rgba(0, 0, 0, 0.55) 100%
          );
        }
      `}</style>
    </div>
  );
}

function EntryGate({ onEnter }: { onEnter: () => void }) {
  useEffect(() => {
    const handler = () => onEnter();
    window.addEventListener("keydown", handler, { once: true });
    window.addEventListener("pointerdown", handler, { once: true });
    return () => {
      window.removeEventListener("keydown", handler);
      window.removeEventListener("pointerdown", handler);
    };
  }, [onEnter]);

  return (
    <div className="entry-gate" role="button" tabIndex={0}>
      <div className="entry-vignette" aria-hidden />
      <div className="entry-inner">
        <div className="entry-header">
          <span className="entry-accent">SEUNGWAN_KANG</span>
          <span className="entry-dim"> // PORTFOLIO // 2026</span>
        </div>
        <div className="entry-cta">
          <span className="entry-glyph">▸</span>
          <span className="entry-label">PRESS ANY KEY</span>
          <span className="entry-sep">·</span>
          <span className="entry-label">CLICK ANYWHERE</span>
        </div>
        <div className="entry-hint">to enter the room</div>
      </div>
      <div className="entry-scanlines" aria-hidden />
      <style jsx>{`
        .entry-gate {
          position: absolute;
          inset: 0;
          background: radial-gradient(
              ellipse at 50% 38%,
              rgba(255, 45, 120, 0.18) 0%,
              rgba(20, 8, 30, 0) 55%
            ),
            #05040a;
          color: #e8e4f0;
          font-family: ui-monospace, "JetBrains Mono", "IBM Plex Mono", monospace;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          user-select: none;
          overflow: hidden;
        }
        .entry-inner {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 28px;
          text-align: center;
          animation: entry-fadein 600ms ease-out both;
        }
        .entry-header {
          font-size: 14px;
          letter-spacing: 0.38em;
          text-transform: uppercase;
        }
        .entry-accent {
          color: #ff2d78;
          text-shadow: 0 0 10px rgba(255, 45, 120, 0.55);
          font-weight: 600;
        }
        .entry-dim { color: #7a6d92; }
        .entry-cta {
          display: flex;
          align-items: baseline;
          gap: 12px;
          font-size: 22px;
          letter-spacing: 0.3em;
          color: #ffd6e7;
          text-shadow: 0 0 8px rgba(255, 45, 120, 0.5);
          animation: entry-pulse 1.8s ease-in-out infinite;
        }
        .entry-glyph {
          color: #ff2d78;
          animation: entry-glyph 1.2s steps(2, end) infinite;
        }
        .entry-sep { color: #5a4a70; }
        .entry-label { white-space: nowrap; }
        .entry-hint {
          font-size: 11px;
          letter-spacing: 0.4em;
          color: #7a6d92;
          text-transform: uppercase;
        }
        .entry-scanlines {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: repeating-linear-gradient(
            to bottom,
            rgba(0, 0, 0, 0) 0,
            rgba(0, 0, 0, 0) 2px,
            rgba(0, 0, 0, 0.22) 3px,
            rgba(0, 0, 0, 0) 4px
          );
          mix-blend-mode: multiply;
          opacity: 0.55;
        }
        .entry-vignette {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: radial-gradient(
            ellipse at center,
            transparent 55%,
            rgba(0, 0, 0, 0.65) 100%
          );
        }
        @keyframes entry-fadein {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes entry-pulse {
          0%, 100% { opacity: 0.7; }
          50%      { opacity: 1; }
        }
        @keyframes entry-glyph {
          0%, 60% { opacity: 1; }
          61%, 100% { opacity: 0.2; }
        }
      `}</style>
    </div>
  );
}

// Minimum wall-clock time the LoadingFallback stays on screen, even
// when the GLB is cache-hot and the Canvas mounts instantly. Long
// enough for most of the BOOT_LINES animation + progress bar to land.
const MIN_LOADING_MS = 2800;

export default function Scene() {
  const zone = useSceneStore((s) => s.zone);
  const setPlaying = useSceneStore((s) => s.setPlaying);
  // Gate order: LoadingFallback → EntryGate → live scene. The fallback
  // is rendered explicitly (not as a Suspense fallback) so we can
  // enforce a minimum display time; Suspense's fallback unmounts the
  // instant children resolve, which makes cached GLBs skip the splash.
  const [canvasMounted, setCanvasMounted] = useState(false);
  const [minElapsed, setMinElapsed] = useState(false);
  const [entered, setEntered] = useState(false);
  const loadingDone = canvasMounted && minElapsed;
  // Music engine — mounts once and listens to audio + scene stores.
  useMusicPlayer();

  useEffect(() => {
    const id = window.setTimeout(() => setMinElapsed(true), MIN_LOADING_MS);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <div className="relative w-full h-full">
      <Suspense fallback={null}>
        <Canvas
          dpr={[1, 1.5]}
          gl={{
            antialias: true,
            toneMapping: AgXToneMapping,
            toneMappingExposure: 0.5,
            powerPreference: "high-performance",
          }}
          onCreated={(state) => {
            setCanvasMounted(true);
            if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
              (window as unknown as { __r3fState?: unknown }).__r3fState = state;
              const { gl } = state;
              // Diagnostic dump for the postfx black-frame bisect.
              // eslint-disable-next-line no-console
              console.log("[PostFX diag]", {
                outputColorSpace: gl.outputColorSpace,
                toneMapping: gl.toneMapping,
                toneMappingExposure: gl.toneMappingExposure,
                isWebGL2: gl.capabilities.isWebGL2,
                precision: gl.capabilities.precision,
                maxTextures: gl.capabilities.maxTextures,
                maxSamples: gl.capabilities.maxSamples,
              });
            }
          }}
        >
          {/* GLB point lights are permanently disabled in Room.tsx
              (they broke the EffectComposer and are baked into walls
              already). These manual lights provide fill for the
              non-baked props (speakers, amp, guitar, Quad Cortex, etc.). */}
          {/* Runtime lights are ALL disabled because they black-frame the
              EffectComposer (bug in @react-three/postprocessing 3.0.4).
              Fill comes from ambientLight + Environment IBL only. */}
          <ambientLight intensity={1.1} color="#7a5a9a" />
          <Environment preset="night" background={false} environmentIntensity={0.85} />
          <Room />
          <ContactShadows
            position={[0, 0.005, 0]}
            opacity={0.85}
            scale={7}
            blur={1.8}
            far={1.2}
            resolution={1024}
            color="#000000"
          />
          <ContactShadows
            position={[0, 0.76, 0.9]}
            opacity={0.6}
            scale={3.5}
            blur={1.4}
            far={0.6}
            resolution={1024}
            color="#0a0610"
          />
          <CameraRig />
          <ZoneMarkers />
          <PostFX />
          {/* Adaptive quality — drops DPR during camera tweens/drags so
              interactions stay snappy, then restores full resolution when
              idle. Paired with AdaptiveEvents which pauses raycasting during
              movement. Zero visual compromise at rest. */}
          <AdaptiveDpr pixelated />
          <AdaptiveEvents />
        </Canvas>
      </Suspense>

      {/* Monitor / Laptop / Arcade overlays are rendered INSIDE the Canvas
          (on their respective 3D screen surfaces) — see Room.tsx.
          Only the turntable uses a fullscreen side-panel overlay. */}
      {zone === "turntable" && <TurntableControls />}
      {!loadingDone && <LoadingFallback />}
      {loadingDone && !entered && (
        <EntryGate
          onEnter={() => {
            setEntered(true);
            // User gesture — AudioContext is now free to run.
            setPlaying(true);
          }}
        />
      )}
      <MasterMute />
      <NowPlayingToast />
      {zone !== "room" && <BackButton />}
    </div>
  );
}
