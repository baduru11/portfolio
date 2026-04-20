"use client";

/**
 * Plays a short CRT-style "power on" sequence then reveals children.
 * Implementation note: CSS `filter` on a CSS3D-transformed element can
 * cause browsers to drop back to 2D compositing for a frame, flashing the
 * element at its natural (viewport-sized) bounds. So we ONLY animate
 * opacity here — no filter, no backdrop-filter.
 */
export function ScreenBoot({ children }: { children: React.ReactNode }) {
  return (
    <div className="screen-boot">
      <div className="screen-boot-content">{children}</div>
      <div className="screen-boot-mask" aria-hidden />
      <style jsx>{`
        .screen-boot {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }
        .screen-boot-content {
          position: absolute;
          inset: 0;
          animation: crtFadeIn 500ms ease-out 200ms 1 both;
        }
        .screen-boot-mask {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: #000;
          animation: crtBlackMask 620ms steps(1) 1 both;
          z-index: 10;
        }
        @keyframes crtFadeIn {
          0%   { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes crtBlackMask {
          0%   { opacity: 1; background: #000; }
          20%  { opacity: 0.2; background: #fff; }
          22%  { opacity: 1; background: #000; }
          28%  { opacity: 0.3; background: #fff; }
          32%  { opacity: 1; background: #000; }
          55%  { opacity: 0.5; background: #000; }
          100% { opacity: 0; background: #000; }
        }
      `}</style>
    </div>
  );
}
