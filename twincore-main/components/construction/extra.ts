'use client';

import { useCallback, useEffect, useState, type SetStateAction } from 'react';
import type { Section } from '@/lib/construction/text';

// Records a workspace page keeps for itself (extra work requests, material submittals, site instructions, funding
// lines…), beside the shared store. Same rules as the store: kept in this browser (localStorage) so edits survive a
// reload, and wiped by "reset the sample data". A production deployment moves these behind the same API.

const PREFIX = 'tc:construction:x:';
const RESET = 'tc-construction-reset';

export function useExtra<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      if (raw != null) setValue(JSON.parse(raw) as T);
    } catch {
      /* unreadable or blocked storage: start from the sample */
    }
    setReady(true);
    const reset = () => setValue(initial);
    addEventListener(RESET, reset);
    return () => removeEventListener(RESET, reset);
    // `initial` is the page's fixed sample set
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const set = useCallback(
    (next: SetStateAction<T>) =>
      setValue((prev) => {
        const v = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
        try {
          localStorage.setItem(PREFIX + key, JSON.stringify(v));
        } catch {
          /* storage full or blocked: lasts for this visit */
        }
        return v;
      }),
    [key],
  );
  return [value, set, ready] as const;
}

export function clearExtra() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    /* nothing saved */
  }
  dispatchEvent(new Event(RESET));
}

// A section's own views (master plan › zoning, roads…), kept in the address #hash so the sidebar can open one.
const SUBVIEW = 'tc-subview';
export const openSub = () => setTimeout(() => dispatchEvent(new Event(SUBVIEW)), 0);
export function useSubView(_section: Section, views: string[]) {
  const [v, setV] = useState(views[0]);
  useEffect(() => {
    const read = () => {
      const h = location.hash.slice(1);
      setV(views.includes(h) ? h : views[0]);
    };
    read();
    addEventListener('hashchange', read);
    addEventListener(SUBVIEW, read);
    return () => {
      removeEventListener('hashchange', read);
      removeEventListener(SUBVIEW, read);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [views.join()]);
  const choose = (x: string) => {
    history.replaceState(null, '', `#${x}`);
    setV(x);
    dispatchEvent(new Event(SUBVIEW)); // keeps the sidebar's highlight in step
  };
  return [v, choose] as const;
}
