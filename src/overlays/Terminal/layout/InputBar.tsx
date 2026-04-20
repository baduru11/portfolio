"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { useCommandHistory } from "../hooks/useCommandHistory";
import { useTerminalState } from "../hooks/useTerminalState";

interface InputBarProps {
  onSubmit: (cmd: string) => void;
  completions: string[];
  active: boolean;
}

export function InputBar({ onSubmit, completions, active }: InputBarProps) {
  const [value, setValue] = useState("");
  const [flash, setFlash] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const history = useCommandHistory();
  const paletteOpen = useTerminalState((s) => s.paletteOpen);

  useEffect(() => {
    if (active && !paletteOpen) inputRef.current?.focus();
  }, [active, paletteOpen]);

  const ghost = useMemo(() => {
    if (!value) return "";
    const lower = value.toLowerCase();
    const match = completions.find(
      (c) => c.toLowerCase().startsWith(lower) && c.toLowerCase() !== lower,
    );
    return match ? match.slice(value.length) : "";
  }, [value, completions]);

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    history.push(trimmed);
    setFlash(true);
    window.setTimeout(() => setFlash(false), 130);
    setValue("");
    onSubmit(trimmed);
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    } else if (e.key === "Tab") {
      if (ghost) {
        e.preventDefault();
        setValue(value + ghost);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const p = history.prev();
      if (p !== null) setValue(p);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const n = history.next();
      if (n !== null) setValue(n);
    }
  };

  return (
    <div className={`input-bar ${flash ? "input-flash" : ""}`}>
      <span className="input-prompt">›</span>
      <div className="input-wrap">
        <input
          ref={inputRef}
          type="text"
          className="input-field"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            history.reset();
          }}
          onKeyDown={onKeyDown}
          placeholder={`Type a command... try "help"`}
          autoComplete="off"
          spellCheck={false}
        />
        {ghost && (
          <span
            className="input-ghost show"
            style={{ left: `${value.length}ch` }}
          >
            {ghost}
          </span>
        )}
      </div>
    </div>
  );
}
