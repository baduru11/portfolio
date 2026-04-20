"use client";

import { MeshStandardMaterial } from "three";
import { BLENDER_MATERIALS } from "@/lib/constants";
import { useSceneStore } from "@/scene/useSceneStore";

// Per-material base emissive intensities, captured on first frame.
const baseCache = new WeakMap<MeshStandardMaterial, number>();

function getBase(mat: MeshStandardMaterial): number {
  let base = baseCache.get(mat);
  if (base === undefined) {
    base = mat.emissiveIntensity;
    baseCache.set(mat, base);
  }
  return base;
}

function setIntensity(name: string, factor: number) {
  const mat = useSceneStore.getState().materials[name] as
    | MeshStandardMaterial
    | undefined;
  if (!mat || !("emissiveIntensity" in mat)) return;
  const base = getBase(mat);
  mat.emissiveIntensity = base * factor;
}

/**
 * Call every frame from useFrame().
 * t is the elapsed time in seconds.
 *
 *   - Arcade:  heavy CRT flicker (slow sine + fast jitter + rare dropouts)
 *   - Monitor: subtle scanline pulse
 *   - Laptop:  terminal-style breathing
 *   - Hex:     rare blink
 */
export function applyFlicker(t: number) {
  // Arcade — heavy CRT
  const arcSlow = Math.sin(t * 2.1) * 0.15;
  const arcFast = Math.sin(t * 17 + Math.sin(t * 5)) * 0.08;
  const arcSpike = Math.random() < 0.02 ? -0.6 : 0;
  setIntensity(
    BLENDER_MATERIALS.ARCADE_SCREEN,
    1 + arcSlow + arcFast + arcSpike
  );

  // Monitor — subtle pulse
  setIntensity(BLENDER_MATERIALS.MONITOR_SCREEN, 1 + Math.sin(t * 30) * 0.03);

  // Laptop — calm breathing
  setIntensity(BLENDER_MATERIALS.LAPTOP_SCREEN, 1 + Math.sin(t * 1.3) * 0.08);

  // Hex accent — occasional blink (1% chance of 60% drop)
  const hexFactor = Math.random() < 0.01 ? 0.4 : 1.0;
  setIntensity(BLENDER_MATERIALS.HEX_FLICKER, hexFactor);
}
