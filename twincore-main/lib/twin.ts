// Sample data behind the interactive demos. Deterministic so server and client render the same values.

export const FLOORS = 24;
export const FLOOR_HEIGHT_M = 3.2;
// Structural grid: 4 bays of 8 m each way (axes A–E by 1–5) — a slender residential tower.
export const FOOTPRINT = { south: 32, east: 32 };

const rand = (n: number) => {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// ---- Planning --------------------------------------------------------------
export const floorUse = (f: number) => (f === 0 ? 'commercial' : 'residential');
export const floorArea = () => FOOTPRINT.south * FOOTPRINT.east;

export const SITE = { w: 80, d: 60 }; // site boundary in metres
export const LIMITS = { far: 6.0, bcr: 40 };
export const VARIANTS = [
  { id: 'A', floors: 24, far: 5.1, bcr: 21, cost: 56.5 },
  { id: 'B', floors: 30, far: 6.4, bcr: 21, cost: 71.8 },
  { id: 'C', floors: 16, far: 4.9, bcr: 46, cost: 52.3 },
] as const;
export type Variant = (typeof VARIANTS)[number];
export const variantOk = (v: Variant) => v.far <= LIMITS.far && v.bcr <= LIMITS.bcr;

// ---- Construction ----------------------------------------------------------
export const WEEKS = 60;
export const TODAY = 36;
const logistic = (w: number, mid: number, k: number) => 1 / (1 + Math.exp(-(w - mid) / k));
const scurve = (w: number, mid: number, k: number) =>
  ((logistic(w, mid, k) - logistic(0, mid, k)) / (logistic(WEEKS, mid, k) - logistic(0, mid, k))) * 100;
export const planned = (w: number) => scurve(w, 28, 6.5);
export const actual = (w: number) => (w <= TODAY ? scurve(w, 30, 6.9) : null);
// Construction stages (matching the chain in the Construction module) as week ranges.
export const STAGE_WEEKS: [number, number][] = [[0, 8], [8, 18], [18, 40], [40, 54], [54, 60]];

// Construction progress at a given week, in floors (actual progress up to today, plan afterwards).
// The first ~25% of progress is utilities and groundworks. The scale runs past the top floor: the frame tops out at
// FLOORS, then the façade (FACADE_LAG floors behind) and services close in, so at the end the building is complete.
export const BUILD_SPAN = FLOORS + 3 + 1.5;
export const builtAt = (w: number) => clamp(((actual(w) ?? planned(w)) - 25) / 72, 0, 1) * BUILD_SPAN;
export const BUILT = builtAt(TODAY);
export const floorProgress = (f: number, built = BUILT) => Math.round(clamp(built - f, 0, 1) * 100);
// The curtain wall follows the frame about three floors behind.
export const FACADE_LAG = 3;

// ---- Operations ------------------------------------------------------------
export type OpsStatus = 'ok' | 'service' | 'alert';
export const opsStatus = (f: number): OpsStatus => (f === 4 ? 'alert' : f === 2 || f === 9 ? 'service' : 'ok');
export const energy = (f: number) => (f === 0 ? 520 : Math.round(170 + rand(f) * 130));
export const issues = (f: number) => ({ alert: 5, service: 2, ok: Math.floor(rand(f + 3) * 2) })[opsStatus(f)];
export const equipment = (f: number) => 8 + Math.round(rand(f + 5) * 10);
export const occupancy = (f: number) => (f === 0 ? 100 : 68 + Math.round(rand(f + 7) * 32));
export const hoaPaid = (f: number) => (f === 0 ? 100 : 58 + Math.round(rand(f + 11) * 42));

// ---- Sales -----------------------------------------------------------------
// 14 apartments per floor around the core, numbered clockwise from the south-west corner:
// 0–3 south, 4–6 east, 7–10 north, 11–13 west (two or three façade panels each).
export const UNITS = 14;
export type Facing = 'south' | 'east' | 'north' | 'west';
export type UnitStatus = 'free' | 'reserved' | 'sold';
export type Unit = {
  id: string;
  floor: number;
  index: number;
  rooms: number;
  area: number;
  price: number; // million ₮
  status: UnitStatus;
  facing: Facing;
  sunHours: number;
};

const ROOMS = [3, 2, 2, 3, 3, 1, 3, 3, 1, 2, 3, 3, 2, 3];
const AREA: Record<number, number> = { 1: 42, 2: 64, 3: 86 };
export const facingOf = (u: number): Facing => (u < 4 ? 'south' : u < 7 ? 'east' : u < 11 ? 'north' : 'west');
const SUN: Record<Facing, [number, number]> = { south: [6.4, 0.12], east: [4.1, 0.08], west: [4.6, 0.08], north: [1.8, 0.05] };

export function unit(f: number, u: number): Unit | null {
  if (f <= 0 || f >= FLOORS || u < 0 || u >= UNITS) return null; // ground floor is retail
  const r = rand(f * 17 + u);
  const facing = facingOf(u);
  const area = AREA[ROOMS[u]] + Math.round(rand(f * 3 + u) * 4);
  const [base, perFloor] = SUN[facing];
  return {
    id: `${f + 1}-${String(u + 1).padStart(2, '0')}`,
    floor: f,
    index: u,
    rooms: ROOMS[u],
    area,
    price: Math.round(area * (3.8 + f * 0.04) * (facing === 'south' ? 1.06 : facing === 'north' ? 0.95 : 1)),
    status: f === 11 && u === 3 ? 'free' : r < 0.42 ? 'sold' : r < 0.6 ? 'reserved' : 'free',
    facing,
    sunHours: Math.round((base + f * perFloor) * 10) / 10,
  };
}

export const unitById = (id: string) => {
  const m = /^(\d+)-(\d+)$/.exec(id);
  return m ? unit(Number(m[1]) - 1, Number(m[2]) - 1) : null;
};

// Relative sunlight through the day (06:00–20:00) for a unit.
export function sunProfile(u: Unit) {
  const peak = { south: 13, east: 9.5, west: 16.5, north: 12.5 }[u.facing];
  const width = { south: 3.1, east: 2.2, west: 2.2, north: 3.5 }[u.facing];
  const scale = u.sunHours / 9;
  return Array.from({ length: 29 }, (_, i) => {
    const h = 6 + i / 2;
    return { h, v: Math.exp(-((h - peak) ** 2) / (2 * width ** 2)) * scale };
  });
}
