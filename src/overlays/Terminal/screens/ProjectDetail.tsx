"use client";

import type { Project } from "../data/projects";

interface ProjectDetailProps {
  project: Project;
  onBack: () => void;
  closing?: boolean;
}

function manName(p: Project): string {
  return p.name.toLowerCase().replace(/\s+/g, "-");
}

export function ProjectDetail({ project, onBack, closing }: ProjectDetailProps) {
  const id = manName(project);
  return (
    <aside className={`project-detail manpage ${closing ? "closing" : ""}`}>
      <button type="button" className="pd-back" onClick={onBack}>
        ← projects
      </button>

      <div className="man-head">
        <span className="man-head-l">{id.toUpperCase()}({project.num})</span>
        <span className="man-head-c">DURU TERMINAL MANUAL</span>
        <span className="man-head-r">{id.toUpperCase()}({project.num})</span>
      </div>

      <section className="man-section">
        <div className="man-title">NAME</div>
        <div className="man-body">
          <span className="hl">{id}</span> — {project.tagline}
        </div>
      </section>

      <section className="man-section">
        <div className="man-title">SYNOPSIS</div>
        <div className="man-body">
          {project.tags.map((t, i) => (
            <span key={t}>
              {i > 0 && " "}
              <span className="kw">{t.replace(/^#/, "")}</span>
            </span>
          ))}
        </div>
      </section>

      <section className="man-section">
        <div className="man-title">DESCRIPTION</div>
        <div className="man-body wrap">{project.description}</div>
      </section>

      <section className="man-section">
        <div className="man-title">STACK</div>
        <div className="man-body">
          {project.stack.map((s, i) => (
            <span key={s}>
              {i > 0 && <span className="man-dim"> · </span>}
              {s}
            </span>
          ))}
        </div>
      </section>

      {project.award && (
        <section className="man-section">
          <div className="man-title">AWARDS</div>
          <div className="man-body">
            <span className="man-star">★</span> {project.award}
          </div>
        </section>
      )}

      {(project.github || project.liveUrl) && (
        <section className="man-section">
          <div className="man-title">SEE ALSO</div>
          <div className="man-body man-links">
            {project.github && (
              <a
                className="man-link"
                href={project.github}
                target="_blank"
                rel="noreferrer noopener"
              >
                {project.github.replace(/^https?:\/\//, "")}
              </a>
            )}
            {project.liveUrl && (
              <a
                className="man-link"
                href={project.liveUrl}
                target="_blank"
                rel="noreferrer noopener"
              >
                {project.liveUrl.replace(/^https?:\/\//, "")}
              </a>
            )}
          </div>
        </section>
      )}

      <div className="man-foot">
        DURU 1.0 · {new Date().toISOString().slice(0, 10)} · {id.toUpperCase()}({project.num})
      </div>
    </aside>
  );
}
