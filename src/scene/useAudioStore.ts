"use client";

import { create } from "zustand";

/**
 * Audio-layer state — separate from `useSceneStore` so visual scene
 * concerns stay distinct from playback. `isPlaying` stays in the scene
 * store because it also drives the turntable arm animation; everything
 * else (current track, music volume, global mute) lives here.
 */

export type MusicTrack = "Future" | "Haze" | "Velvet" | "Neon";

export const MUSIC_TRACKS: readonly MusicTrack[] = [
  "Future",
  "Haze",
  "Velvet",
  "Neon",
] as const;

interface AudioState {
  track: MusicTrack;
  musicVolume: number; // 0..100
  muted: boolean;
  setTrack: (t: MusicTrack) => void;
  setMusicVolume: (v: number) => void;
  setMuted: (v: boolean) => void;
  toggleMute: () => void;
}

// Fresh random pick at each page load so visitors don't always land on
// the same track. Subsequent transitions (when a track ends) are
// handled in useMusicPlayer.
const INITIAL_TRACK: MusicTrack =
  MUSIC_TRACKS[Math.floor(Math.random() * MUSIC_TRACKS.length)];

export const useAudioStore = create<AudioState>((set) => ({
  track: INITIAL_TRACK,
  musicVolume: 50,
  muted: false,
  setTrack: (track) => set({ track }),
  setMusicVolume: (musicVolume) =>
    set({ musicVolume: Math.max(0, Math.min(100, musicVolume)) }),
  setMuted: (muted) => set({ muted }),
  toggleMute: () => set((s) => ({ muted: !s.muted })),
}));

if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  (window as unknown as { __audioStore?: typeof useAudioStore }).__audioStore =
    useAudioStore;
}
