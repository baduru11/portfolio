"use client";

import { useEffect } from "react";
import { findProject, type Project } from "../data/projects";
import { Pill } from "./Pill";

interface ProjectModalProps {
  projectId: string;
  onClose: () => void;
}

function slug(p: Project): string {
  return p.name.toLowerCase().replace(/\s+/g, "-");
}

export function ProjectModal({ projectId, onClose }: ProjectModalProps) {
  const project = findProject(projectId);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  if (!project) return null;
  const id = slug(project);

  return (
    <div
      className="pm-backdrop"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="pm-card" onClick={(e) => e.stopPropagation()}>
        <div className="pm-bar">
          <span className="pm-bar-tag">[ MANPAGE ]</span>
          <span className="pm-bar-path">~/duru/projects/{id}</span>
          <span className="pm-bar-spacer" />
          <button type="button" className="pm-close" onClick={onClose}>
            <span className="pm-close-x">✕</span> close
          </button>
        </div>

        <div className="pm-scroll">
          <header className="pm-hero">
            <div className="pm-hero-num">{project.num}</div>
            <div className="pm-hero-rail" aria-hidden />
            <div className="pm-hero-body">
              <div className="pm-hero-titleline">
                <h2 className="pm-hero-name">{project.name}</h2>
                {project.award && (
                  <span className="pm-hero-star" title={project.award}>★</span>
                )}
              </div>
              <div className="pm-hero-tagline">{project.tagline}</div>
              <div className="pm-hero-tags">
                {project.tags.map((t) => (
                  <Pill key={t}>{t}</Pill>
                ))}
              </div>
            </div>
          </header>

          <section className="pm-section">
            <div className="pm-section-title">
              <span className="pm-arrow">▸</span> DESCRIPTION
            </div>
            <p className="pm-prose">{project.description}</p>
          </section>

          <section className="pm-section">
            <div className="pm-section-title">
              <span className="pm-arrow">▸</span> STACK
              <span className="pm-section-meta">{project.stack.length} items</span>
            </div>
            <div className="pm-stack-grid">
              {project.stack.map((s) => (
                <span key={s} className="pm-stack-chip">{s}</span>
              ))}
            </div>
          </section>

          {project.award && (
            <section className="pm-section">
              <div className="pm-section-title">
                <span className="pm-arrow">▸</span> AWARDS
              </div>
              <div className="pm-award">
                <span className="pm-award-star">★</span>
                <span>{project.award}</span>
              </div>
            </section>
          )}

          {(project.github || project.liveUrl) && (
            <section className="pm-section">
              <div className="pm-section-title">
                <span className="pm-arrow">▸</span> LINKS
              </div>
              <div className="pm-links">
                {project.github && (
                  <a
                    className="pm-link"
                    href={project.github}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    <span className="pm-link-icon" aria-hidden>
                      <svg viewBox="0 0 24 24" width="36" height="36" fill="currentColor">
                        <path d="M12 .5C5.65.5.5 5.65.5 12a11.5 11.5 0 0 0 7.86 10.92c.57.1.78-.25.78-.55v-1.94c-3.2.69-3.87-1.54-3.87-1.54-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.76 2.68 1.25 3.33.96.1-.74.4-1.25.72-1.54-2.55-.29-5.23-1.28-5.23-5.69 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.15 1.18a11 11 0 0 1 5.73 0c2.19-1.49 3.15-1.18 3.15-1.18.62 1.58.23 2.75.11 3.04.73.81 1.18 1.83 1.18 3.09 0 4.42-2.69 5.39-5.25 5.67.41.36.78 1.05.78 2.12v3.14c0 .3.21.66.79.55A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z"/>
                      </svg>
                    </span>
                    <span className="pm-link-label">
                      {project.github.replace(/^https?:\/\//, "")}
                    </span>
                    <span className="pm-link-arrow">→</span>
                  </a>
                )}
                {project.liveUrl && (
                  <a
                    className="pm-link"
                    href={project.liveUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    <span className="pm-link-icon" aria-hidden>
                      <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 3h6v6" />
                        <path d="M10 14 21 3" />
                        <path d="M19 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6" />
                      </svg>
                    </span>
                    <span className="pm-link-label">
                      {project.liveUrl.replace(/^https?:\/\//, "")}
                    </span>
                    <span className="pm-link-arrow">→</span>
                  </a>
                )}
              </div>
            </section>
          )}

          <footer className="pm-foot">
            <span>DURU 1.0</span>
            <span className="pm-foot-dot">·</span>
            <span>{new Date().toISOString().slice(0, 10)}</span>
            <span className="pm-foot-dot">·</span>
            <span>{id.toUpperCase()}({project.num})</span>
          </footer>
        </div>
      </div>
    </div>
  );
}
