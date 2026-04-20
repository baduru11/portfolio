/**
 * Single source of truth for object/material names authored in Blender.
 * These names must exactly match what's in portfolio_room.glb — edit both
 * together if you rename anything in Blender.
 */

export const BLENDER_NAMES = {
  // Camera rig
  CAMERA_PIVOT: "Camera_Pivot",
  CAMERA_HOME: "Camera_Home",

  // Interactive screens (meshes)
  MONITOR_SCREEN: "Monitor_Screen",
  LAPTOP_SCREEN: "Laptop_Screen",
  ARCADE_SCREEN: "Arcade_Screen",

  // Camera target empties (legacy fallback for position-only tweens)
  MONITOR_CAMERA_TARGET: "Monitor_Camera_Target",
  LAPTOP_CAMERA_TARGET: "Laptop_Camera_Target",
  ARCADE_CAMERA_TARGET: "Arcade_Camera_Target",

  // POV cameras authored in Blender. Full world pose + FOV are mirrored onto
  // the render camera, so Numpad 0 in Blender == what the web shows per zone.
  POV_HOME: "POV_Home",
  POV_MONITOR: "POV_Monitor",
  POV_LAPTOP: "POV_Laptop",
  POV_ARCADE: "POV_Arcade",
  POV_TURNTABLE: "POV_Turntable",

  // Turntable click-ancestry roots. A click on any descendant of these names
  // (platter, tonearm, slipmat, deck base, etc.) resolves to the turntable zone.
  TURNTABLE_ROOT: "turntable",
  TURNTABLE_ROOT_ALT: "platine1",
} as const;

/**
 * Material names. Each screen has its own material so we can animate them
 * independently (flicker, brightness, etc) without affecting the bezels.
 */
export const BLENDER_MATERIALS = {
  MONITOR_SCREEN: "Mat_MonitorScreen",
  LAPTOP_SCREEN: "ComputerScreen",
  ARCADE_SCREEN: "Mat_ArcadeScreen.001",
  HEX_FLICKER: "Mat_HexFlicker",
} as const;

/** Possible UI states. */
export type Zone = "room" | "monitor" | "laptop" | "arcade" | "turntable";
