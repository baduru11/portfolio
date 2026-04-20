"use client";

import { LAB_ENTRIES } from "../data/lab";

export function LabScreen() {
  return (
    <div>
      <div className="lab-header">⚠ LAB — WORK IN PROGRESS</div>
      <div className="lab-sub">Things being built. No promises.</div>
      {LAB_ENTRIES.map((e, idx) => (
        <div
          key={idx}
          className="lab-entry"
          style={{ animationDelay: `${idx * 80}ms` }}
        >
          <span className="lab-tag">{e.kind}</span>
          <span className="lab-name">{e.name}</span>
          <div className="lab-blurb">{e.blurb}</div>
        </div>
      ))}
    </div>
  );
}
