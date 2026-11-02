'use client';

import { useCallback, useEffect, useState, type SetStateAction } from 'react';

// State that survives the remount caused by switching language (the /en prefix changes the [locale]
// segment). A module-level map restores it instantly on a client-side navigation; sessionStorage
// covers a full reload. Only store ids and numbers here, never translated text.
const memory = new Map<string, unknown>();
const PREFIX = 'tc:';

const readSession = <T,>(key: string): T | undefined => {
  try {
    const raw = sessionStorage.getItem(PREFIX + key);
    return raw == null ? undefined : (JSON.parse(raw) as T);
  } catch {
    return undefined;
  }
};

export const writePersistent = (key: string, value: unknown) => {
  memory.set(key, value);
  try {
    sessionStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* storage unavailable: memory copy still works within the session */
  }
};

export const readPersistent = <T,>(key: string): T | undefined =>
  memory.has(key) ? (memory.get(key) as T) : readSession<T>(key);

export function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => (memory.has(key) ? (memory.get(key) as T) : initial));

  // After a full reload the memory map is empty; pick the value up from sessionStorage once hydrated.
  useEffect(() => {
    if (memory.has(key)) return;
    const stored = readSession<T>(key);
    if (stored !== undefined) {
      memory.set(key, stored);
      setValue(stored);
    }
  }, [key]);

  const set = useCallback(
    (next: SetStateAction<T>) =>
      setValue((prev) => {
        const v = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
        writePersistent(key, v);
        return v;
      }),
    [key],
  );

  return [value, set] as const;
}
