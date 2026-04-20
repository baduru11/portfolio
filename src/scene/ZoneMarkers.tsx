"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { Box3, Group, Vector3 } from "three";
import { useSceneStore } from "@/scene/useSceneStore";
import { BLENDER_NAMES } from "@/lib/constants";

/**
 * Floating 3D markers above each clickable zone in the room camera.
 * A small cone (pointing down) spins continuously on its local Y
 * axis, and a text label sits above it. Rendered only while
 * `zone === "room"` — hidden the moment the user zooms in.
 *
 * Position comes from the target object's world-space bounding box
 * top (plus a per-zone offset), so the markers follow whatever the
 * GLB authored.
 */

interface MarkerSpec {
  objectName: string;
  label: string;
  yOffset: number; // world units above the object's top
  // Optional extra offset in world XZ. Use to pull a marker off the
  // screen plane and closer to the room camera (monitor faces +Z, so
  // +zOffset pulls toward the sofa / camera).
  xOffset?: number;
  zOffset?: number;
}

const MARKERS: readonly MarkerSpec[] = [
  { objectName: BLENDER_NAMES.MONITOR_SCREEN, label: "ABOUT ME", yOffset: 0.01, zOffset: 0.22 },
  { objectName: BLENDER_NAMES.LAPTOP_SCREEN, label: "PROJECTS", yOffset: 0.08 },
  { objectName: BLENDER_NAMES.ARCADE_SCREEN, label: "GAMES", yOffset: 0.22, xOffset: 0.18, zOffset: 0.4 },
  { objectName: BLENDER_NAMES.TURNTABLE_ROOT_ALT, label: "MUSIC", yOffset: 0.07 },
];

const SPIN_SPEED = 1.6; // rad/s
const BOB_AMPLITUDE = 0.008; // world units
const BOB_PERIOD = 2.2; // seconds
const ACCENT = "#ffffff";

function ZoneMarker({ objectName, label, yOffset, xOffset = 0, zOffset = 0 }: MarkerSpec) {
  const obj = useSceneStore((s) => s.objects[objectName]);
  // Outer group = position + bob (no rotation, keeps the label static).
  // Inner group = pure Y-axis spin (cone only).
  const outerRef = useRef<Group>(null);
  const spinRef = useRef<Group>(null);
  const [anchor, setAnchor] = useState<Vector3 | null>(null);
  const phase = useMemo(() => Math.random() * Math.PI * 2, []);

  useEffect(() => {
    if (!obj) return;
    obj.updateWorldMatrix(true, true);
    const box = new Box3().setFromObject(obj);
    const c = box.getCenter(new Vector3());
    c.x += xOffset;
    c.y = box.max.y + yOffset;
    c.z += zOffset;
    setAnchor(c);
  }, [obj, yOffset, xOffset, zOffset]);

  useFrame((state, dt) => {
    if (!outerRef.current || !anchor) return;
    outerRef.current.position.y =
      anchor.y + Math.sin(state.clock.elapsedTime / BOB_PERIOD * Math.PI * 2 + phase) * BOB_AMPLITUDE;
    if (spinRef.current) spinRef.current.rotation.y += dt * SPIN_SPEED;
  });

  if (!anchor) return null;

  return (
    <group ref={outerRef} position={[anchor.x, anchor.y, anchor.z]}>
      {/* Spinning cone. Default ConeGeometry tip is at +Y; flipping on
          X puts the tip at -Y, aimed at the clickable mesh. */}
      <group ref={spinRef}>
        <mesh rotation={[Math.PI, 0, 0]} castShadow={false}>
          <coneGeometry args={[0.032, 0.085, 12]} />
          <meshStandardMaterial
            color={ACCENT}
            emissive={ACCENT}
            emissiveIntensity={0.6}
            metalness={0.3}
            roughness={0.35}
            transparent
            opacity={0.7}
          />
        </mesh>
      </group>
      <Text
        position={[0, 0.085, 0]}
        font="/fonts/JetBrainsMono-Regular.ttf"
        fontSize={0.04}
        color={ACCENT}
        anchorX="center"
        anchorY="bottom"
        letterSpacing={0.08}
        fillOpacity={0.7}
      >
        {label}
      </Text>
    </group>
  );
}

export function ZoneMarkers() {
  const zone = useSceneStore((s) => s.zone);
  if (zone !== "room") return null;
  return (
    <>
      {MARKERS.map((m) => (
        <ZoneMarker key={m.objectName} {...m} />
      ))}
    </>
  );
}
