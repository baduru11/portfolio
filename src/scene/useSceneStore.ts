"use client";

import { create } from "zustand";
import type { Object3D, Material } from "three";
import type { Zone } from "@/lib/constants";

/**
 * Scene-wide runtime state:
 *   - zone: which UI mode we're in (room / monitor / laptop / arcade)
 *   - objects: registry of Blender-named objects, populated once on GLB load
 *   - materials: registry of Blender-named materials for runtime flicker
 */

interface SceneState {
  zone: Zone;
  objects: Record<string, Object3D>;
  materials: Record<string, Material>;
  isPlaying: boolean;
  setZone: (zone: Zone) => void;
  registerObjects: (objs: Record<string, Object3D>) => void;
  registerMaterials: (mats: Record<string, Material>) => void;
  setPlaying: (v: boolean) => void;
  togglePlaying: () => void;
  reset: () => void;
}

export const useSceneStore = create<SceneState>((set) => ({
  zone: "room",
  objects: {},
  materials: {},
  isPlaying: false,
  setZone: (zone) => set({ zone }),
  registerObjects: (objects) => set({ objects }),
  registerMaterials: (materials) => set({ materials }),
  setPlaying: (v) => set({ isPlaying: v }),
  togglePlaying: () => set((s) => ({ isPlaying: !s.isPlaying })),
  reset: () => set({ zone: "room", isPlaying: false }),
}));

// Dev-only: expose the store on window for debugging via preview_eval
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  (window as unknown as { __sceneStore?: typeof useSceneStore }).__sceneStore =
    useSceneStore;
}
