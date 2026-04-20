"use client";

import { useEffect, useRef } from "react";
import { MUSIC_TRACKS, useAudioStore, type MusicTrack } from "@/scene/useAudioStore";
import { useSceneStore } from "@/scene/useSceneStore";

// Per-call sfx attenuation (applied to one-shots + loops, not music).
const VOLUME_SCALE = 0.7;
// Whole-mix attenuation at the master gain node — affects sfx AND music.
// Adjust here to drop/raise overall loudness without touching callsites.
const MASTER_ATTENUATION = 0.8;

/**
 * Web Audio backend for all sfx + background music. Everything routes
 * through a shared `masterGain` so a single toggle mutes the entire
 * mix regardless of whether the source is a one-shot, a loop, or the
 * music player. Buffers are fetched + decoded once and cached.
 */

type AudioCtxCtor = new () => AudioContext;

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
const bufferCache = new Map<string, Promise<AudioBuffer>>();
let warmedUp = false;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const w = window as unknown as {
      AudioContext?: AudioCtxCtor;
      webkitAudioContext?: AudioCtxCtor;
    };
    const Ctor = w.AudioContext ?? w.webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    masterGain = ctx.createGain();
    masterGain.gain.value = useAudioStore.getState().muted ? 0 : MASTER_ATTENUATION;
    masterGain.connect(ctx.destination);
    // Live-update master gain whenever `muted` flips.
    useAudioStore.subscribe((s, prev) => {
      if (s.muted === prev.muted) return;
      if (!masterGain || !ctx) return;
      // Short ramp avoids click artifacts on fast toggle.
      const now = ctx.currentTime;
      masterGain.gain.cancelScheduledValues(now);
      masterGain.gain.setTargetAtTime(s.muted ? 0 : MASTER_ATTENUATION, now, 0.015);
    });
  }
  // Autoplay policies leave the context suspended until a user gesture.
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
  return ctx;
}

function getMaster(): GainNode | null {
  // getContext lazily creates masterGain.
  if (!getContext()) return null;
  return masterGain;
}

function loadBuffer(url: string): Promise<AudioBuffer> {
  const cached = bufferCache.get(url);
  if (cached) return cached;
  const p = (async (): Promise<AudioBuffer> => {
    const c = getContext();
    if (!c) throw new Error("no audio context");
    const res = await fetch(url);
    if (!res.ok) throw new Error(`sfx fetch ${res.status}: ${url}`);
    const arr = await res.arrayBuffer();
    return new Promise<AudioBuffer>((resolve, reject) => {
      c.decodeAudioData(arr, resolve, reject);
    });
  })();
  bufferCache.set(url, p);
  return p;
}

function warmUpSfx(): void {
  if (warmedUp) return;
  warmedUp = true;
  for (const url of Object.values(SFX)) {
    loadBuffer(url).catch(() => {});
  }
}

function clampVolume(v: number): number {
  return Math.max(0, Math.min(1, v * VOLUME_SCALE));
}

/**
 * Fire-and-forget sfx — spawns a fresh `AudioBufferSourceNode` that
 * connects through masterGain and mixes with any concurrent playback.
 */
export function playSfx(src: string, volume = 1): void {
  const master = getMaster();
  const c = ctx;
  if (!master || !c) return;
  warmUpSfx();
  const vol = clampVolume(volume);
  loadBuffer(src)
    .then((buf) => {
      if (!masterGain || !ctx) return;
      const node = ctx.createBufferSource();
      node.buffer = buf;
      const gain = ctx.createGain();
      gain.gain.value = vol;
      node.connect(gain).connect(masterGain);
      node.start(0);
    })
    .catch(() => {});
}

/**
 * Loops a sound while `enabled` is true. Generation token guards
 * against stale starts if the flag flips during an async load.
 */
export function useLoopSfx(
  src: string,
  enabled: boolean,
  volume = 0.5,
): void {
  const nodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const genRef = useRef(0);

  useEffect(() => {
    const master = getMaster();
    if (!master || !ctx) return;
    warmUpSfx();
    const gen = ++genRef.current;

    const stop = (): void => {
      if (nodeRef.current) {
        try {
          nodeRef.current.stop();
        } catch {
          // already stopped
        }
        nodeRef.current.disconnect();
        nodeRef.current = null;
      }
      if (gainRef.current) {
        gainRef.current.disconnect();
        gainRef.current = null;
      }
    };

    if (!enabled) {
      stop();
      return;
    }

    const vol = clampVolume(volume);
    loadBuffer(src)
      .then((buf) => {
        if (genRef.current !== gen) return;
        if (!masterGain || !ctx) return;
        stop();
        const node = ctx.createBufferSource();
        node.buffer = buf;
        node.loop = true;
        const gain = ctx.createGain();
        gain.gain.value = vol;
        node.connect(gain).connect(masterGain);
        node.start(0);
        nodeRef.current = node;
        gainRef.current = gain;
      })
      .catch(() => {});
  }, [enabled, src, volume]);

  useEffect(() => {
    return () => {
      if (nodeRef.current) {
        try {
          nodeRef.current.stop();
        } catch {
          // already stopped
        }
        nodeRef.current.disconnect();
        nodeRef.current = null;
      }
      if (gainRef.current) {
        gainRef.current.disconnect();
        gainRef.current = null;
      }
    };
  }, []);
}

/**
 * Singleton "loading" cue tied to on-screen boot sequences. Starts on
 * zone-enter, stopped when the destination screen's boot animation
 * finishes, so sfx duration matches the visible loading state.
 */
let loadingNode: {
  source: AudioBufferSourceNode;
  gain: GainNode;
} | null = null;
let loadingToken = 0;

// Play only the leading portion of loading.mp3 — the tail felt
// overlong against the on-screen boot animations in monitor/laptop.
const LOADING_DURATION_FACTOR = 0.6;

export function startLoadingSfx(volume = 0.6): void {
  const master = getMaster();
  if (!master || !ctx) return;
  warmUpSfx();
  stopLoadingSfx();
  const myToken = ++loadingToken;
  const vol = clampVolume(volume);
  loadBuffer(SFX.loading)
    .then((buf) => {
      if (myToken !== loadingToken) return;
      if (!masterGain || !ctx) return;
      const node = ctx.createBufferSource();
      node.buffer = buf;
      const gain = ctx.createGain();
      gain.gain.value = vol;
      node.connect(gain).connect(masterGain);
      // start(when, offset, duration) — caps playback at 60% of the file.
      node.start(0, 0, buf.duration * LOADING_DURATION_FACTOR);
      loadingNode = { source: node, gain };
    })
    .catch(() => {});
}

export function stopLoadingSfx(): void {
  loadingToken += 1;
  if (!loadingNode) return;
  try {
    loadingNode.source.stop();
  } catch {
    // already stopped
  }
  loadingNode.source.disconnect();
  loadingNode.gain.disconnect();
  loadingNode = null;
}

/** Canonical sfx URLs. Files live in `web/public/audio/`. */
export const SFX = {
  arcadeMenuLoop: "/audio/8bitloopmenu.mp3",
  arcadeGameLoop: "/audio/8bitloopingame.mp3",
  arcadeNav: "/audio/8bitpluck.mp3",
  arcadeSelect: "/audio/8bitenter.mp3",
  arcadeDeath: "/audio/8bitdeath.mp3",
  zoomIn: "/audio/zoomin.mp3",
  zoomOut: "/audio/zoomout.mp3",
  loading: "/audio/loading.mp3",
  login: "/audio/login.mp3",
  windowOpen: "/audio/windowOpen.mp3",
  windowClose: "/audio/windowClose.mp3",
  terminalCmd: "/audio/terminalcommandpopup.mp3",
} as const;

/** Background music URLs. */
export const MUSIC_URL: Record<MusicTrack, string> = {
  Future: "/audio/Future.mp3",
  Haze: "/audio/Haze.mp3",
  Velvet: "/audio/Velvet.mp3",
  Neon: "/audio/Neon.mp3",
};

/**
 * Music player hook — mount once (e.g. in Scene.tsx). Listens to scene
 * `isPlaying`, audio-store `track` + `musicVolume`, and drives a looped
 * `AudioBufferSourceNode`. Track change = stop current + start new
 * (instant, no crossfade). Mute is handled at masterGain.
 *
 * Browser autoplay: if the AudioContext is still suspended when we
 * call `start()`, playback queues and actually begins on the first
 * user gesture (which auto-resumes the context). No extra gesture
 * handling required.
 */
// Signal chain when music is playing:
//
//   BufferSource → volumeGain → muffleFilter → muffleGain → masterGain
//
// muffleFilter + muffleGain form a simple "heard from another room"
// effect: drop the treble and back off the level. Activated whenever
// the user is inside the monitor or laptop zones.
const MUFFLE_FREQ_OPEN = 20000; // effectively bypassed
const MUFFLE_FREQ_DUCKED = 620; // classic "next room" lowpass cutoff
const MUFFLE_GAIN_OPEN = 1.0;
const MUFFLE_GAIN_DUCKED = 0.55;
const MUFFLE_RAMP_TC = 0.12; // 120ms exponential ramp

export function useMusicPlayer(): void {
  const track = useAudioStore((s) => s.track);
  const volume = useAudioStore((s) => s.musicVolume);
  const isPlaying = useSceneStore((s) => s.isPlaying);
  const zone = useSceneStore((s) => s.zone);
  // Arcade games ship their own 8-bit BGM (menu loop, in-game loop) so
  // the main deck music would just fight with them. Suppress it while
  // the user is in that zone; restore on exit.
  const suppressed = zone === "arcade";
  const shouldPlay = isPlaying && !suppressed;
  // Monitor/laptop apply a lowpass + duck so the deck music reads as
  // ambient, like hearing the bar through a closed door.
  const muffled = zone === "monitor" || zone === "laptop";

  const nodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const filterRef = useRef<BiquadFilterNode | null>(null);
  const muffleGainRef = useRef<GainNode | null>(null);
  const genRef = useRef(0);

  // Start / swap / stop as inputs change.
  useEffect(() => {
    const master = getMaster();
    if (!master || !ctx) return;
    const gen = ++genRef.current;

    // Null out `onended` before calling stop()/replacing the source so
    // manual teardown (pause, arcade-suppress, track swap) never fires
    // the auto-advance handler.
    const stop = (): void => {
      if (nodeRef.current) {
        nodeRef.current.onended = null;
        try {
          nodeRef.current.stop();
        } catch {
          // already stopped
        }
        nodeRef.current.disconnect();
        nodeRef.current = null;
      }
      if (gainRef.current) {
        gainRef.current.disconnect();
        gainRef.current = null;
      }
      if (filterRef.current) {
        filterRef.current.disconnect();
        filterRef.current = null;
      }
      if (muffleGainRef.current) {
        muffleGainRef.current.disconnect();
        muffleGainRef.current = null;
      }
    };

    if (!shouldPlay) {
      stop();
      return;
    }

    loadBuffer(MUSIC_URL[track])
      .then((buf) => {
        if (genRef.current !== gen) return;
        if (!masterGain || !ctx) return;
        stop();
        const node = ctx.createBufferSource();
        node.buffer = buf;
        node.loop = false;
        node.onended = () => {
          // Guard against stale handlers surviving a race. Only the
          // latest effect run (gen) may advance the track.
          if (genRef.current !== gen) return;
          const current = useAudioStore.getState().track;
          const pool = MUSIC_TRACKS.filter((t) => t !== current);
          if (pool.length === 0) return;
          const next = pool[Math.floor(Math.random() * pool.length)];
          useAudioStore.getState().setTrack(next);
        };
        const gain = ctx.createGain();
        gain.gain.value = volume / 100;
        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = muffled ? MUFFLE_FREQ_DUCKED : MUFFLE_FREQ_OPEN;
        filter.Q.value = 0.7;
        const muffleGain = ctx.createGain();
        muffleGain.gain.value = muffled ? MUFFLE_GAIN_DUCKED : MUFFLE_GAIN_OPEN;
        node.connect(gain).connect(filter).connect(muffleGain).connect(masterGain);
        node.start(0);
        nodeRef.current = node;
        gainRef.current = gain;
        filterRef.current = filter;
        muffleGainRef.current = muffleGain;
      })
      .catch(() => {});
  }, [track, shouldPlay]);

  // Live volume updates without stopping playback.
  useEffect(() => {
    if (!gainRef.current || !ctx) return;
    const now = ctx.currentTime;
    gainRef.current.gain.cancelScheduledValues(now);
    gainRef.current.gain.setTargetAtTime(volume / 100, now, 0.02);
  }, [volume]);

  // Muffle ramp when entering/leaving monitor or laptop zones.
  useEffect(() => {
    if (!ctx) return;
    const now = ctx.currentTime;
    if (filterRef.current) {
      filterRef.current.frequency.cancelScheduledValues(now);
      filterRef.current.frequency.setTargetAtTime(
        muffled ? MUFFLE_FREQ_DUCKED : MUFFLE_FREQ_OPEN,
        now,
        MUFFLE_RAMP_TC,
      );
    }
    if (muffleGainRef.current) {
      muffleGainRef.current.gain.cancelScheduledValues(now);
      muffleGainRef.current.gain.setTargetAtTime(
        muffled ? MUFFLE_GAIN_DUCKED : MUFFLE_GAIN_OPEN,
        now,
        MUFFLE_RAMP_TC,
      );
    }
  }, [muffled]);

  // Final cleanup.
  useEffect(() => {
    return () => {
      if (nodeRef.current) {
        nodeRef.current.onended = null;
        try {
          nodeRef.current.stop();
        } catch {
          // already stopped
        }
        nodeRef.current.disconnect();
        nodeRef.current = null;
      }
      if (gainRef.current) {
        gainRef.current.disconnect();
        gainRef.current = null;
      }
      if (filterRef.current) {
        filterRef.current.disconnect();
        filterRef.current = null;
      }
      if (muffleGainRef.current) {
        muffleGainRef.current.disconnect();
        muffleGainRef.current = null;
      }
    };
  }, []);
}
