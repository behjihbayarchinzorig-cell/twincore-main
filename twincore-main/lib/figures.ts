// The figures the "Products" menu shows under "what the system is tracking today". All of them come from the demo
// project's own records, never typed in here: the district model's buildings, the supervising engineer's latest head
// counts of workers and plant on each package still under way, and the packages' budgets.

import { VISITS, type Visit } from './construction/extra/supervision';
import { DISTRICT_FIGURES } from './district';
import { PACKAGES } from './packages';

const underWay = new Set(PACKAGES.filter((p) => p.status === 'active' || p.status === 'late').map((p) => p.id));
const latest = new Map<string, Visit>();
for (const v of VISITS) {
  const was = latest.get(v.pkg);
  if (underWay.has(v.pkg) && (!was || was.date < v.date)) latest.set(v.pkg, v);
}
const onSite = (f: (v: Visit) => number | null | undefined) => [...latest.values()].reduce((a, v) => a + (f(v) ?? 0), 0);

export const TRACKED = {
  buildings: DISTRICT_FIGURES.buildings,
  workers: onSite((v) => v.crew),
  machines: onSite((v) => v.plant),
  budget: PACKAGES.reduce((a, p) => a + p.budget, 0), // billion ₮
};
