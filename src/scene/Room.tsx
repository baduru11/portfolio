"use client";

import { useCallback, useEffect, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Group, Vector3 } from "three";
import type { Object3D, Material, Mesh, Light, MeshStandardMaterial } from "three";
import { useSceneStore } from "@/scene/useSceneStore";
import { applyFlicker } from "@/effects/flicker";
import { applyTurntable } from "@/effects/turntable";
import { tweenCameraToZone } from "@/effects/transitions";
import { BLENDER_NAMES, BLENDER_MATERIALS, type Zone } from "@/lib/constants";
import { ScreenHtml } from "@/scene/ScreenHtml";
import dynamic from "next/dynamic";

// Lazy-load overlay chunks. Each overlay (DURU OS, Terminal, Arcade) is
// tens of KB of JSX + CSS; code-splitting keeps them out of the initial
// bundle so the GLB/Canvas boot isn't blocked on parsing them. Chunks load
// on-demand the first time ScreenHtml mounts the component.
const SwanOS = dynamic(() => import("@/overlays/SwanOS/SwanOS").then((m) => m.SwanOS), {
  ssr: false,
});
const TerminalOS = dynamic(
  () => import("@/overlays/Terminal/TerminalOS").then((m) => m.TerminalOS),
  { ssr: false },
);
const ArcadeMenu = dynamic(
  () => import("@/overlays/Arcade/ArcadeMenu").then((m) => m.ArcadeMenu),
  { ssr: false },
);

const GLB_URL = "/portfolio_room.glb";

// Preload so the GLB is in the loader cache before the component mounts
useGLTF.preload(GLB_URL);

// Walk up the object's parent chain until we find a named ancestor that
// matches one of the interactive screens. Returns the zone to tween to, or null.
function zoneForObject(obj: Object3D | null): Zone | null {
  let cur: Object3D | null = obj;
  while (cur) {
    switch (cur.name) {
      case BLENDER_NAMES.MONITOR_SCREEN:
        return "monitor";
      case BLENDER_NAMES.LAPTOP_SCREEN:
        return "laptop";
      case BLENDER_NAMES.ARCADE_SCREEN:
        return "arcade";
      case BLENDER_NAMES.TURNTABLE_ROOT:
      case BLENDER_NAMES.TURNTABLE_ROOT_ALT:
        return "turntable";
      default:
        cur = cur.parent;
    }
  }
  return null;
}

export function Room() {
  const { scene } = useGLTF(GLB_URL);
  const registerObjects = useSceneStore((s) => s.registerObjects);
  const registerMaterials = useSceneStore((s) => s.registerMaterials);
  const registered = useRef(false);

  useEffect(() => {
    if (registered.current) return;
    registered.current = true;

    const objs: Record<string, Object3D> = {};
    const mats: Record<string, Material> = {};

    // The 16 glTF point lights are DISABLED at runtime because:
    //   (1) they crashed the EffectComposer (black frame with bloom on);
    //   (2) their effect is already baked into Floor / Walls / Desk /
    //       Ceiling / Frame / Monitor_Stand textures via Cycles.
    // Fill lighting for non-baked props (speakers, amp, Quad Cortex,
    // guitar, etc.) now comes entirely from the <ambientLight> and
    // <Environment> in Scene.tsx.
    const EMISSIVE_SCALE = 0.2;      // AgX preserves hue → LEDs read colour, not white

    scene.traverse((obj) => {
      if (obj.name) objs[obj.name] = obj;
      const mesh = obj as Mesh;
      if (mesh.isMesh) {
        const matOrArr = mesh.material;
        const materials = Array.isArray(matOrArr) ? matOrArr : [matOrArr];
        for (const m of materials) {
          if (!m) continue;
          if (m.name) mats[m.name] = m;
          const std = m as MeshStandardMaterial;
          if (std.emissiveIntensity !== undefined && std.emissiveIntensity > 1) {
            std.emissiveIntensity = std.emissiveIntensity * EMISSIVE_SCALE;
          }
        }
      }
      const light = obj as Light;
      if (light.isLight) {
        light.visible = false;
        light.intensity = 0;
      }
    });

    // Wrap turntable platter + slipmat in world-space Groups so rotation
    // pivots around their visible centers rather than the imported mesh
    // origins (which are ~13 units offset in the Sketchfab source and
    // would fling the mesh out of view when rotated).
    // The Group is parented to the scene root so group.rotation.y is
    // always world-vertical, regardless of the parent chain's rotations.
    const wrapForSpin = (name: string): Group | null => {
      const m = objs[name] as Mesh | undefined;
      if (!m || !m.geometry) return null;
      m.geometry.computeBoundingSphere();
      const centerLocal = m.geometry.boundingSphere?.center ?? new Vector3();
      m.updateWorldMatrix(true, false);
      const worldCenter = centerLocal.clone().applyMatrix4(m.matrixWorld);

      const group = new Group();
      group.name = `__spin_${name}`;
      group.position.copy(worldCenter);
      scene.add(group);
      group.updateMatrixWorld();

      // Reparent m into group, preserving its current world transform
      const worldMatrix = m.matrixWorld.clone();
      const groupInv = group.matrixWorld.clone().invert();
      const newLocal = worldMatrix.premultiply(groupInv);
      newLocal.decompose(m.position, m.quaternion, m.scale);
      group.add(m);
      return group;
    };
    const platterSpin = wrapForSpin("plateau_lambert1_0");
    const slipmatSpin = wrapForSpin("tapis1_lambert1_0");
    if (platterSpin) objs["__platterSpin"] = platterSpin;
    if (slipmatSpin) objs["__slipmatSpin"] = slipmatSpin;

    // The platter + slipmat bakes captured a cyan ceiling-light hotspot
    // that rotates with the disc when spinning — visually wrong because
    // real lighting should stay fixed while the disc spins underneath.
    // The chassis (`base_lambert1_0`) emissive bake captured the tonearm's
    // rest-position shadow — it stayed frozen under the arm while the
    // real arm mesh swung over the disc during playback.
    // Strip the baked emissive map and fall back to a flat colour so
    // neither rotation nor tonearm swing leaves ghost artefacts behind.
    const flattenMaterial = (name: string, baseHex = 0x060606) => {
      const m = objs[name] as Mesh | undefined;
      if (!m) return;
      const matOrArr = m.material;
      const materials = Array.isArray(matOrArr) ? matOrArr : [matOrArr];
      for (const mat of materials) {
        const std = mat as MeshStandardMaterial;
        if (!std) continue;
        std.emissiveMap = null;
        std.emissive.setHex(0x050505);
        std.emissiveIntensity = 1;
        std.color.setHex(baseHex);
        std.needsUpdate = true;
      }
    };
    flattenMaterial("plateau_lambert1_0");
    flattenMaterial("tapis1_lambert1_0");
    flattenMaterial("base_lambert1_0", 0x6a6a70);

    // Tonearm pivot wrapper. The arm's true rotation centre is at
    // `pivot_bras_lambert1_0`'s world centre — everything under the
    // `bras` empty (base / arm / counterweight / head / needle) needs
    // to swing together around that point. We create a scene-root
    // Group at the pivot and reparent `bras` into it.
    const pivotMesh = objs["pivot_bras_lambert1_0"] as Mesh | undefined;
    const bras = objs["bras"] as Object3D | undefined;
    if (pivotMesh && pivotMesh.geometry && bras) {
      pivotMesh.geometry.computeBoundingSphere();
      const pivotLocal =
        pivotMesh.geometry.boundingSphere?.center ?? new Vector3();
      pivotMesh.updateWorldMatrix(true, false);
      const pivotWorld = pivotLocal.clone().applyMatrix4(pivotMesh.matrixWorld);

      const armGroup = new Group();
      armGroup.name = "__armPivot";
      armGroup.position.copy(pivotWorld);
      scene.add(armGroup);
      armGroup.updateMatrixWorld();

      bras.updateMatrixWorld(true);
      const armWorld = bras.matrixWorld.clone();
      const armGroupInv = armGroup.matrixWorld.clone().invert();
      const newArmLocal = armWorld.premultiply(armGroupInv);
      newArmLocal.decompose(bras.position, bras.quaternion, bras.scale);
      armGroup.add(bras);

      objs["__armPivot"] = armGroup;
    }

    // Turn off the monitor and laptop screens so they appear black in room view.
    // The HTML UI rendered via <ScreenHtml> covers them when zoomed in.
    // Arcade stays as-is (flicker remains, user will swap in a start image later).
    const blackoutMaterial = (name: string) => {
      const m = mats[name] as MeshStandardMaterial | undefined;
      if (!m) return;
      m.emissiveMap = null;
      m.emissive.setHex(0x000000);
      m.emissiveIntensity = 0;
      m.map = null;
      m.color.setHex(0x000000);
      m.needsUpdate = true;
    };
    blackoutMaterial(BLENDER_MATERIALS.MONITOR_SCREEN);
    blackoutMaterial(BLENDER_MATERIALS.LAPTOP_SCREEN);
    blackoutMaterial(BLENDER_MATERIALS.ARCADE_SCREEN);

    registerObjects(objs);
    registerMaterials(mats);
  }, [scene, registerObjects, registerMaterials]);

  // Per-frame flicker + turntable animation
  useFrame((state, delta) => {
    applyFlicker(state.clock.elapsedTime);
    applyTurntable(delta);
  });

  // Delegated click handler — R3F bubbles the hit object up; we walk its
  // ancestry to find the named screen without re-parenting anything.
  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    const zone = zoneForObject(e.object);
    if (!zone) return;
    e.stopPropagation();
    tweenCameraToZone(zone);
  }, []);

  const handlePointerOver = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (zoneForObject(e.object)) {
      e.stopPropagation();
      document.body.style.cursor = "pointer";
    }
  }, []);

  const handlePointerOut = useCallback(() => {
    document.body.style.cursor = "default";
  }, []);

  const zone = useSceneStore((s) => s.zone);

  return (
    <>
      <primitive
        object={scene}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      />
      <ScreenHtml
        screenName={BLENDER_NAMES.MONITOR_SCREEN}
        active={zone === "monitor"}
        // DOM aspect 2560/1474 ≈ 1.737 matches world aspect 0.7761/0.4465.
        // Doubled from 1280×737 — drei stretched the old DOM to ~1920px at
        // POV_Monitor, rasterizing text at 1280 then bilinear-upscaling 1.5×
        // = blurry. At 2560, drei DOWNSAMPLES to screen → supersampled,
        // crisp glyphs on any 1080p+ viewport.
        pixelWidth={2560}
        pixelHeight={1474}
        overridePose={{
          // Blender face #0 of Monitor_Screen = actual display quad.
          // Converted from Blender Z-up to Three.js Y-up: (x, z, -y).
          // Normal flipped to face the viewer side.
          center: [0.0753, 1.2063, -1.3152],
          normal: [0.0174, 0.0, 0.9998],
          width: 0.7761,
          height: 0.4465,
        }}
      >
        <SwanOS />
      </ScreenHtml>
      <ScreenHtml
        screenName={BLENDER_NAMES.LAPTOP_SCREEN}
        active={zone === "laptop"}
        keepMounted
        // DOM aspect 2560/1480 ≈ 1.73 matches world aspect 0.3744/0.2165.
        // Bumped from 1920×1110 to match the monitor's 1.33× supersample
        // factor — drei now downsamples to screen instead of 1:1, giving
        // crisper terminal text on 1080p+ viewports.
        pixelWidth={2560}
        pixelHeight={1480}
        overridePose={{
          // Blender face #2 of Laptop_Screen = actual display quad.
          // Values from Blender Z-up, converted to Three.js Y-up: (x, z, -y).
          center: [1.0657, 1.0599, -1.2509],
          normal: [-0.4942, 0.0099, 0.8693],
          width: 0.3744,
          height: 0.2165,
        }}
      >
        <TerminalOS />
      </ScreenHtml>
      <ScreenHtml
        screenName={BLENDER_NAMES.ARCADE_SCREEN}
        active={zone === "arcade"}
        // DOM aspect 1440/1725 ≈ 0.835 matches world aspect 0.4475/0.5359.
        // 3× the previous 480×575 — arcade is portrait and fills ~1000px
        // vertically on a 1080p viewport, so the old DOM was upscaled ~2×
        // (blurry). Now drei downsamples → supersampled, crisp CRT text.
        pixelWidth={1440}
        pixelHeight={1725}
        // Arcade screen n-gon has rounded corners (~14mm in world / ~15px in DOM).
        borderRadius="20px / 16px"
        overridePose={{
          // Blender face #0 of Arcade_Screen (15-vert n-gon, tilted-back cabinet).
          // Up vector derived from (top verts avg − bottom verts avg) to account
          // for both the backward tilt AND the sideways rotation of the cabinet.
          // Blender Z-up → Three.js Y-up: (x, z, -y).
          // Center = midpoint of projected face extents (not vert mean —
          // the n-gon is asymmetric, with bottom extending further).
          center: [-1.3513, 1.0023, -1.6422],
          normal: [0.3957, 0.3936, 0.8298],
          up: [-0.1694, 0.9193, -0.3553],
          width: 0.4475,
          height: 0.5359,
        }}
      >
        <ArcadeMenu />
      </ScreenHtml>
    </>
  );
}
