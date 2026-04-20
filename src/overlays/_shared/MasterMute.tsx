"use client";

import { useAudioStore } from "@/scene/useAudioStore";

/**
 * Fixed floating master mute button. Toggles the audio store's `muted`
 * flag, which is applied at the shared `masterGain` node in useSfx.ts
 * so every sound source (sfx loops, one-shots, music) goes silent
 * simultaneously. Rendered once at the root of Scene.tsx.
 */
export function MasterMute() {
  const muted = useAudioStore((s) => s.muted);
  const toggle = useAudioStore((s) => s.toggleMute);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={muted ? "Unmute all audio" : "Mute all audio"}
      title={muted ? "Unmute" : "Mute"}
      className={[
        "fixed bottom-4 right-4 z-50",
        "w-10 h-10 rounded-full",
        "flex items-center justify-center",
        "border backdrop-blur-md transition",
        muted
          ? "bg-black/70 border-pink-500/60 text-pink-400 shadow-[0_0_12px_rgba(236,72,153,0.35)]"
          : "bg-black/50 border-pink-500/25 text-pink-200/80 hover:border-pink-500/50 hover:text-pink-200",
      ].join(" ")}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        {muted ? (
          <>
            <line x1="23" y1="9" x2="17" y2="15" />
            <line x1="17" y1="9" x2="23" y2="15" />
          </>
        ) : (
          <>
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          </>
        )}
      </svg>
    </button>
  );
}
