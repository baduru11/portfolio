"use client";

import { useEffect } from "react";

const SEQUENCE: string[] = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
];

export function useKonamiCode(active: boolean, onTrigger: () => void): void {
  useEffect(() => {
    if (!active) return;
    let pos = 0;
    const handler = (e: KeyboardEvent) => {
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      const expected = SEQUENCE[pos];
      if (key === expected || (expected.length === 1 && key === expected.toLowerCase())) {
        pos += 1;
        if (pos === SEQUENCE.length) {
          pos = 0;
          onTrigger();
        }
      } else {
        pos = key === SEQUENCE[0] ? 1 : 0;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [active, onTrigger]);
}
