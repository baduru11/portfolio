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
        "fixed top-4 left-4 z-50 group",
        "inline-flex items-center gap-2.5",
        "h-9 pl-2 pr-3 rounded-full",
        "font-mono text-[11px] tracking-[0.22em] uppercase leading-none",
        "bg-black/55 border border-pink-500/30 backdrop-blur-md",
        "text-pink-200/90 hover:text-pink-50",
        "hover:border-pink-400/70 hover:bg-black/70",
        "shadow-[0_2px_12px_-4px_rgba(0,0,0,0.6)]",
        "transition-colors duration-150",
      ].join(" ")}
    >
      <span
        className={[
          "inline-flex items-center justify-center",
          "w-6 h-6 rounded-full",
          "border border-pink-500/45 text-pink-300",
          "text-[12px] leading-none",
          "transition-transform duration-150 group-hover:-translate-x-0.5",
        ].join(" ")}
        aria-hidden
      >
        ←
      </span>
      <span className="pb-px">Back</span>
      <span
        className={[
          "ml-1 pl-2 py-0.5",
          "border-l border-pink-500/25",
          "text-[9px] tracking-[0.2em] opacity-60",
        ].join(" ")}
      >
        ESC
      </span>
    </button>
  );
}
