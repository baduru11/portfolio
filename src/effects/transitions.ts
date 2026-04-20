"use client";

import gsap from "gsap";
import {
  PerspectiveCamera as PerspectiveCameraImpl,
  Quaternion,
  Vector3,
  type Object3D,
} from "three";
import { BLENDER_NAMES, type Zone } from "@/lib/constants";
import { useSceneStore } from "@/scene/useSceneStore";
import { SFX, playSfx, startLoadingSfx } from "@/lib/useSfx";

// Each zone corresponds to a POV camera authored in Blender. We mirror its
// world position + rotation + FOV onto the render camera, so Numpad 0 in
// Blender is exactly what the web shows for each zone.
const ZONE_POV: Record<Zone, string> = {
  room: BLENDER_NAMES.POV_HOME,
  monitor: BLENDER_NAMES.POV_MONITOR,
  laptop: BLENDER_NAMES.POV_LAPTOP,
  arcade: BLENDER_NAMES.POV_ARCADE,
  turntable: BLENDER_NAMES.POV_TURNTABLE,
};

const TWEEN_DURATION = 1.2; // seconds
const EASE = "power2.inOut";

// Per-zone runtime dolly along the POV camera's local forward (-Z) axis,
// in world units. Positive = closer to the subject. Lets us tweak framing
// without re-exporting the GLB.
const ZONE_DOLLY: Partial<Record<Zone, number>> = {
  laptop: 0.02,
};

// Per-zone lateral shift along the POV camera's local right (+X) axis,
// in world units. Positive = slide right, negative = slide left.
const ZONE_SHIFT_RIGHT: Partial<Record<Zone, number>> = {
  arcade: 0.015,
};

interface ZonePose {
  pos: Vector3;
  quat: Quaternion;
  fov: number | null;
}

function resolveZonePose(
  zone: Zone,
  objects: Record<string, Object3D>
): ZonePose | null {
  const name = ZONE_POV[zone];
  const cam = objects[name];
  if (!cam) return null;

  const pos = cam.getWorldPosition(new Vector3());
  const quat = cam.getWorldQuaternion(new Quaternion());
  const fov = (cam as PerspectiveCameraImpl).isPerspectiveCamera
    ? (cam as PerspectiveCameraImpl).fov
    : null;

  const dolly = ZONE_DOLLY[zone];
  if (dolly) {
    // Camera looks down -Z in three.js. World-space forward = quat * (0,0,-1).
    const forward = new Vector3(0, 0, -1).applyQuaternion(quat);
    pos.addScaledVector(forward, dolly);
  }

  const shiftRight = ZONE_SHIFT_RIGHT[zone];
  if (shiftRight) {
    // Camera's local right axis in world space = quat * (1,0,0).
    const right = new Vector3(1, 0, 0).applyQuaternion(quat);
    pos.addScaledVector(right, shiftRight);
  }

  return { pos, quat, fov };
}

export function tweenCameraToZone(zone: Zone) {
  const { objects, setZone, zone: currentZone } = useSceneStore.getState();
  const pivot = objects[BLENDER_NAMES.CAMERA_PIVOT];
  if (!pivot) return;

  const pose = resolveZonePose(zone, objects);
  if (!pose) return;

  // No sound on a no-op transition (same zone). Leaving any zone plays
  // zoom-out; entering any screen plays a quieter zoom-in; monitor and
  // laptop additionally layer the "loading" cue (they open into
  // OS/terminal interfaces) on top of the zoom.
  if (currentZone !== zone) {
    if (zone === "room") {
      playSfx(SFX.zoomOut, 0.6);
    } else {
      playSfx(SFX.zoomIn, 0.25);
      if (zone === "monitor" || zone === "laptop") {
        // Managed playback — the destination screen stops this when
        // its boot animation finishes (see SwanOS/TerminalOS).
        startLoadingSfx(0.3);
      }
    }
  }

  setZone(zone);

  gsap.to(pivot.position, {
    x: pose.pos.x,
    y: pose.pos.y,
    z: pose.pos.z,
    duration: TWEEN_DURATION,
    ease: EASE,
  });

  const startQuat = pivot.quaternion.clone();
  const progress = { t: 0 };
  gsap.to(progress, {
    t: 1,
    duration: TWEEN_DURATION,
    ease: EASE,
    onUpdate: () => {
      pivot.quaternion.slerpQuaternions(startQuat, pose.quat, progress.t);
    },
  });

  if (pose.fov != null) {
    const r3f = (window as unknown as { __r3fState?: { camera?: unknown } })
      .__r3fState;
    const renderCam = r3f?.camera as PerspectiveCameraImpl | undefined;
    if (renderCam?.isPerspectiveCamera) {
      gsap.to(renderCam, {
        fov: pose.fov,
        duration: TWEEN_DURATION,
        ease: EASE,
        onUpdate: () => renderCam.updateProjectionMatrix(),
      });
    }
  }
}

/**
 * Fire an ephemeral full-screen CSS "glitch" transition.
 * Used only for the laptop transition per the user's brief.
 */
export function playGlitchTransition() {
  document.body.classList.add("glitch-transition");
  setTimeout(() => {
    document.body.classList.remove("glitch-transition");
  }, TWEEN_DURATION * 1000);
}
