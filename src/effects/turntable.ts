"use client";

import { MathUtils } from "three";
import type { Object3D } from "three";
import { useSceneStore } from "@/scene/useSceneStore";

/**
 * Turntable animation driven by `isPlaying` in the scene store.
 *
 *   - Platter spins on its local Y axis at ~45 RPM (a touch faster than
 *     33⅓ for visual readability).
 *   - Slipmat (`tapis1`) spins with it.
 *   - Tonearm (`bras`) tweens between REST (off record) and PLAY
 *     (needle over record) angles.
 *
 * Tune REST / PLAY below if the arm doesn't land where you expect.
 * Values are RADIANS on the local Y axis.
 */

const PLATTER_SPEED_RAD_PER_SEC = (45 / 60) * Math.PI * 2; // 45 RPM → 4.712 rad/s
const TONEARM_REST = 0;
const TONEARM_PLAY = -0.35;      // ~-20°, tune to taste
const TONEARM_TWEEN = 0.04;      // lerp factor per frame

/**
 * The glTF `turntable` root has a baked Blender→Y-up conversion rotation
 * (`rot=(π/2, 0, …)` on X), so inside the hierarchy the model's "up" is
 * local +Z. We spin around local Z for platter + slipmat, and pivot the
 * tonearm on local Z too.
 *
 * Call every frame from inside a R3F useFrame. Reads the latest store
 * state directly so a play-toggle doesn't re-render the component tree.
 */
export function applyTurntable(dt: number) {
  const state = useSceneStore.getState();
  const objs = state.objects;
  const playing = state.isPlaying;

  // `__platterSpin` and `__slipmatSpin` are scene-root Group wrappers
  // created by Room.tsx that place the rotation pivot at the mesh's
  // world-space bounding center. Since the group is attached to the
  // scene root, group.rotation.y is ALWAYS world-vertical.
  const platter: Object3D | undefined = objs["__platterSpin"];
  const slipmat: Object3D | undefined = objs["__slipmatSpin"];
  // `__armPivot` is a scene-root Group at the real tonearm pivot
  // (pivot_bras world centre). Rotating its .y swings the arm
  // horizontally around the turntable bearing.
  const tonearm: Object3D | undefined = objs["__armPivot"];

  if (playing) {
    const drot = PLATTER_SPEED_RAD_PER_SEC * dt;
    if (platter) platter.rotation.y += drot;
    if (slipmat) slipmat.rotation.y += drot;
  }

  if (tonearm) {
    const target = playing ? TONEARM_PLAY : TONEARM_REST;
    tonearm.rotation.y = MathUtils.lerp(
      tonearm.rotation.y,
      target,
      TONEARM_TWEEN
    );
  }
}
