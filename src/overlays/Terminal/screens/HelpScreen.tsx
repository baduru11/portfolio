"use client";

import { useTerminalState } from "../hooks/useTerminalState";

interface HelpRow {
  cmd: string;
  desc: string;
  unlock?: "konami";
}

interface HelpSection {
  title: string;
  rows: HelpRow[];
}

const SECTIONS: HelpSection[] = [
  {
    title: "NAVIGATE",
    rows: [
      { cmd: "projects", desc: "browse all projects" },
      { cmd: "project <name>", desc: "open a specific project" },
      { cmd: "skills", desc: "view skill chart" },
      { cmd: "lab", desc: "experimental work" },
      { cmd: "whoami", desc: "about me" },
      { cmd: "github", desc: "open github.com/baduru11" },
      { cmd: "contact", desc: "get in touch" },
    ],
  },
  {
    title: "GAMES & EASTER EGGS",
    rows: [
      { cmd: "breakout", desc: "play breakout" },
      { cmd: "pong", desc: "play pong" },
      { cmd: "matrix", desc: "fall down the rabbit hole" },
      { cmd: "hack <target>", desc: "trace · bypass · exfiltrate" },
      { cmd: "sudo rm -rf /", desc: "do not run this" },
      { cmd: "konami code", desc: "↑↑↓↓←→←→ B A — listens globally" },
      { cmd: "duru", desc: "✦ secret ✦", unlock: "konami" },
    ],
  },
  {
    title: "SYSTEM",
    rows: [
      { cmd: "clear", desc: "clear terminal" },
      { cmd: "help", desc: "show this message" },
    ],
  },
];

export function HelpScreen() {
  const konami = useTerminalState((s) => s.konamiUnlocked);

  let i = 0;
  let delay = 0;
  const stepRow = 22;
  const stepHeader = 60;

  return (
    <div className="help-block">
      {SECTIONS.map((section) => {
        const visible = section.rows.filter(
          (r) => !r.unlock || (r.unlock === "konami" && konami),
        );
        if (visible.length === 0) return null;

        const headerDelay = delay;
        delay += stepHeader;
        const ruleDelay = delay;
        delay += stepRow;

        return (
          <div key={section.title} className="help-section">
            <div
              className="help-section-title help-line"
              style={{ animationDelay: `${headerDelay}ms` }}
            >
              {section.title}
            </div>
            <div
              className="help-rule help-line"
              style={{ animationDelay: `${ruleDelay}ms` }}
            >
              ──────────────────────────────────────────
            </div>
            {visible.map((r) => {
              const rowDelay = delay;
              delay += stepRow;
              i += 1;
              return (
                <div
                  key={r.cmd}
                  className="help-row help-line"
                  style={{ animationDelay: `${rowDelay}ms` }}
                >
                  <span className="cmd">{r.cmd}</span>
                  <span className="desc">{r.desc}</span>
                </div>
              );
            })}
          </div>
        );
      })}
      <div
        className="help-tip help-line"
        style={{ animationDelay: `${delay + 80}ms` }}
      >
        TIP: ⌘K palette · ↑↓ history · tab autocomplete · esc exit
        {i ? "" : ""}
      </div>
    </div>
  );
}
