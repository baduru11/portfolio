"use client";

import type { ReactNode } from "react";

export type PillTone = "blue" | "mauve" | "teal" | "yellow" | "pink";

interface PillProps {
  tone?: PillTone;
  children: ReactNode;
  pop?: boolean;
  delayMs?: number;
}

export function Pill({ tone, children, pop, delayMs }: PillProps) {
  const cls = ["pill"];
  if (tone) cls.push(`tag-${tone}`);
  if (pop) cls.push("pop");
  return (
    <span
      className={cls.join(" ")}
      style={delayMs ? { animationDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </span>
  );
}
