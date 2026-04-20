"use client";

import { useEffect, useRef, useState } from "react";
import { useAudioStore } from "@/scene/useAudioStore";
import { useSceneStore } from "@/scene/useSceneStore";

/**
 * Floating "now playing" toast rendered beside the MasterMute button.
 * Slides up from below the viewport whenever:
 *   - the track changes (auto-advance on end, or manual deck pick), or
 *   - playback transitions from paused to playing.
 * Holds for a few seconds, then slides back down. Animation handled
 * purely by a `visible` class toggle + CSS `translateY`.
 */

const SHOW_MS = 3200;

export function NowPlayingToast() {
  const track = useAudioStore((s) => s.track);
  const isPlaying = useSceneStore((s) => s.isPlaying);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<number | null>(null);
  const prevTrackRef = useRef<string | null>(null);
  const prevPlayingRef = useRef<boolean>(false);

  useEffect(() => {
    // Surface the toast when either the track changes while playing,
    // or when playback just started. No-op on very first render until
    // music has been kicked off (entry gate + isPlaying becomes true).
    const trackChanged = prevTrackRef.current !== null && prevTrackRef.current !== track;
    const justStarted = !prevPlayingRef.current && isPlaying;
    prevTrackRef.current = track;
    prevPlayingRef.current = isPlaying;

    if (!isPlaying) return;
    if (!trackChanged && !justStarted) return;

    setVisible(true);
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setVisible(false);
      timerRef.current = null;
    }, SHOW_MS);
  }, [track, isPlaying]);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div
      className={["npt-root", visible ? "is-visible" : ""].join(" ")}
      aria-live="polite"
    >
      <span className="npt-eq" aria-hidden>
        <span />
        <span />
        <span />
      </span>
      <span className="npt-label">now playing</span>
      <span className="npt-track">{track}</span>
      <style jsx>{`
        .npt-root {
          position: fixed;
          bottom: 18px;
          right: 64px;
          z-index: 50;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 14px;
          font-family: ui-monospace, "JetBrains Mono", "IBM Plex Mono", monospace;
          font-size: 12px;
          letter-spacing: 0.2em;
          color: #ffd6e7;
          background: rgba(8, 4, 18, 0.78);
          border: 1px solid rgba(236, 72, 153, 0.45);
          border-radius: 999px;
          backdrop-filter: blur(8px);
          transform: translateY(140%);
          opacity: 0;
          pointer-events: none;
          transition:
            transform 520ms cubic-bezier(0.22, 1, 0.36, 1),
            opacity 360ms ease-out;
        }
        .npt-root.is-visible {
          transform: translateY(0);
          opacity: 1;
        }
        .npt-label {
          color: #ec4899;
          text-transform: uppercase;
          font-weight: 600;
        }
        .npt-track {
          color: #ffe5ef;
          letter-spacing: 0.28em;
        }
        .npt-eq {
          display: inline-flex;
          align-items: flex-end;
          gap: 2px;
          height: 12px;
        }
        .npt-eq span {
          display: inline-block;
          width: 2px;
          background: #ec4899;
          border-radius: 1px;
          animation: npt-bar 0.9s ease-in-out infinite;
        }
        .npt-eq span:nth-child(1) { height: 4px;  animation-delay: 0s; }
        .npt-eq span:nth-child(2) { height: 10px; animation-delay: 0.15s; }
        .npt-eq span:nth-child(3) { height: 7px;  animation-delay: 0.3s; }
        @keyframes npt-bar {
          0%, 100% { transform: scaleY(0.4); }
          50%      { transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
}
