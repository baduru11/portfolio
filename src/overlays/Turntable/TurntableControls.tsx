"use client";

import { useEffect } from "react";
import { tweenCameraToZone } from "@/effects/transitions";
import { useSceneStore } from "@/scene/useSceneStore";
import { MUSIC_TRACKS, useAudioStore, type MusicTrack } from "@/scene/useAudioStore";

/**
 * Turntable deck — music browser + volume + play/pause.
 * Anchored on the right half of the viewport in POV_Turntable. Reads
 * and writes `useAudioStore` (track, music volume) and toggles the
 * scene store's `isPlaying` flag, which drives both the music engine
 * (see useMusicPlayer in useSfx.ts) and the 3D tonearm animation.
 */

// Small tag/mood descriptor for each track. Pure flavor text — the 4
// files are the source of truth; this just informs the UI.
const TRACK_TAGS: Record<MusicTrack, { mood: string; bpm: string }> = {
  Future: { mood: "synthwave · neon drift", bpm: "118" },
  Haze: { mood: "lofi · dust & static", bpm: "84" },
  Velvet: { mood: "smooth · after-hours", bpm: "96" },
  Neon: { mood: "uptempo · chrome", bpm: "128" },
};

export function TurntableControls() {
  const isPlaying = useSceneStore((s) => s.isPlaying);
  const togglePlaying = useSceneStore((s) => s.togglePlaying);
  const track = useAudioStore((s) => s.track);
  const setTrack = useAudioStore((s) => s.setTrack);
  const musicVolume = useAudioStore((s) => s.musicVolume);
  const setMusicVolume = useAudioStore((s) => s.setMusicVolume);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") tweenCameraToZone("room");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-end pr-[6vw] font-mono">
      <div className="pointer-events-auto bg-black/75 backdrop-blur-md border border-pink-500/30 rounded-lg p-6 w-[min(460px,42vw)] text-pink-100 shadow-[0_0_40px_rgba(236,72,153,0.25)]">
        {/* Header — NOW SPINNING label with playing-state indicator */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span
              className={[
                "inline-block w-2 h-2 rounded-full",
                isPlaying
                  ? "bg-pink-400 shadow-[0_0_8px_#ec4899] animate-pulse"
                  : "bg-pink-500/30",
              ].join(" ")}
              aria-hidden
            />
            <div className="flex flex-col leading-tight">
              <span className="text-[9px] tracking-[0.4em] text-pink-400/70">
                {isPlaying ? "NOW SPINNING" : "IDLE"}
              </span>
              <span className="text-pink-200 text-base tracking-[0.25em]">
                {track}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={togglePlaying}
            className="px-4 py-1.5 border border-pink-500/40 hover:bg-pink-500/10 active:bg-pink-500/20 text-pink-300 text-sm tracking-widest transition rounded-sm"
          >
            {isPlaying ? "▮▮ PAUSE" : "▶ PLAY"}
          </button>
        </div>

        {/* Track list */}
        <div className="flex flex-col gap-1.5 mb-5">
          {MUSIC_TRACKS.map((t, i) => {
            const selected = t === track;
            const info = TRACK_TAGS[t];
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTrack(t)}
                className={[
                  "text-left px-3 py-2 text-sm tracking-wider border transition rounded-sm",
                  selected
                    ? "border-pink-400 bg-pink-500/15 text-pink-100 shadow-[inset_0_0_12px_rgba(236,72,153,0.2)]"
                    : "border-pink-500/20 hover:border-pink-500/40 text-pink-200/70 hover:bg-pink-500/5",
                ].join(" ")}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="opacity-60 tabular-nums">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span>{t}</span>
                    {selected && isPlaying && (
                      <span className="text-pink-400 text-xs" aria-hidden>
                        ♪
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] opacity-50 tracking-widest">
                    {info.bpm} BPM
                  </span>
                </div>
                <div className="text-[10px] tracking-widest opacity-50 mt-0.5">
                  {info.mood}
                </div>
              </button>
            );
          })}
        </div>

        {/* Volume */}
        <div className="flex items-center gap-3">
          <span className="text-xs tracking-widest text-pink-400/80">VOL</span>
          <input
            type="range"
            min={0}
            max={100}
            value={musicVolume}
            onChange={(e) => setMusicVolume(Number(e.target.value))}
            aria-label="Music volume"
            className="flex-1 accent-pink-400"
          />
          <span className="text-xs text-pink-300 w-9 text-right tabular-nums">
            {musicVolume}
          </span>
        </div>
      </div>
    </div>
  );
}
