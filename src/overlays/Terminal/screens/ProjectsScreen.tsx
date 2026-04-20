"use client";

import { PROJECTS, type Project } from "../data/projects";
import { Pill } from "../widgets/Pill";
import { useTerminalState } from "../hooks/useTerminalState";

function deriveStatus(p: Project): string {
  const tags = p.tags.map((t) => t.replace(/^#/, "").toLowerCase());
  if (tags.includes("ongoing")) return "ONGOING";
  if (tags.includes("hackathon")) return "HACKATHON";
  if (tags.includes("desktop")) return "DESKTOP";
  if (tags.includes("devtools")) return "DEV-TOOLS";
  if (tags.includes("agents")) return "AGENTS";
  if (tags.includes("rag")) return "RAG";
  return "PROJECT";
}

export function ProjectsScreen() {
  const setRoute = useTerminalState((s) => s.setRoute);

  const open = (p: Project) => {
    setRoute({ kind: "project", id: p.id });
  };

  return (
    <div className="projects-stage">
      <div className="projects-cmdline">
        <span className="prompt">›</span>
        <span className="cmd">ls -la ~/duru/projects</span>
        <span className="meta">{PROJECTS.length} entries</span>
      </div>

      <div className="projects-list">
        {PROJECTS.map((p) => {
          const status = deriveStatus(p);
          return (
            <button
              key={p.id}
              className="project-card"
              type="button"
              onClick={() => open(p)}
              aria-label={`Open ${p.name}`}
            >
              <div className="pc-grid">
                <div className="pc-index">{p.num}</div>
                <div className="pc-rail" aria-hidden />
                <div className="pc-content">
                  <div className="pc-titleline">
                    <span className="pc-name">{p.name}</span>
                    <span className="pc-status">{status}</span>
                    <span className="pc-spacer" />
                    {p.award && <span className="pc-star" title={p.award}>★</span>}
                    <span className="pc-view">
                      open <span className="pc-arrow-tail">→</span>
                    </span>
                  </div>
                  <div className="pc-tagline">{p.tagline}</div>
                  <div className="pc-stackline">
                    <span className="pc-arrow">▸</span>
                    <span className="pc-stack">
                      {p.stack.slice(0, 6).join(" · ")}
                      {p.stack.length > 6 && (
                        <span className="pc-more"> +{p.stack.length - 6}</span>
                      )}
                    </span>
                  </div>
                  {p.award && (
                    <div className="pc-award">
                      <span className="pc-star inline">★</span> {p.award}
                    </div>
                  )}
                  <div className="pc-tags">
                    {p.tags.map((t) => (
                      <Pill key={t}>{t}</Pill>
                    ))}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="projects-help">
        <span className="prompt">›</span>{" "}
        Click a card to open · type{" "}
        <span className="kw">project &lt;name&gt;</span> to open by name
      </div>
    </div>
  );
}
