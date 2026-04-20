"use client";

import { useEffect, useState } from "react";

interface KernelPanicProps {
  onExit: () => void;
}

const PANIC_TEXT = [
  "KERNEL PANIC — not syncing: VFS: Unable to mount root fs",
  "CPU: 0 PID: 1 Comm: swapper Tainted: G       D       6.6.0",
  "Hardware name: DURU/TERMINAL v1.0",
  "Call Trace:",
  "  <TASK>",
  "  ? __die+0x23/0x70",
  "  ? page_fault_oops+0x171/0x4e0",
  "  ? do_user_addr_fault+0x322/0x6c0",
  "  ? exc_page_fault+0x76/0x180",
  "  ? asm_exc_page_fault+0x26/0x30",
  "",
  "████ SYSTEM FAILURE ████",
  "",
  "Rebooting in 2 seconds...",
];

export function KernelPanic({ onExit }: KernelPanicProps) {
  const [phase, setPhase] = useState<"flash" | "panic">("flash");

  useEffect(() => {
    const t1 = window.setTimeout(() => setPhase("panic"), 90);
    const t2 = window.setTimeout(() => onExit(), 2200);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [onExit]);

  return (
    <>
      {phase === "flash" && <div className="panic-flash" />}
      <div className="panic-overlay">
        <div className="head">KERNEL PANIC</div>
        {PANIC_TEXT.map((line, i) => (
          <div key={i}>{line || "\u00A0"}</div>
        ))}
      </div>
    </>
  );
}
