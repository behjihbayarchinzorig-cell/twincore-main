// Sample construction work packages, shared by the base-data map and the construction-control dashboard.

export type Status = 'done' | 'active' | 'late' | 'planned';
export type Pkg = {
  id: string;
  x: number; // footprint on the district map (map units)
  y: number;
  w: number;
  h: number;
  status: Status;
  contractor: string; // test company letter, '' when not yet awarded
  progress: number; // physical progress, %
  planned: number; // where the schedule says it should be today, %
  budget: number; // billion ₮
  paid: number; // billion ₮
  due: string;
};

export const PACKAGES: Pkg[] = [
  { id: 'PKG-01', x: 60, y: 260, w: 110, h: 80, status: 'active', contractor: 'A', progress: 62, planned: 65, budget: 18.4, paid: 11.0, due: '2027-06' },
  { id: 'PKG-02', x: 190, y: 380, w: 90, h: 90, status: 'late', contractor: 'B', progress: 38, planned: 55, budget: 12.1, paid: 7.9, due: '2027-02' },
  { id: 'PKG-03', x: 360, y: 200, w: 140, h: 90, status: 'done', contractor: 'C', progress: 100, planned: 100, budget: 9.6, paid: 9.6, due: '2026-08' },
  { id: 'PKG-04', x: 620, y: 290, w: 120, h: 100, status: 'planned', contractor: '', progress: 0, planned: 0, budget: 22.0, paid: 0, due: '2028-03' },
  { id: 'PKG-05', x: 360, y: 40, w: 90, h: 80, status: 'active', contractor: 'D', progress: 21, planned: 18, budget: 15.3, paid: 3.2, due: '2028-01' },
];

export const STATUS_FILL: Record<Status, string> = { done: '#7fa36a', active: '#60a5fa', late: '#ef4444', planned: '#8ea6cc' };
