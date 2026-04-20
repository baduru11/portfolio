"use client";

interface AsciiTextProps {
  lines: string[];
  className?: string;
  perLineDelayMs?: number;
  baseDelayMs?: number;
}

export function AsciiText({
  lines,
  className = "ascii-art",
  perLineDelayMs = 40,
  baseDelayMs = 0,
}: AsciiTextProps) {
  return (
    <pre className={className} aria-hidden>
      {lines.map((line, idx) => (
        <div
          key={idx}
          className="ascii-line"
          style={{ animationDelay: `${baseDelayMs + idx * perLineDelayMs}ms` }}
        >
          {line || "\u00A0"}
        </div>
      ))}
    </pre>
  );
}
