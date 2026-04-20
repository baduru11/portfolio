"use client";

/**
 * CRT-style effects for the arcade overlay. Layered CSS:
 *   - scanlines (repeating horizontal gradient)
 *   - vignette (radial fade to black at edges)
 *   - phosphor glow on descendant text (via .crt-glow helper class)
 *   - ambient flicker (subtle opacity wobble)
 *
 * Wrap arcade UI with this; apply `className="crt-glow"` to any text
 * you want phosphor-glowing.
 */
export function CRTEffects({ children }: { children: React.ReactNode }) {
  return (
    <div className="crt-root">
      <div className="crt-content">{children}</div>
      <div className="crt-scanlines" aria-hidden />
      <div className="crt-vignette" aria-hidden />
      <style jsx>{`
        .crt-root {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
          background: #000;
          animation: crtAmbientFlicker 6s steps(1) infinite;
        }
        .crt-content {
          position: absolute;
          inset: 0;
          z-index: 1;
        }
        .crt-scanlines {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: repeating-linear-gradient(
            0deg,
            rgba(0, 0, 0, 0.35) 0px,
            rgba(0, 0, 0, 0.35) 1px,
            rgba(0, 0, 0, 0) 1px,
            rgba(0, 0, 0, 0) 3px
          );
          z-index: 2;
          mix-blend-mode: multiply;
        }
        .crt-vignette {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: radial-gradient(
            ellipse at center,
            transparent 45%,
            rgba(0, 0, 0, 0.35) 80%,
            rgba(0, 0, 0, 0.7) 100%
          );
          z-index: 3;
        }
        @keyframes crtAmbientFlicker {
          0%, 100% { filter: brightness(1); }
          5%       { filter: brightness(0.97); }
          6%       { filter: brightness(1.02); }
          40%      { filter: brightness(1); }
          42%      { filter: brightness(0.92); }
          43%      { filter: brightness(1); }
          80%      { filter: brightness(0.98); }
          81%      { filter: brightness(1.04); }
          82%      { filter: brightness(1); }
        }
      `}</style>
      <style jsx global>{`
        .crt-glow {
          text-shadow:
            0 0 2px currentColor,
            0 0 6px currentColor,
            0 0 12px currentColor;
        }
      `}</style>
    </div>
  );
}
