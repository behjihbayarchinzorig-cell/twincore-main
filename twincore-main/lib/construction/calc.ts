// The calculation rules — one place, used by the dashboard, the section pages and the reports alike.
//
//  • Activity progress: the latest APPROVED record (approved progress); the latest submitted-or-approved record gives
//    the REPORTED progress. Drafts and rejected records never count.
//  • Package progress: activities weighted by their `weight`.
//  • Project progress: packages weighted by their approved budget.
//  • Planned progress on a date: each activity's share runs linearly from its start to its finish, using the
//    approved BASELINE dates (falling back to the current dates where an activity has no baseline).
//  • Schedule variance: current finish − baseline finish, in days (positive = later than approved).
//  • Overdue: not 100 % approved, and its current finish date has passed.
//  • Money is never mixed: budget, committed (contracts), invoiced, approved, paid are separate sums.
//    Missing values stay missing (null), they are not counted as zero.

import type { Activity, Baseline, Data, Id, Invoice } from './types';

export const DAY = 86400000;
export const today = () => new Date().toISOString().slice(0, 10);
const t = (d: string) => Date.parse(d + 'T00:00:00Z');
export const days = (a: string, b: string) => Math.round((t(b) - t(a)) / DAY);

export const latestBaseline = (d: Data): Baseline | null => (d.baselines.length ? d.baselines[d.baselines.length - 1] : null);

export function activityProgress(d: Data, id: Id) {
  const recs = d.progress.filter((p) => p.activity === id).sort((a, b) => a.date.localeCompare(b.date));
  const approved = recs.filter((p) => p.state === 'approved').pop()?.percent ?? 0;
  const reported = recs.filter((p) => p.state === 'approved' || p.state === 'submitted').pop()?.percent ?? approved;
  return { approved, reported };
}

export function plannedAt(a: Activity, bl: Baseline | null, on: string) {
  const b = bl?.dates[a.id] ?? { start: a.start, finish: a.finish };
  const span = Math.max(1, days(b.start, b.finish));
  return Math.max(0, Math.min(100, (days(b.start, on) / span) * 100));
}

const weighted = (items: { w: number; v: number }[]) => {
  const W = items.reduce((s, x) => s + x.w, 0);
  return W ? items.reduce((s, x) => s + x.w * x.v, 0) / W : 0;
};

export function packageProgress(d: Data, pkg: Id, on = today()) {
  const acts = d.activities.filter((a) => a.pkg === pkg);
  const bl = latestBaseline(d);
  return {
    approved: weighted(acts.map((a) => ({ w: a.weight, v: activityProgress(d, a.id).approved }))),
    reported: weighted(acts.map((a) => ({ w: a.weight, v: activityProgress(d, a.id).reported }))),
    planned: weighted(acts.map((a) => ({ w: a.weight, v: plannedAt(a, bl, on) }))),
  };
}

export function projectProgress(d: Data, pkgs = d.packages.map((p) => p.id), on = today()) {
  const items = d.packages.filter((p) => pkgs.includes(p.id)).map((p) => ({ p, v: packageProgress(d, p.id, on) }));
  return {
    approved: weighted(items.map(({ p, v }) => ({ w: p.budget, v: v.approved }))),
    reported: weighted(items.map(({ p, v }) => ({ w: p.budget, v: v.reported }))),
    planned: weighted(items.map(({ p, v }) => ({ w: p.budget, v: v.planned }))),
  };
}

export function variance(d: Data, a: Activity) {
  const b = latestBaseline(d)?.dates[a.id];
  return b ? days(b.finish, a.finish) : null;
}
export const isOverdue = (d: Data, a: Activity, on = today()) => activityProgress(d, a.id).approved < 100 && a.finish < on;

// ---- money ----------------------------------------------------------------------------------------------------------
const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0);
export function money(d: Data, pkgs = d.packages.map((p) => p.id)) {
  const contracts = d.contracts.filter((c) => pkgs.includes(c.pkg));
  const cids = contracts.map((c) => c.id);
  const inv = d.invoices.filter((i) => cids.includes(i.contract));
  const st = (...s: Invoice['state'][]) => sum(inv.filter((i) => s.includes(i.state)).map((i) => i.amount));
  const budget = sum(d.packages.filter((p) => pkgs.includes(p.id)).map((p) => p.budget));
  // the planned financing to date: each activity's cost spread over its baseline span
  const bl = latestBaseline(d);
  const plannedToDate = sum(d.activities.filter((a) => pkgs.includes(a.pkg)).map((a) => (a.cost * plannedAt(a, bl, today())) / 100));
  return {
    budget,
    committed: sum(contracts.map((c) => c.amount)),
    invoiced: st('submitted', 'approved', 'paid'),
    approved: st('approved', 'paid'),
    paid: st('paid'),
    plannedToDate,
    // a package with no contract has no committed value yet: null rather than 0
    hasContract: contracts.length > 0,
  };
}

// planned vs actual financing over time (month by month, cumulative)
export function cashflow(d: Data, pkgs = d.packages.map((p) => p.id)) {
  const acts = d.activities.filter((a) => pkgs.includes(a.pkg));
  const bl = latestBaseline(d);
  const cids = d.contracts.filter((c) => pkgs.includes(c.pkg)).map((c) => c.id);
  const paid = d.invoices.filter((i) => cids.includes(i.contract) && i.state === 'paid' && i.paidOn);
  const first = acts.reduce((m, a) => (a.start < m ? a.start : m), '9999');
  const last = acts.reduce((m, a) => (a.finish > m ? a.finish : m), '0000');
  const out: { month: string; planned: number; paid: number | null }[] = [];
  if (first === '9999') return out;
  const now = today();
  for (let y = +first.slice(0, 4), m = +first.slice(5, 7); `${y}-${String(m).padStart(2, '0')}` <= last.slice(0, 7); m === 12 ? (y++, (m = 1)) : m++) {
    const end = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
    const month = end.slice(0, 7);
    out.push({
      month,
      planned: sum(acts.map((a) => (a.cost * plannedAt(a, bl, end)) / 100)),
      paid: month <= now.slice(0, 7) ? sum(paid.filter((i) => i.paidOn! <= end).map((i) => i.amount)) : null,
    });
  }
  return out;
}

// planned vs approved physical progress over time (for the S-curve)
export function progressCurve(d: Data, pkgs = d.packages.map((p) => p.id)) {
  const flow = cashflow(d, pkgs);
  const now = today();
  return flow.map(({ month }) => {
    const end = month + '-28';
    const pkgsIn = d.packages.filter((p) => pkgs.includes(p.id));
    const W = sum(pkgsIn.map((p) => p.budget)) || 1;
    // approved progress as it stood at the end of that month
    const at = (pkg: Id) => {
      const acts = d.activities.filter((a) => a.pkg === pkg);
      const aw = sum(acts.map((a) => a.weight)) || 1;
      return sum(acts.map((a) => (a.weight * (d.progress.filter((r) => r.activity === a.id && r.state === 'approved' && r.date <= end).sort((x, y) => x.date.localeCompare(y.date)).pop()?.percent ?? 0)) / aw));
    };
    return {
      month,
      planned: sum(pkgsIn.map((p) => (p.budget * packageProgress(d, p.id, end).planned) / W)),
      approved: month <= now.slice(0, 7) ? sum(pkgsIn.map((p) => (p.budget * at(p.id)) / W)) : null,
    };
  });
}

export const overdueIssue = (due: string, state: string, on = today()) => state !== 'resolved' && due < on;
export const permitWarning = (p: { status: string; expires?: string }, on = today()) =>
  p.status === 'approved' && p.expires ? (p.expires < on ? 'expired' : days(on, p.expires) <= 30 ? 'soon' : null) : null;

// ---- formatting --------------------------------------------------------------------------------------------------------
// money is stored in million ₮
export const tug = (mn: number | null | undefined, en = false) => {
  if (mn == null || Number.isNaN(mn)) return '—';
  if (Math.abs(mn) >= 1000) return en ? `₮${(mn / 1000).toFixed(1)}bn` : `${(mn / 1000).toFixed(1).replace('.', ',')} тэрбум ₮`;
  return en ? `₮${Math.round(mn)}m` : `${Math.round(mn)} сая ₮`;
};
export const pct = (v: number | null | undefined, digits = 0) => (v == null || Number.isNaN(v) ? '—' : `${v.toFixed(digits)}%`);
