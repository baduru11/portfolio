"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  Euler,
  MathUtils,
  PerspectiveCamera as PerspectiveCameraImpl,
  Quaternion,
  Vector3,
  type Object3D,
} from "three";
import { useSceneStore } from "@/scene/useSceneStore";
import { useMouseParallax } from "@/effects/useMouseParallax";
import { BLENDER_NAMES } from "@/lib/constants";

const DAMPING = 0.08; // lerp factor per frame

/**
 * Strategy:
 *   - On first frame: snap Camera_Pivot to match the GLTF camera's world pose,
 *     then remember that pose as "home". We use the GLTF camera (not the
 *     Camera_Home empty) because glTF's Y-up export gives cameras special
 *     -Z-forward handling; plain Object3D empties get their rotation mangled.
 *   - Parallax (while zone === "room") lerps pivot's Euler toward
 *     homeEuler + mouse offset.
 *   - Transitions.ts tweens the pivot directly while zone !== "room".
 *   - Each frame we mirror pivot's pose onto the default R3F camera.
 */
export function CameraRig() {
  const objects = useSceneStore((s) => s.objects);
  const zone = useSceneStore((s) => s.zone);
  const { camera } = useThree();
  const { targetRx, targetRy } = useMouseParallax();

  const homePos = useRef<Vector3 | null>(null);
  const homeEuler = useRef<Euler | null>(null);
  const initialized = useRef(false);

  useFrame(() => {
    const pivot = objects[BLENDER_NAMES.CAMERA_PIVOT] as Object3D | undefined;
    if (!pivot) return;

    // --- One-time setup: find the POV_Home camera, snap pivot to match, cache pose
    if (!initialized.current) {
      // Prefer POV_Home (authored in Blender for the main room POV). Fall
      // back to any PerspectiveCamera if POV_Home isn't in the GLB.
      let gltfCam: PerspectiveCameraImpl | null = null;
      const pov = objects[BLENDER_NAMES.POV_HOME] as Object3D | undefined;
      if (pov && (pov as PerspectiveCameraImpl).isPerspectiveCamera) {
        gltfCam = pov as PerspectiveCameraImpl;
      } else {
        let root: Object3D = pivot;
        while (root.parent) root = root.parent;
        root.traverse((o) => {
          if (!gltfCam && (o as PerspectiveCameraImpl).isPerspectiveCamera && o !== camera) {
            gltfCam = o as PerspectiveCameraImpl;
          }
        });
      }

      if (gltfCam) {
        const src = gltfCam as PerspectiveCameraImpl;
        // Snap pivot to the GLTF camera's world pose
        const wp = src.getWorldPosition(new Vector3());
        const wq = src.getWorldQuaternion(new Quaternion());
        pivot.position.copy(wp);
        pivot.quaternion.copy(wq);
        // Remember this as "home"
        homePos.current = wp.clone();
        homeEuler.current = new Euler().setFromQuaternion(wq, "YXZ");
        // Copy projection params to the render camera so framing matches Blender
        if (camera instanceof PerspectiveCameraImpl) {
          camera.fov = src.fov;
          camera.near = Math.max(0.01, src.near);
          camera.far = src.far;
          camera.updateProjectionMatrix();
        }
        initialized.current = true;
      }
    }

    // --- Parallax (only in free-look room view) ---
    if (zone === "room" && homeEuler.current) {
      const targetX = homeEuler.current.x + targetRx.current;
      const targetY = homeEuler.current.y + targetRy.current;
      const targetZ = homeEuler.current.z;

      // Read pivot's current rotation in the same Euler order as homeEuler
      const currentEuler = new Euler().setFromQuaternion(pivot.quaternion, "YXZ");
      const lerpedEuler = new Euler(
        MathUtils.lerp(currentEuler.x, targetX, DAMPING),
        MathUtils.lerp(currentEuler.y, targetY, DAMPING),
        MathUtils.lerp(currentEuler.z, targetZ, DAMPING),
        "YXZ"
      );
      pivot.quaternion.setFromEuler(lerpedEuler);
    }

    // --- Mirror pivot onto the render camera ---
    camera.position.copy(pivot.position);
    camera.quaternion.copy(pivot.quaternion);
  });

  return null;
}
