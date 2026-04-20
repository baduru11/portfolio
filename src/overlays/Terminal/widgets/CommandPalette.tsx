"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

export interface PaletteCommand {
  id: string;
  label: string;
  alias: string;
  keywords: string[];
  section?: string;
  icon?: string;
}

interface CommandPaletteProps {
  commands: PaletteCommand[];
  onSelect: (cmd: PaletteCommand) => void;
  onClose: () => void;
}

function fuzzyScore(needle: string, hay: string): number {
  const n = needle.toLowerCase();
  const h = hay.toLowerCase();
  if (h.includes(n)) return 100 - h.indexOf(n);
  let i = 0;
  let score = 0;
  for (const ch of h) {
    if (i < n.length && ch === n[i]) {
      score += 1;
      i += 1;
    }
  }
  return i === n.length ? score : 0;
}

function PaletteIcon({ name }: { name?: string }) {
  const sw = 1.5;
  switch (name) {
    case "home":
      return (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw}>
          <path d="M3 11 L12 3 L21 11" />
          <path d="M5 10 V20 H19 V10" />
        </svg>
      );
    case "projects":
      return (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw}>
          <rect x="3" y="6" width="18" height="14" />
          <path d="M3 6 L9 6 L11 4 L21 4" />
        </svg>
      );
    case "skills":
      return (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw}>
          <path d="M13 2 L4 14 H12 L11 22 L20 10 H12 Z" />
        </svg>
      );
    case "lab":
      return (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw}>
          <path d="M9 2 V8 L4 18 A3 3 0 0 0 7 22 H17 A3 3 0 0 0 20 18 L15 8 V2" />
        </svg>
      );
    case "whoami":
      return (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21 Q4 14 12 14 Q20 14 20 21" />
        </svg>
      );
    case "help":
      return (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw}>
          <circle cx="12" cy="12" r="9" />
          <path d="M9 9 Q9 6 12 6 Q15 6 15 9 Q15 11 12 12 V14" />
          <circle cx="12" cy="18" r="0.5" fill="currentColor" />
        </svg>
      );
    case "github":
      return (
        <svg width="32" height="32" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2 .37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
        </svg>
      );
    case "contact":
      return (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw}>
          <rect x="3" y="5" width="18" height="14" />
          <path d="M3 6 L12 13 L21 6" />
        </svg>
      );
    case "matrix":
      return (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw}>
          <path d="M5 2 V22 M9 2 V22 M13 2 V22 M17 2 V22" />
          <path d="M5 6 L9 10 M13 14 L17 18" />
        </svg>
      );
    case "game":
      return (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw}>
          <rect x="2" y="7" width="20" height="12" rx="2" />
          <path d="M7 11 V15 M5 13 H9 M15 12 H17 M15 14 H17" />
        </svg>
      );
    case "clear":
      return (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw}>
          <path d="M5 5 L19 19 M19 5 L5 19" />
        </svg>
      );
    default:
      return (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw}>
          <path d="M5 7 L9 11 L5 15 M11 17 H19" />
        </svg>
      );
  }
}

export function CommandPalette({
  commands,
  onSelect,
  onClose,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    return commands
      .map((c) => ({
        c,
        s: Math.max(
          fuzzyScore(query, c.label),
          fuzzyScore(query, c.alias),
          ...c.keywords.map((k) => fuzzyScore(query, k)),
        ),
      }))
      .filter(({ s }) => s > 0)
      .sort((a, b) => b.s - a.s)
      .map(({ c }) => c);
  }, [query, commands]);

  // Group filtered commands by section. When fuzzy-searching, sections are
  // suppressed and ranked results stay in score order (no headers).
  const grouped = useMemo(() => {
    if (query.trim()) return null;
    const map = new Map<string, PaletteCommand[]>();
    for (const c of filtered) {
      const sec = c.section ?? "OTHER";
      const arr = map.get(sec) ?? [];
      arr.push(c);
      map.set(sec, arr);
    }
    return Array.from(map.entries());
  }, [filtered, query]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  const onKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(filtered.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = filtered[active];
      if (pick) onSelect(pick);
    }
  };

  let runningIdx = -1;
  const renderRow = (c: PaletteCommand) => {
    runningIdx += 1;
    const i = runningIdx;
    return (
      <li
        key={c.id}
        className={`palette-row ${i === active ? "selected" : ""}`}
        onMouseEnter={() => setActive(i)}
        onClick={() => onSelect(c)}
        role="option"
        aria-selected={i === active}
      >
        <span className="icon">
          <PaletteIcon name={c.icon} />
        </span>
        <span className="label">{c.label}</span>
        <span className="alias">{c.alias}</span>
      </li>
    );
  };

  return (
    <div className="palette-backdrop" onClick={onClose} role="presentation">
      <div
        className="palette-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Command palette"
      >
        <input
          ref={inputRef}
          type="text"
          className="palette-input"
          placeholder="search commands…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          autoComplete="off"
          spellCheck={false}
        />
        {filtered.length === 0 ? (
          <div className="palette-empty">no matches</div>
        ) : grouped ? (
          <ul className="palette-list" role="listbox">
            {grouped.map(([section, items]) => (
              <li key={section}>
                <div className="palette-section">{section}</div>
                <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {items.map(renderRow)}
                </ul>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="palette-list" role="listbox">
            {filtered.map(renderRow)}
          </ul>
        )}
        <div className="palette-foot">
          ↑↓ navigate · ↵ run · esc close
        </div>
      </div>
    </div>
  );
}
