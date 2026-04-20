"use client";

import { SKILL_GROUPS } from "../data/skills";
import { SkillIcon } from "../widgets/SkillIcon";

export function SkillsScreen() {
  let runningDelay = 0;

  return (
    <div className="skills-stage">
      <div className="skills-cmdline">
        <span className="prompt">›</span>
        <span className="cmd">cat ~/duru/.skills</span>
        <span className="meta">
          {SKILL_GROUPS.reduce((n, g) => n + g.items.length, 0)} entries
        </span>
      </div>

      {SKILL_GROUPS.map((g) => {
        const groupStart = runningDelay;
        runningDelay += g.items.length * 30 + 80;
        return (
          <section key={g.id} className="skill-group">
            <div className="skill-head">
              <span className="skill-bracket">[</span>
              <span className="skill-title">{g.title}</span>
              <span className="skill-bracket">]</span>
              <span className="skill-count">·  {g.items.length}</span>
            </div>
            <div className="skill-grid">
              {g.items.map((it, i) => (
                <span
                  key={it}
                  className={`skill-chip skill-chip-pop accent-${g.accent}`}
                  style={{ animationDelay: `${groupStart + i * 30}ms` }}
                >
                  <span className="skill-icon">
                    <SkillIcon name={it} />
                  </span>
                  <span className="skill-name">{it}</span>
                </span>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
