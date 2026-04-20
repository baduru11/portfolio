"use client";

import { DuruLogo } from "../widgets/DuruLogo";

export function HomeScreen() {
  return (
    <div className="home-shell">
      <div className="home-logo">
        <DuruLogo />
      </div>
      <div className="home-info">
        <div className="header">
          <span className="at">seungwan</span>@<span className="host">hkust</span>
        </div>
        <div className="rule">───────────────────────────────</div>
        <div className="row">
          <span className="k">OS</span>
          <span className="v">DURU TERMINAL <span className="acc">v1.0</span></span>
        </div>
        <div className="row">
          <span className="k">Host</span>
          <span className="v">portfolio-room (3D)</span>
        </div>
        <div className="row">
          <span className="k">Kernel</span>
          <span className="v">react-19 · next-16 · r3f</span>
        </div>
        <div className="row">
          <span className="k">Shell</span>
          <span className="v">duru-shell 1.0</span>
        </div>
        <div className="row">
          <span className="k">Theme</span>
          <span className="v">catppuccin-mocha</span>
        </div>
        <div className="row">
          <span className="k">User</span>
          <span className="v">CS · AI · Builder · Seoul / HK</span>
        </div>
        <div className="row">
          <span className="k">Status</span>
          <span className="v">Year 2 · HKUST</span>
        </div>
        <div className="home-hint">
          Type <span className="key">help</span> to list commands ·{" "}
          <span className="key">⌘K</span> for palette ·{" "}
          <span className="key">projects</span> to list projects
        </div>
      </div>
    </div>
  );
}
