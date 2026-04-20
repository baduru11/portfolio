"use client";

import { useEffect, useState } from "react";
import { useTerminalState, type Route } from "../hooks/useTerminalState";
import { findProject } from "../data/projects";

interface Crumb {
  label: string;
  route?: Route;
}

function buildCrumbs(route: Route): Crumb[] {
  const base: Crumb = { label: "~/duru", route: { kind: "home" } };
  switch (route.kind) {
    case "home":
      return [{ ...base, route: undefined }];
    case "projects":
      return [base, { label: "projects" }];
    case "project": {
      const p = findProject(route.id);
      return [
        base,
        { label: "projects", route: { kind: "projects" } },
        { label: p ? p.name.toLowerCase().replace(/\s+/g, "-") : route.id },
      ];
    }
    case "skills":
      return [base, { label: "skills" }];
    case "lab":
      return [base, { label: "lab" }];
    case "whoami":
      return [base, { label: "whoami" }];
    case "contact":
      return [base, { label: "contact" }];
    case "help":
      return [base, { label: "help" }];
    case "matrix":
      return [base, { label: "matrix" }];
    case "hack":
      return [base, { label: `hack ${route.target}` }];
    case "panic":
      return [base, { label: "panic" }];
    case "game":
      return [base, { label: route.id }];
    case "konami":
      return [base, { label: "✦ konami ✦" }];
  }
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function Clock() {
  const [t, setT] = useState(() => new Date());
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    const id = window.setInterval(() => {
      setT(new Date());
      setFlash((f) => !f);
    }, 1000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <div className="topbar-clock">
      <div className="time">
        {pad(t.getHours())}
        <span className="colon" style={{ opacity: flash ? 1 : 0.25 }}>
          :
        </span>
        {pad(t.getMinutes())}
        <span className="colon" style={{ opacity: flash ? 0.25 : 1 }}>
          :
        </span>
        {pad(t.getSeconds())}
      </div>
      <div className="date">
        {t.getFullYear()}.{pad(t.getMonth() + 1)}.{pad(t.getDate())}
      </div>
    </div>
  );
}

interface TopbarProps {
  onNavigate: (route: Route) => void;
  onOpenPalette: () => void;
}

export function Topbar({ onNavigate, onOpenPalette }: TopbarProps) {
  const route = useTerminalState((s) => s.route);
  const crumbs = buildCrumbs(route);

  return (
    <header className="topbar">
      <div className="topbar-left">
        <span className="sys-pill">
          <span className="dot" />
          DURU·TERM
        </span>
        <nav className="breadcrumb" aria-label="breadcrumb">
          {crumbs.map((c, i) => {
            const isLast = i === crumbs.length - 1;
            return (
              <span
                key={`${c.label}-${i}`}
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                {c.route && !isLast ? (
                  <button
                    type="button"
                    className="seg enter"
                    onClick={() => c.route && onNavigate(c.route)}
                  >
                    {c.label}
                  </button>
                ) : (
                  <span className="seg current enter">{c.label}</span>
                )}
                {!isLast && <span className="sep">›</span>}
              </span>
            );
          })}
        </nav>
      </div>

      <div className="palette-btn-wrap">
        <button type="button" className="palette-btn" onClick={onOpenPalette}>
          <span className="kbd">⌘K</span> commands
        </button>
      </div>

      <div className="topbar-right">
        <Clock />
        <a
          className="icon-btn"
          href="https://github.com/baduru11"
          target="_blank"
          rel="noreferrer noopener"
          aria-label="GitHub"
          title="GitHub"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="currentColor"
            aria-hidden
          >
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2 .37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
          </svg>
        </a>
        <a
          className="icon-btn"
          href="https://www.linkedin.com/in/baduru/"
          target="_blank"
          rel="noreferrer noopener"
          aria-label="LinkedIn"
          title="LinkedIn"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="currentColor"
            aria-hidden
          >
            <path d="M14.4 0H1.6C.7 0 0 .7 0 1.6v12.8C0 15.3.7 16 1.6 16h12.8c.9 0 1.6-.7 1.6-1.6V1.6C16 .7 15.3 0 14.4 0zM4.8 13.6H2.4V6h2.4v7.6zM3.6 4.9c-.8 0-1.4-.6-1.4-1.4 0-.8.6-1.4 1.4-1.4.8 0 1.4.6 1.4 1.4 0 .8-.6 1.4-1.4 1.4zM13.6 13.6h-2.4V9.8c0-.9 0-2.1-1.3-2.1s-1.5 1-1.5 2v3.9H6V6h2.3v1h.1c.3-.6 1.1-1.3 2.3-1.3 2.5 0 2.9 1.6 2.9 3.7v4.2z" />
          </svg>
        </a>
      </div>
    </header>
  );
}
