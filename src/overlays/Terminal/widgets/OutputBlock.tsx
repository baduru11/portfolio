"use client";

import type { ReactNode } from "react";

interface OutputBlockProps {
  command?: string;
  ts?: number;
  children: ReactNode;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function formatTs(ts: number): string {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function OutputBlock({ command, ts, children }: OutputBlockProps) {
  return (
    <div className="output-block">
      {command !== undefined && command.length > 0 && (
        <div className="output-echo">
          <span className="echo-text">
            <span className="prompt">›</span>
            {command}
          </span>
          {ts !== undefined && <span className="ts">{formatTs(ts)}</span>}
        </div>
      )}
      <div className="output-body">{children}</div>
    </div>
  );
}
