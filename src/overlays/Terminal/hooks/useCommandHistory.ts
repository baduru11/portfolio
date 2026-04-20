"use client";

import { useCallback, useRef, useState } from "react";

export interface CommandHistoryAPI {
  push: (cmd: string) => void;
  prev: () => string | null;
  next: () => string | null;
  reset: () => void;
}

export function useCommandHistory(): CommandHistoryAPI {
  const ref = useRef<string[]>([]);
  const [, setVersion] = useState(0);
  const cursor = useRef<number>(-1);

  const push = useCallback((cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;
    if (ref.current[ref.current.length - 1] === trimmed) {
      cursor.current = -1;
      return;
    }
    ref.current = [...ref.current, trimmed].slice(-100);
    cursor.current = -1;
    setVersion((v) => v + 1);
  }, []);

  const prev = useCallback((): string | null => {
    if (ref.current.length === 0) return null;
    if (cursor.current === -1) cursor.current = ref.current.length;
    cursor.current = Math.max(0, cursor.current - 1);
    return ref.current[cursor.current] ?? null;
  }, []);

  const next = useCallback((): string | null => {
    if (ref.current.length === 0 || cursor.current === -1) return null;
    cursor.current = Math.min(ref.current.length, cursor.current + 1);
    if (cursor.current >= ref.current.length) {
      cursor.current = -1;
      return "";
    }
    return ref.current[cursor.current] ?? null;
  }, []);

  const reset = useCallback(() => {
    cursor.current = -1;
  }, []);

  return { push, prev, next, reset };
}
