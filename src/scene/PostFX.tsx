"use client";

import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { KernelSize } from "postprocessing";

/**
 * Bloom gives the neon vibe — hot-spot LED stripes / hex tiles / screens
 * bleed light into neighbouring pixels.
 *
 * The black-frame bug we hit was caused by the 16 KHR_lights_punctual
 * point lights in the GLB (see Room.tsx — they're now disabled because
 * their light is already baked into Floor/Wall/Desk/etc. textures).
 *
 * Canvas keeps AgXToneMapping; no ToneMapping effect needed in the
 * composer because the renderer does it. Minimum config is safest with
 * @react-three/postprocessing 3.0.4 + r3f 9.6 + three 0.183.
 */
export function PostFX() {
  return (
    <EffectComposer>
      <Bloom
        intensity={0.9}
        luminanceThreshold={0.55}
        luminanceSmoothing={0.25}
        kernelSize={KernelSize.MEDIUM}
        mipmapBlur
      />
    </EffectComposer>
  );
}
