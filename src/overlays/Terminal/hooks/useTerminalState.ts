"use client";

import { create } from "zustand";
import type { ReactNode } from "react";
import type { ProjectId } from "../data/projects";

export type Route =
  | { kind: "home" }
  | { kind: "projects" }
  | { kind: "project"; id: ProjectId }
  | { kind: "skills" }
  | { kind: "lab" }
  | { kind: "whoami" }
  | { kind: "contact" }
  | { kind: "help" }
  | { kind: "matrix" }
  | { kind: "hack"; target: string }
  | { kind: "panic" }
  | { kind: "game"; id: "breakout" | "pong" }
  | { kind: "konami" };

export interface OutputEntry {
  id: string;
  command: string;
  view: ReactNode;
  ts: number;
}

interface TerminalState {
  route: Route;
  output: OutputEntry[];
  paletteOpen: boolean;
  konamiUnlocked: boolean;
  setRoute: (route: Route) => void;
  pushOutput: (entry: OutputEntry) => void;
  clearOutput: () => void;
  setPalette: (open: boolean) => void;
  unlockKonami: () => void;
}

let counter = 0;
export function nextEntryId(): string {
  counter += 1;
  return `out-${counter}-${Date.now().toString(36)}`;
}

export const useTerminalState = create<TerminalState>((set) => ({
  route: { kind: "home" },
  output: [],
  paletteOpen: false,
  konamiUnlocked: false,
  setRoute: (route) => set({ route }),
  pushOutput: (entry) => set((s) => ({ output: [...s.output, entry] })),
  clearOutput: () => set({ output: [] }),
  setPalette: (paletteOpen) => set({ paletteOpen }),
  unlockKonami: () => set({ konamiUnlocked: true }),
}));
