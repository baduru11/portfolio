"use client";

import { tweenCameraToZone } from "@/effects/transitions";

/**
 * Fixed top-left back control, visible in every zoomed zone. Clicking
 * it behaves identically to pressing ESC (which each zone handles in
 * its own keydown listener). Scene.tsx gates visibility on zone.
 */
export function BackButton() {
  return (
    <button
      type="button"
      onClick={() => tweenCameraToZone("room")}
      aria-label="Return to room"
      title="Return to room (ESC)"
      className={[
        "fixed top-4 left-4 z-50",
        "flex items-center gap-2",
        "pl-2.5 pr-3.5 py-1.5 rounded-full",
        "font-mono text-[11px] tracking-[0.3em] uppercase",
        "bg-black/55 border border-pink-500/30 backdrop-blur-md",
        "text-pink-200/85 hover:text-pink-100",
        "hover:border-pink-500/55 hover:bg-black/70",
        "transition",
      ].join(" ")}
    >
      <span
        className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-pink-500/45 text-pink-300 text-[10px] leading-none"
        aria-hidden
      >
        ←
      </span>
      <span>Back</span>
      <span className="opacity-55 text-[9px] tracking-[0.25em] border-l border-pink-500/25 pl-2 ml-0.5">
        ESC
      </span>
    </button>
  );
}
