"use client";

import { useMemo } from "react";
import { Html } from "@react-three/drei";
import { Matrix4, Quaternion, Vector3, type Mesh } from "three";
import { useSceneStore } from "@/scene/useSceneStore";
import { BLENDER_NAMES } from "@/lib/constants";

interface ScreenHtmlProps {
  screenName: string;
  active: boolean;
  pixelWidth: number;
  pixelHeight: number;
  /**
   * Fraction of the screen mesh's width/height that the visible display area
   * actually occupies (the rest is bezel). E.g. 0.85 means the Html plane
   * covers 85% of the mesh, leaving a 7.5% bezel on each side. Defaults to 1.0.
   */
  inset?: number;
  /** CSS border-radius on the screen wrapper (for screens with rounded corners). */
  borderRadius?: number | string;
  /**
   * Explicit world-space pose override. Use this for complex meshes where
   * PCA over all vertices overshoots the visible display area (e.g. laptop
   * meshes that include the lid back, camera notches, or thick bezels).
   * Coordinates are in Three.js Y-up world space.
   */
  overridePose?: {
    center: [number, number, number];
    normal: [number, number, number];
    width: number;
    height: number;
    /** In-plane "up" axis. Default world-up (0,1,0); required for tilted screens. */
    up?: [number, number, number];
  };
  /**
   * If true, keep the <Html> portal mounted across active toggles and just
   * hide it when inactive. Use for overlays whose unmount/remount cycle
   * triggers drei portal races (laptop). Children must gate their own work
   * on the same `active` signal so they don't run when hidden.
   */
  keepMounted?: boolean;
  children: React.ReactNode;
}

interface ScreenPose {
  position: Vector3;
  quaternion: Quaternion;
  scale: Vector3;
}

// Compute world position + quaternion + scale that makes an Html plane
// match a screen mesh's physical extent and face the viewer.
function computeScreenPose(
  screen: Mesh,
  viewerPos: Vector3,
  pixelWidth: number,
  pixelHeight: number,
  inset: number
): ScreenPose {
  screen.updateWorldMatrix(true, false);
  screen.geometry.computeBoundingBox();

  const pos = screen.geometry.attributes.position;
  const pts: Vector3[] = [];
  for (let i = 0; i < pos.count; i++) {
    pts.push(new Vector3().fromBufferAttribute(pos, i).applyMatrix4(screen.matrixWorld));
  }
  const center = pts
    .reduce((a, v) => a.add(v), new Vector3())
    .divideScalar(pts.length);

  // Inline PCA on the 3x3 covariance of centered points to find the plane normal
  // (smallest eigenvector) and two in-plane axes. Small loop is fine for ≤20 verts.
  let cxx = 0, cxy = 0, cxz = 0, cyy = 0, cyz = 0, czz = 0;
  for (const v of pts) {
    const dx = v.x - center.x, dy = v.y - center.y, dz = v.z - center.z;
    cxx += dx * dx; cxy += dx * dy; cxz += dx * dz;
    cyy += dy * dy; cyz += dy * dz; czz += dz * dz;
  }
  // Jacobi eigen-decomposition of 3x3 symmetric matrix
  const A = [
    [cxx, cxy, cxz],
    [cxy, cyy, cyz],
    [cxz, cyz, czz],
  ];
  const V = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  for (let sweep = 0; sweep < 20; sweep++) {
    const off = Math.abs(A[0][1]) + Math.abs(A[0][2]) + Math.abs(A[1][2]);
    if (off < 1e-12) break;
    for (let p = 0; p < 2; p++) {
      for (let q = p + 1; q < 3; q++) {
        const apq = A[p][q];
        if (Math.abs(apq) < 1e-12) continue;
        const theta = (A[q][q] - A[p][p]) / (2 * apq);
        const t = theta >= 0
          ? 1 / (theta + Math.sqrt(1 + theta * theta))
          : 1 / (theta - Math.sqrt(1 + theta * theta));
        const c = 1 / Math.sqrt(1 + t * t);
        const s = t * c;
        const tau = s / (1 + c);
        A[p][p] -= t * apq;
        A[q][q] += t * apq;
        A[p][q] = 0;
        A[q][p] = 0;
        for (let i = 0; i < 3; i++) {
          if (i !== p && i !== q) {
            const aip = A[i][p];
            const aiq = A[i][q];
            A[i][p] = aip - s * (aiq + tau * aip);
            A[p][i] = A[i][p];
            A[i][q] = aiq + s * (aip - tau * aiq);
            A[q][i] = A[i][q];
          }
          const vip = V[i][p];
          const viq = V[i][q];
          V[i][p] = vip - s * (viq + tau * vip);
          V[i][q] = viq + s * (vip - tau * viq);
        }
      }
    }
  }
  const evals = [A[0][0], A[1][1], A[2][2]];
  const order = [0, 1, 2].sort((a, b) => evals[a] - evals[b]);
  const normal = new Vector3(V[0][order[0]], V[1][order[0]], V[2][order[0]]).normalize();
  const axisV = new Vector3(V[0][order[1]], V[1][order[1]], V[2][order[1]]).normalize();
  const axisH = new Vector3(V[0][order[2]], V[1][order[2]], V[2][order[2]]).normalize();

  // Project points onto in-plane axes to get physical extents
  let hMin = Infinity, hMax = -Infinity, vMin = Infinity, vMax = -Infinity;
  for (const v of pts) {
    const d = v.clone().sub(center);
    const h = d.dot(axisH);
    const vd = d.dot(axisV);
    if (h < hMin) hMin = h;
    if (h > hMax) hMax = h;
    if (vd < vMin) vMin = vd;
    if (vd > vMax) vMax = vd;
  }
  const worldWidth = (hMax - hMin) * inset;
  const worldHeight = (vMax - vMin) * inset;

  // Flip normal to face the viewer (camera-home side)
  const toViewer = viewerPos.clone().sub(center).normalize();
  if (normal.dot(toViewer) < 0) normal.negate();

  // Orient Html so its local +Z faces the viewer. lookAt produces a matrix
  // where -Z points from eye to target; we invert by placing eye at center+normal
  // and target at center, so local -Z points back into the screen.
  const eye = center.clone().add(normal);
  const worldUp = Math.abs(axisV.y) > 0.5 ? new Vector3(0, 1, 0) : axisV;
  const m = new Matrix4().lookAt(eye, center, worldUp);
  const quaternion = new Quaternion().setFromRotationMatrix(m);

  // drei's <Html transform> renders world_size = DOM_px * (distanceFactor/400) * scale.
  // With distanceFactor=10 (default), the inherent factor is 10/400 = 0.025, so to
  // convert world-meters-per-pixel into the scale prop, multiply by 40.
  // Uniform scale chosen on X (aspect ratios of DOM and world are matched via
  // the pixelWidth/pixelHeight we request in Room.tsx).
  const DREI_DEFAULT_FACTOR = 10;
  const ratio = DREI_DEFAULT_FACTOR / 400;
  const s = worldWidth / (pixelWidth * ratio);
  const scale = new Vector3(s, s, s);

  // Nudge slightly forward along normal to avoid z-fighting with the mesh
  const position = center.add(normal.clone().multiplyScalar(0.001));

  return { position, quaternion, scale };
}

function computePoseFromOverride(
  override: NonNullable<ScreenHtmlProps["overridePose"]>,
  pixelWidth: number,
  pixelHeight: number,
  inset: number
): ScreenPose {
  const center = new Vector3(...override.center);
  const normal = new Vector3(...override.normal).normalize();
  const worldWidth = override.width * inset;
  const worldHeight = override.height * inset;

  const eye = center.clone().add(normal);
  const up = override.up ? new Vector3(...override.up).normalize() : new Vector3(0, 1, 0);
  const m = new Matrix4().lookAt(eye, center, up);
  const quaternion = new Quaternion().setFromRotationMatrix(m);

  // Non-uniform scale so the Html plane matches world width AND world height,
  // regardless of DOM aspect ratio. (Text gets visually stretched if DOM
  // aspect differs from world aspect — keep them close for readability.)
  const ratio = 10 / 400;
  const sx = worldWidth / (pixelWidth * ratio);
  const sy = worldHeight / (pixelHeight * ratio);
  const scale = new Vector3(sx, sy, Math.min(sx, sy));
  const position = center.add(normal.clone().multiplyScalar(0.001));

  return { position, quaternion, scale };
}

export function ScreenHtml({
  screenName,
  active,
  pixelWidth,
  pixelHeight,
  inset = 1.0,
  borderRadius,
  overridePose,
  keepMounted = false,
  children,
}: ScreenHtmlProps) {
  const screen = useSceneStore((s) => s.objects[screenName]);
  const viewerAnchor = useSceneStore(
    (s) =>
      s.objects[BLENDER_NAMES.CAMERA_HOME] ?? s.objects[BLENDER_NAMES.POV_HOME]
  );

  const pose = useMemo(() => {
    if (overridePose) {
      return computePoseFromOverride(overridePose, pixelWidth, pixelHeight, inset);
    }
    if (!screen || !viewerAnchor) return null;
    return computeScreenPose(
      screen as Mesh,
      viewerAnchor.getWorldPosition(new Vector3()),
      pixelWidth,
      pixelHeight,
      inset
    );
  }, [screen, viewerAnchor, pixelWidth, pixelHeight, inset, overridePose]);

  if (!pose) return null;
  if (!keepMounted && !active) return null;

  return (
    <Html
      transform
      occlude={false}
      position={pose.position}
      quaternion={pose.quaternion}
      scale={pose.scale}
      pointerEvents={active ? "auto" : "none"}
      zIndexRange={[100, 0]}
    >
      <div
        style={{
          width: pixelWidth,
          height: pixelHeight,
          overflow: "hidden",
          background: "#000",
          borderRadius,
          visibility: active ? "visible" : "hidden",
        }}
      >
        {children}
      </div>
    </Html>
  );
}
