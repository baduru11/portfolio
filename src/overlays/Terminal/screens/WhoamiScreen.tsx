"use client";

import { WHOAMI } from "../data/whoami";

export function WhoamiScreen() {
  return (
    <div className="whoami-stage">
      <div className="whoami-frame">
        <span className="at">seungwan@hkust</span> ~/whoami
      </div>

      <div className="whoami-kv">
        <div className="k">name</div>
        <div className="v hl">{WHOAMI.name}</div>
        <div className="k">alias</div>
        <div className="v">{WHOAMI.alias}</div>
        <div className="k">university</div>
        <div className="v">HKUST</div>
        <div className="k">location</div>
        <div className="v">{WHOAMI.based}</div>
        <div className="k">status</div>
        <div className="v">{WHOAMI.status}</div>
        <div className="k">major</div>
        <div className="v">{WHOAMI.major}</div>
      </div>

      <div className="whoami-section">
        <div className="whoami-section-title">BIO</div>
        <div className="whoami-section-rule" />
        <p className="whoami-bio">{WHOAMI.bio}</p>
      </div>

      <div className="whoami-section">
        <div className="whoami-section-title">INTERESTS</div>
        <div className="whoami-section-rule" />
        {WHOAMI.interests.map((line, i) => (
          <div key={i} className="row">
            {line}
          </div>
        ))}
      </div>

      <div className="whoami-hint">
        <span className="prompt">›</span> type{" "}
        <span className="kw">contact</span> to reach out
      </div>
    </div>
  );
}
