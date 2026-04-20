"use client";

import { useEffect, useRef } from "react";
import { useTerminalState } from "../hooks/useTerminalState";
import { OutputBlock } from "../widgets/OutputBlock";

export function MainArea() {
  const output = useTerminalState((s) => s.output);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Scroll so the TOP of the newest block is at the top of the viewport,
    // not the bottom. Otherwise tall outputs (e.g. projects table) land
    // showing the last row, which forces the user to scroll up to find #01.
    const blocks = el.querySelectorAll<HTMLElement>(".output-block");
    const last = blocks[blocks.length - 1];
    if (!last) return;
    el.scrollTo({ top: last.offsetTop - 8, behavior: "smooth" });
  }, [output.length]);

  return (
    <div className="main">
      <div className="scroll-area" ref={ref}>
        {output.map((entry) => (
          <OutputBlock
            key={entry.id}
            command={entry.command}
            ts={entry.ts}
          >
            {entry.view}
          </OutputBlock>
        ))}
      </div>
    </div>
  );
}
