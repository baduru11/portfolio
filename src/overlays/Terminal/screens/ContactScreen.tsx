"use client";

import { useEffect, useRef, useState } from "react";
import { WHOAMI } from "../data/whoami";

interface Line {
  p: string;
  label?: string;
  value: string;
  accent?: "mauve" | "blue" | "peach" | "green" | "yellow";
  url?: string;
  blink?: boolean;
}

function buildLines(): Line[] {
  const c = WHOAMI.contact;
  return [
    { p: "$", value: "./contact.sh --verbose", accent: "mauve" },
    { p: ">", label: "mail", value: c.email, accent: "blue", url: `mailto:${c.email}` },
    { p: ">", label: "github", value: c.github, accent: "blue", url: `https://${c.github}` },
    {
      p: ">",
      label: "linkedin",
      value: c.linkedin,
      accent: "blue",
      url: `https://${c.linkedin}`,
    },
    { p: ">", label: "phone", value: c.phone, accent: "blue" },
    { p: ">", label: "location", value: c.location, accent: "peach" },
    { p: ">", label: "status", value: c.status, accent: "green" },
    { p: "$", value: "_", blink: true },
  ];
}

export function ContactScreen() {
  const lines = buildLines();
  const [shown, setShown] = useState(0);
  const tailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (shown >= lines.length) return;
    const id = window.setTimeout(() => setShown((n) => n + 1), 220);
    return () => window.clearTimeout(id);
  }, [shown, lines.length]);

  // Keep the growing output visible as lines type in. The parent scroll-area
  // only auto-scrolls when a new output block is pushed; within one block,
  // we need to nudge it ourselves as content height grows.
  useEffect(() => {
    const el = tailRef.current;
    if (!el) return;
    const scroller = el.closest(".scroll-area") as HTMLElement | null;
    if (!scroller) {
      el.scrollIntoView({ block: "nearest", behavior: "smooth" });
      return;
    }
    // Scroll the scroller so the tail is visible near the bottom.
    const scrollerRect = scroller.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const delta = elRect.bottom - scrollerRect.bottom + 16;
    if (delta > 0) {
      scroller.scrollTo({
        top: scroller.scrollTop + delta,
        behavior: "smooth",
      });
    }
  }, [shown]);

  return (
    <div className="contact-stage">
      {lines.slice(0, shown + 1).map((l, i) => (
        <div
          key={i}
          className={`contact-line accent-${l.accent ?? "text"} ${l.url ? "clickable" : ""}`}
          onClick={() => l.url && window.open(l.url, "_blank", "noreferrer")}
          role={l.url ? "link" : undefined}
        >
          <span className="contact-prompt">{l.p}</span>
          {l.label && <span className="contact-label">{l.label}</span>}
          {l.label && <span className="contact-sep">·</span>}
          <span className="contact-value">
            {l.value}
            {l.blink && <span className="contact-caret">▮</span>}
          </span>
        </div>
      ))}
      <div ref={tailRef} aria-hidden />
    </div>
  );
}
