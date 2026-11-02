'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { today } from '@/lib/construction/calc';
import { DEMO } from '@/lib/construction/demo';
import { clearExtra } from './extra';
import { can, type Action } from '@/lib/construction/perms';
import type { Data, Id, Role } from '@/lib/construction/types';

// The workspace's records and the person viewing them. This is the integration boundary: today the records are the
// demonstration set, kept in this browser (localStorage) so edits survive a reload; a production deployment replaces
// `load` / `persist` with calls to a real API, which must also enforce `can()` on the server.

const KEY = 'tc:construction:v1';
const VIEWERS: Record<Role, Id> = { admin: 'u-admin', manager: 'u-pm', engineer: 'u-eng', contractor: 'u-a', viewer: 'u-view' };

type Ctx = {
  data: Data;
  role: Role;
  user: Id;
  ready: boolean;
  setRole: (r: Role) => void;
  can: (a: Action) => boolean;
  // apply a change: checked against the role, recorded in the audit log
  change: (action: Action, entity: string, detail: string, fn: (d: Data) => void) => boolean;
  // for records a page keeps itself (see ./extra): check the role and write the audit line, nothing else
  log: (action: Action, entity: string, detail: string) => boolean;
  reset: () => void;
};
const C = createContext<Ctx | null>(null);

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Data>(() => clone(DEMO));
  const [role, setRoleState] = useState<Role>('manager');
  const [ready, setReady] = useState(false);

  // pick up this browser's saved copy (and role) once mounted
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { data: Data; role: Role };
        if (saved?.data?.packages) setData(saved.data);
        if (saved?.role) setRoleState(saved.role);
      }
    } catch {
      /* unreadable or blocked storage: start from the sample data */
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify({ data, role }));
    } catch {
      /* storage full or blocked: changes last for this visit only */
    }
  }, [data, role, ready]);

  const user = VIEWERS[role];
  const change = useCallback<Ctx['change']>(
    (action, entity, detail, fn) => {
      if (!can(role, action)) return false;
      setData((prev) => {
        const next = clone(prev);
        fn(next);
        next.audit.unshift({ at: new Date().toISOString(), by: VIEWERS[role], action, entity, detail });
        next.audit = next.audit.slice(0, 500);
        return next;
      });
      return true;
    },
    [role],
  );
  const value = useMemo<Ctx>(
    () => ({
      data,
      role,
      user,
      ready,
      setRole: (r) => {
        setRoleState(r);
        setData((prev) => ({ ...prev, audit: [{ at: new Date().toISOString(), by: VIEWERS[r], action: 'view-as', entity: 'session', detail: r }, ...prev.audit].slice(0, 500) }));
      },
      can: (a) => can(role, a),
      change,
      log: (action, entity, detail) => change(action, entity, detail, () => {}),
      reset: () => {
        setData(clone(DEMO));
        clearExtra();
        try {
          localStorage.removeItem(KEY);
        } catch {
          /* nothing saved */
        }
      },
    }),
    [data, role, user, ready, change],
  );
  return <C.Provider value={value}>{children}</C.Provider>;
}

export function useStore() {
  const v = useContext(C);
  if (!v) throw new Error('useStore outside StoreProvider');
  return v;
}

// small helpers for records
export const nextId = (prefix: string, ids: string[]) => {
  const n = ids.map((i) => +(i.split('-').pop() ?? 0)).filter((x) => !Number.isNaN(x));
  return `${prefix}-${(n.length ? Math.max(...n) : 0) + 1}`;
};
export const stamp = () => today();
