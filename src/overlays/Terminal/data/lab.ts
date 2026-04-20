export type LabKind = "WIP" | "IDEA";

export interface LabEntry {
  kind: LabKind;
  name: string;
  blurb: string;
}

export const LAB_ENTRIES: LabEntry[] = [
  {
    kind: "WIP",
    name: "SEUNGWAN.DEV",
    blurb: "this very site — 3D cyberpunk portfolio · Three.js · Blender · R3F",
  },
  {
    kind: "WIP",
    name: "CLE PLATFORM v2",
    blurb: "ongoing — AI teaching assistant for HKUST language instructors",
  },
  {
    kind: "IDEA",
    name: "Contextual Bandit Adapter",
    blurb: "Adaptive difficulty for language learning via PyTorch",
  },
];
