// Checks that run before anything is saved: dates that make sense, dependencies without cycles, workflow steps that
// are allowed, and files of a sensible type and size.

import type { Activity, Id, ProgressState, Role } from './types';

export type Problem = { field: string; code: 'dateOrder' | 'required' | 'cycle' | 'depMissing' | 'range' | 'fileType' | 'fileSize' | 'forbidden' | 'transition' };

export function checkActivity(a: Activity, all: Activity[]): Problem[] {
  const out: Problem[] = [];
  if (!a.name.trim()) out.push({ field: 'name', code: 'required' });
  if (!a.start || !a.finish) out.push({ field: 'dates', code: 'required' });
  else if (a.finish < a.start) out.push({ field: 'dates', code: 'dateOrder' });
  if (a.weight <= 0 || a.weight > 100) out.push({ field: 'weight', code: 'range' });
  if (a.cost < 0) out.push({ field: 'cost', code: 'range' });
  for (const d of a.deps) if (!all.some((x) => x.id === d)) out.push({ field: 'deps', code: 'depMissing' });
  if (hasCycle(a, all)) out.push({ field: 'deps', code: 'cycle' });
  return out;
}

// would saving `a` (with its dependencies) create a loop? depth-first search from a's dependencies back to a
export function hasCycle(a: Activity, all: Activity[]) {
  const deps = new Map<Id, Id[]>(all.map((x) => [x.id, x.deps]));
  deps.set(a.id, a.deps);
  const seen = new Set<Id>();
  const stack = [...a.deps];
  while (stack.length) {
    const n = stack.pop()!;
    if (n === a.id) return true;
    if (seen.has(n)) continue;
    seen.add(n);
    stack.push(...(deps.get(n) ?? []));
  }
  return false;
}

// the allowed steps of a review workflow, and who may take them
const STEPS: Record<string, { to: ProgressState; roles: Role[] }[]> = {
  draft: [{ to: 'submitted', roles: ['admin', 'manager', 'engineer', 'contractor'] }],
  submitted: [
    { to: 'approved', roles: ['admin', 'manager', 'engineer'] },
    { to: 'rejected', roles: ['admin', 'manager', 'engineer'] },
  ],
  rejected: [{ to: 'draft', roles: ['admin', 'manager', 'contractor'] }],
  approved: [],
};
export const nextSteps = (state: ProgressState, role: Role) => STEPS[state].filter((s) => s.roles.includes(role)).map((s) => s.to);
export const canMove = (from: ProgressState, to: ProgressState, role: Role) => nextSteps(from, role).includes(to);

export const FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
export const FILE_MAX = 10 * 1024 * 1024;
export function checkFile(f: { type: string; size: number }): Problem[] {
  const out: Problem[] = [];
  if (!FILE_TYPES.includes(f.type)) out.push({ field: 'file', code: 'fileType' });
  if (f.size > FILE_MAX) out.push({ field: 'file', code: 'fileSize' });
  return out;
}
