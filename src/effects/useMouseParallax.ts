"use client";

import { useEffect, useRef } from "react";
import { MathUtils } from "three";

const MAX_HORIZONTAL_DEG = 5;
const MAX_VERTICAL_DEG = 3;

/**
 * Mouse → subtle head-tracking rotation. Absolute mapping so that the
 * centre of the viewport is always the neutral/centered look direction,
 * regardless of where the cursor was when the page loaded.
 *
 *   targetRy: horizontal rotation around world-up, ±5° max
 *   targetRx: vertical rotation around world-right, ±3° max (inverted for natural feel)
 *
 * The CameraRig lerps target → actual with DAMPING=0.08, so if the
 * cursor happens to be at the edge of the screen when the first
 * mousemove fires after mount, the camera smoothly eases into the
 * correct tilt over ~1 s rather than snapping.
 */
export function useMouseParallax() {
  const targetRx = useRef(0);
  const targetRy = useRef(0);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      // In Three.js, camera looks down -Z. A positive rotation around Y turns
      // the camera LEFT (forward becomes (-sin θ, 0, -cos θ)). To make mouse-right
      // feel like "look right", invert the X sign.
      targetRy.current = -nx * MathUtils.degToRad(MAX_HORIZONTAL_DEG);
      targetRx.current = -ny * MathUtils.degToRad(MAX_VERTICAL_DEG);
    };
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, []);

  return { targetRx, targetRy };
}
