// The planned district, copied from the master plan drawing (public/plan/plan.png) and placed on its real site:
// the corridor between Chingeltei Avenue (west) and the Selbe (east), Chingeltei, Ulaanbaatar. The drawing is
// ~2.29 m per pixel; a pixel (px, py) sits at x = −590 + px·2.29, z = −1290 + py·2.29 (x east, z south, metres
// round 47.940° N, 106.925° E) — the offset that lines the drawing's river up with the real Selbe (≈30 m RMS).
// Everything below is traced from the drawing by hand, so it is close, not exact.
//
// It plays as one continuous sequence on a timeline T (0..1): planned (0–0.22), streets paved (0.16–0.30),
// parcels built package by package with cranes (0.28–0.74), trees planted (0.64–0.8), then the district fills
// with people, cars and light (0.74–1).

import { SELBE } from './selbe';

const rand = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

// ---- the drawing on the ground --------------------------------------------------------------------------------
export const PLAN = { S: 2.29, X0: -590, Z0: -1290, W: 399, H: 552 };
type P2 = [number, number];
export const px = (x: number, y: number): P2 => [PLAN.X0 + x * PLAN.S, PLAN.Z0 + y * PLAN.S];

// The Selbe. Outside the site it is the real river (smoothed from OpenStreetMap); through the site it follows the master
// plan — 50 m east of the plan's riverside road — blending back into the real course over 250 m at either end.
const realRiverX = (z: number) => {
  const k = (z - SELBE[0][0]) / 40;
  const i = Math.max(0, Math.min(SELBE.length - 2, Math.floor(k)));
  const f = Math.min(1, Math.max(0, k - i));
  return SELBE[i][1] + (SELBE[i + 1][1] - SELBE[i][1]) * f;
};
// the plan's riverside road, drawing pixels [x, y]
const RIVERSIDE: [number, number][] = [[288, 0], [278, 100], [278, 200], [318, 248], [368, 288], [374, 400], [374, 552]];
const riversideX = (z: number) => {
  const y = (z - PLAN.Z0) / PLAN.S;
  let x = RIVERSIDE[RIVERSIDE.length - 1][0];
  if (y <= 0) x = RIVERSIDE[0][0];
  else
    for (let i = 1; i < RIVERSIDE.length; i++)
      if (y <= RIVERSIDE[i][1]) {
        const f = (y - RIVERSIDE[i - 1][1]) / (RIVERSIDE[i][1] - RIVERSIDE[i - 1][1]);
        x = RIVERSIDE[i - 1][0] + (RIVERSIDE[i][0] - RIVERSIDE[i - 1][0]) * f;
        break;
      }
  return PLAN.X0 + x * PLAN.S;
};
export const riverX = (z: number) => {
  const zEnd = PLAN.Z0 + PLAN.H * PLAN.S;
  const out = Math.max(PLAN.Z0 - z, z - zEnd, 0);
  const k = Math.min(1, out / 250);
  const w = 1 - k * k * (3 - 2 * k);
  return realRiverX(z) + w * (riversideX(z) + 50 - realRiverX(z));
};
// the plan's extent, widened east to take in the river park on both banks
const Z_END = PLAN.Z0 + PLAN.H * PLAN.S;
let eastBank = PLAN.X0 + PLAN.W * PLAN.S;
for (let z = PLAN.Z0; z <= Z_END; z += 20) eastBank = Math.max(eastBank, riverX(z) + 90);
export const PROJECT = { x0: PLAN.X0, x1: Math.round(eastBank), z0: PLAN.Z0, z1: Z_END };
export const FLOOR_H = 3.1;
export const PLINTH_H = 4.6;
export const CENTRE: [number, number] = [(PROJECT.x0 + PROJECT.x1) / 2, (PROJECT.z0 + PROJECT.z1) / 2];

export const T = { planEnd: 0.22, roads: [0.16, 0.3], build: [0.28, 0.62], buildLen: 0.12, trees: [0.64, 0.8], live: 0.74 } as const;
export const RIVER_W = 22;
// Half-widths of the water west and east of the centre line. South of the main avenue the Selbe opens into a wide
// flood plain on its east side (as on the master plan's base map); north of it it is a narrow channel.
const AVE_Z = PLAN.Z0 + 290 * PLAN.S;
const wide = (z: number) => {
  const k = Math.min(1, Math.max(0, (z - AVE_Z - 60) / 320));
  const out = Math.min(1, Math.max(0, (Z_END + 260 - z) / 200));
  return k * k * (3 - 2 * k) * out;
};
export const riverWest = (z: number) => RIVER_W / 2 + 8 * wide(z);
export const riverEast = (z: number) => RIVER_W / 2 + 115 * wide(z);
// the water's edge on either side (side −1 west, +1 east)
export const bankX = (z: number, side: number) => riverX(z) + (side < 0 ? -riverWest(z) : riverEast(z));

// ---- streets ----------------------------------------------------------------------------------------------------
export type Kind = 'brt' | 'avenue' | 'street' | 'drive';
const lineThrough = (pts: P2[]) => {
  // x as a function of z through points given in drawing pixels
  const w = pts.map(([a, b]) => px(a, b));
  return (z: number) => {
    if (z <= w[0][1]) return w[0][0];
    for (let i = 1; i < w.length; i++)
      if (z <= w[i][1]) {
        const f = (z - w[i - 1][1]) / (w[i][1] - w[i - 1][1]);
        return w[i - 1][0] + (w[i][0] - w[i - 1][0]) * f;
      }
    return w[w.length - 1][0];
  };
};
export type NS = { x: (z: number) => number; width: number; kind: Kind; name: string };
export const NS_LINES: NS[] = [
  { x: () => px(14, 0)[0], width: 14, kind: 'street', name: 'west' },
  // the main avenue down the middle of the plan, with the bus corridor
  { x: lineThrough([[247, 0], [240, 90], [232, 200], [226, 300], [224, 400], [212, 552]]), width: 30, kind: 'brt', name: 'avenue' },
  // the road along the river, swinging out to the east boundary in the south
  // (kept on the west bank of the real river, which runs a little east of where the drawing has it)
  { x: riversideX, width: 16, kind: 'drive', name: 'riverside' },
];
export const BRT_LINE = 1;
// East–west streets of the plan (straightened), north to south
export const ZS = [6, 95, 213, 290, 398, 443, 546].map((y) => px(0, y)[1]);
export const AVENUE_Z = ZS[3];
const zWidth = (z: number) => (z === AVENUE_Z ? 24 : 15);
export const WEST_END = PLAN.X0 + 4; // the streets start at the plan's west edge

export type Road = { pts: [number, number][]; width: number; kind: Kind; axis: 'ns' | 'ew'; line: number };
// how far the streets carry on beyond the site into the existing city (the traffic comes in from there)
export const EXT = 1200;
export const ROADS: Road[] = [
  ...NS_LINES.map((l, i): Road => {
    const pts: [number, number][] = [];
    for (let z = ZS[0] - 30 - EXT; z <= ZS[ZS.length - 1] + 30 + EXT; z += 20) pts.push([l.x(z), z]);
    return { pts, width: l.width, kind: l.kind, axis: 'ns', line: i };
  }),
  ...ZS.map(
    (z, j): Road => ({
      // every street ends at the riverside road (no road bridge over the river)
      pts: [
        [WEST_END - EXT, z],
        [NS_LINES[NS_LINES.length - 1].x(z) + 26, z],
      ],
      width: zWidth(z),
      kind: z === AVENUE_Z ? 'avenue' : 'street',
      axis: 'ew',
      line: j,
    }),
  ),
];
// How far a point is from the stretches of street that run outside the site (∞ inside it): the ground is levelled and
// the existing buildings cleared along them.
export function streetOutside(x: number, z: number) {
  let d = Infinity;
  const zEnds: [number, number] = [ZS[0] - 30, ZS[ZS.length - 1] + 30];
  for (const l of NS_LINES)
    if ((z < zEnds[0] && z > zEnds[0] - EXT) || (z > zEnds[1] && z < zEnds[1] + EXT)) d = Math.min(d, Math.abs(x - l.x(z)) - l.width / 2);
  for (const zz of ZS) if (x < WEST_END && x > WEST_END - EXT) d = Math.min(d, Math.abs(z - zz) - zWidth(zz) / 2);
  return d;
}
export const roadLength = (r: Road) => r.pts.reduce((a, p, i) => (i ? a + Math.hypot(p[0] - r.pts[i - 1][0], p[1] - r.pts[i - 1][1]) : 0), 0);
export const junctionAt = (i: number, j: number): [number, number] => [NS_LINES[i].x(ZS[j]), ZS[j]];
export const JUNCTIONS: [number, number][] = NS_LINES.flatMap((_, i) => ZS.map((_, j) => junctionAt(i, j)));
export const nsWidth = (i: number) => NS_LINES[i].width;
export const ewWidth = (j: number) => zWidth(ZS[j]);

export function pointAt(r: Road, s: number): [number, number, number, number] {
  let acc = 0;
  for (let i = 1; i < r.pts.length; i++) {
    const [x0, z0] = r.pts[i - 1];
    const [x1, z1] = r.pts[i];
    const l = Math.hypot(x1 - x0, z1 - z0);
    if (acc + l >= s || i === r.pts.length - 1) {
      const f = Math.min(1, Math.max(0, (s - acc) / (l || 1)));
      return [x0 + (x1 - x0) * f, z0 + (z1 - z0) * f, (x1 - x0) / (l || 1), (z1 - z0) / (l || 1)];
    }
    acc += l;
  }
  const p = r.pts[0];
  return [p[0], p[1], 1, 0];
}
export function sAt(r: Road, x: number, z: number) {
  let best = 0;
  let bd = Infinity;
  let acc = 0;
  for (let i = 1; i < r.pts.length; i++) {
    const [x0, z0] = r.pts[i - 1];
    const [x1, z1] = r.pts[i];
    const l = Math.hypot(x1 - x0, z1 - z0) || 1;
    const f = Math.min(1, Math.max(0, ((x - x0) * (x1 - x0) + (z - z0) * (z1 - z0)) / (l * l)));
    const d = Math.hypot(x0 + (x1 - x0) * f - x, z0 + (z1 - z0) * f - z);
    if (d < bd) {
      bd = d;
      best = acc + f * l;
    }
    acc += l;
  }
  return best;
}

// ---- parcels and areas from the plan --------------------------------------------------------------------------------
export type Use = 'housing' | 'school' | 'kinder' | 'shops' | 'park' | 'plaza' | 'office' | 'house';
export type Shape = 'glass' | 'stepped' | 'twist' | 'round' | 'landmark' | 'podium';
// A block / parcel: four corners (north-west, north-east, south-east, south-west).
// ghost: the infill between the plan's parcels — buildings only, no plot drawn
export type Block = { q: [P2, P2, P2, P2]; i: number; j: number; use: Use; pkg: number; t0: number; cx: number; cz: number; label: string; ghost?: boolean };
export type Building = {
  x: number;
  z: number;
  w: number;
  d: number;
  yaw: number;
  floors: number;
  pkg: number;
  use: Use;
  block: number;
  t0: number;
  facade: number;
  accent: number;
  seed: number;
  shape?: Shape;
};
export type Tree = { x: number; z: number; s: number; kind: 0 | 1; t: number };

export const inQuad = (q: Block['q'], u: number, v: number): P2 => {
  const top: P2 = [q[0][0] + (q[1][0] - q[0][0]) * u, q[0][1] + (q[1][1] - q[0][1]) * u];
  const bot: P2 = [q[3][0] + (q[2][0] - q[3][0]) * u, q[3][1] + (q[2][1] - q[3][1]) * u];
  return [top[0] + (bot[0] - top[0]) * v, top[1] + (bot[1] - top[1]) * v];
};
const Q = (pts: [number, number][]) => pts.map(([a, b]) => px(a, b)) as Block['q'];

// [label, use, corners in drawing pixels]
const PARCELS: [string, Use, [number, number][]][] = [
  // development parcels (red: the A core, pink: B, C, D)
  ['A-14', 'office', [[186, 16], [240, 16], [240, 80], [188, 86]]],
  ['A-5', 'shops', [[200, 96], [231, 96], [228, 208], [199, 208]]],
  ['B-1', 'housing', [[236, 100], [254, 100], [254, 134], [236, 134]]],
  ['B-7', 'housing', [[236, 216], [276, 216], [278, 246], [236, 246]]],
  ['A-27', 'office', [[172, 247], [218, 247], [218, 286], [172, 286]]],
  ['E-4', 'housing', [[232, 251], [276, 251], [276, 286], [232, 286]]],
  ['C-9', 'housing', [[150, 306], [188, 306], [184, 350], [150, 338]]],
  ['C-7.1', 'shops', [[194, 297], [220, 297], [220, 382], [191, 382]]],
  ['C-8', 'housing', [[178, 350], [218, 350], [220, 426], [180, 430]]],
  ['D-2', 'shops', [[236, 366], [290, 366], [290, 394], [236, 394]]],
  ['D-8', 'housing', [[234, 404], [368, 404], [368, 438], [234, 438]]],
  ['D-11', 'office', [[228, 450], [262, 450], [262, 506], [228, 506]]],
  // schools and kindergartens (blue)
  ['S-4', 'school', [[230, 142], [266, 142], [266, 184], [230, 184]]],
  ['S-3', 'school', [[50, 214], [132, 232], [132, 290], [50, 262]]],
  ['K-2', 'kinder', [[268, 278], [300, 284], [300, 312], [268, 300]]],
  ['K-8', 'kinder', [[124, 338], [156, 334], [150, 372], [124, 372]]],
  ['S-2', 'school', [[240, 300], [272, 300], [272, 362], [240, 362]]],
  ['S-1', 'school', [[294, 442], [370, 442], [370, 500], [294, 500]]],
  // green zones (yellow) — the hill parks
  ['E-1', 'park', [[140, 22], [186, 16], [190, 165], [110, 122]]],
  ['E-3', 'park', [[40, 102], [134, 100], [170, 160], [40, 142]]],
  ['E-5', 'park', [[60, 366], [164, 380], [170, 438], [60, 430]]],
  // low-rise housing areas
  ['H-1', 'housing', [[22, 150], [182, 172], [186, 212], [22, 196]]],
  ['H-2', 'housing', [[138, 216], [196, 216], [196, 244], [138, 244]]],
  ['H-3', 'housing', [[136, 248], [168, 248], [168, 298], [136, 298]]],
  ['H-4', 'housing', [[22, 280], [120, 292], [120, 334], [22, 330]]],
  ['H-5', 'housing', [[256, 24], [278, 24], [276, 96], [256, 96]]],
  ['H-6', 'housing', [[256, 140], [276, 140], [276, 204], [256, 204]]],
  ['H-7', 'housing', [[296, 300], [366, 300], [366, 360], [296, 360]]],
  ['H-8', 'housing', [[270, 452], [292, 452], [292, 540], [270, 540]]],
  ['H-9', 'housing', [[294, 506], [370, 506], [370, 540], [294, 540]]],
];

// ---- the parcels, squared up -------------------------------------------------------------------------------------------
// The drawing's parcels are traced by hand, slanted and overlapping, and the streets are straightened. Each parcel is
// made a tidy rectangle inside its street block — set back 8 m from the kerbs (pavement and verge) — and where two
// parcels in a block still overlap, the smaller gives way, leaving a 6 m gap between them.
const SET = 8;
const GAP = 6;
type Rect = { x0: number; x1: number; z0: number; z1: number };
const TIDY: (Block['q'] | null)[] = (() => {
  const zEnd = PLAN.Z0 + PLAN.H * PLAN.S;
  // the block edges: west to east (plan edge, the north–south streets, the river bank), north to south
  const west = [{ x: () => PLAN.X0 - 10, half: 0 }, ...NS_LINES.map((l) => ({ x: l.x, half: l.width / 2 })), { x: (z: number) => bankX(z, -1) - 10, half: 0 }];
  const north = [{ z: PLAN.Z0 - 10, half: 0 }, ...ZS.map((z) => ({ z, half: zWidth(z) / 2 })), { z: zEnd + 10, half: 0 }];
  const rects: (Rect | null)[] = PARCELS.map(([, , pts]) => {
    const q = Q(pts);
    const xs = q.map((p) => p[0]);
    const zs = q.map((p) => p[1]);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cz = (Math.min(...zs) + Math.max(...zs)) / 2;
    let j = 0;
    while (j < north.length - 2 && cz > north[j + 1].z) j++;
    let i = 0;
    while (i < west.length - 2 && cx > west[i + 1].x(cz)) i++;
    const z0 = Math.max(Math.min(...zs), north[j].z + north[j].half + SET);
    const z1 = Math.min(Math.max(...zs), north[j + 1].z - north[j + 1].half - SET);
    const x0 = Math.max(Math.min(...xs), ...[z0, z1].map((z) => west[i].x(z) + west[i].half + SET));
    const x1 = Math.min(Math.max(...xs), ...[z0, z1].map((z) => west[i + 1].x(z) - west[i + 1].half - SET));
    return x1 - x0 < 24 || z1 - z0 < 24 ? null : { x0, x1, z0, z1 };
  });
  // overlaps: the smaller parcel gives way along the axis where it overlaps least
  const area = (r: Rect) => (r.x1 - r.x0) * (r.z1 - r.z0);
  for (let a = 0; a < rects.length; a++)
    for (let b = 0; b < rects.length; b++) {
      const A = rects[a];
      const B = rects[b];
      if (a === b || !A || !B || area(A) > area(B)) continue; // A is the smaller one
      const ox = Math.min(A.x1, B.x1) - Math.max(A.x0, B.x0) + GAP;
      const oz = Math.min(A.z1, B.z1) - Math.max(A.z0, B.z0) + GAP;
      if (ox <= 0 || oz <= 0) continue;
      if (ox < oz) {
        if (A.x0 + A.x1 < B.x0 + B.x1) A.x1 = B.x0 - GAP;
        else A.x0 = B.x1 + GAP;
      } else if (A.z0 + A.z1 < B.z0 + B.z1) A.z1 = B.z0 - GAP;
      else A.z0 = B.z1 + GAP;
      if (A.x1 - A.x0 < 24 || A.z1 - A.z0 < 24) rects[a] = null;
    }
  return rects.map((r) =>
    r
      ? ([
          [r.x0, r.z0],
          [r.x1, r.z0],
          [r.x1, r.z1],
          [r.x0, r.z1],
        ] as Block['q'])
      : null,
  );
})();

// packages by part of the plan: the north, the middle, the south, and the housing areas
export const PACKAGE_ORDER = [2, 1, 3, 4];
const pkgOf = (use: Use, z: number) => (use === 'house' ? 4 : z < ZS[2] ? 1 : z < ZS[4] ? 2 : 3);

// playgrounds and sports courts in the neighbourhoods and the green zones
export type Court = { x: number; z: number; yaw: number; w: number; d: number; kind: 'basket' | 'football' };
export const INFILL = { playgrounds: [] as { x: number; z: number; yaw: number }[], courts: [] as Court[] };
function build() {
  const blocks: Block[] = [];
  const buildings: Building[] = [];
  const trees: Tree[] = [];
  let n = 0;
  for (const [k0, [label, use]] of PARCELS.entries()) {
    const q = TIDY[k0];
    if (!q) continue; // nothing usable left once squared up to its block
    const [cx, cz] = inQuad(q, 0.5, 0.5);
    // the plan's parcels that fall on the river or its far bank (the drawing and the real river differ) are left out
    if (cx > bankX(cz, -1) - 25) continue;
    const pkg = pkgOf(use, cz);
    const bi = blocks.length;
    blocks.push({ q, i: 0, j: 0, use, pkg, t0: 0, cx, cz, label });
    const add = (b: Omit<Building, 'pkg' | 'block' | 't0' | 'seed'>) => buildings.push({ ...b, pkg, block: bi, t0: 0, seed: rand(++n) });
    const w = Math.min(Math.hypot(q[1][0] - q[0][0], q[1][1] - q[0][1]), Math.hypot(q[2][0] - q[3][0], q[2][1] - q[3][1]));
    const d = Math.min(Math.hypot(q[3][0] - q[0][0], q[3][1] - q[0][1]), Math.hypot(q[2][0] - q[1][0], q[2][1] - q[1][1]));
    const yaw = Math.atan2(-(q[1][1] - q[0][1]), q[1][0] - q[0][0]);

    if (use === 'park') {
      const count = Math.round((w * d) / 380);
      for (let k = 0; k < count; k++) {
        const [tx, tz] = inQuad(q, rand(++n), rand(++n));
        trees.push({ x: tx, z: tz, s: 0.8 + rand(++n) * 0.8, kind: rand(++n) < 0.4 ? 1 : 0, t: rand(++n) });
      }
      continue;
    }
    if (use === 'school' || use === 'kinder') {
      const [sx, sz] = inQuad(q, 0.32, 0.45);
      add({ x: sx, z: sz, w: Math.min(w * 0.5, 70), d: use === 'school' ? 20 : 16, yaw, floors: use === 'school' ? 4 : 2, use, facade: 1, accent: 0 });
      continue;
    }
    if (use === 'office') {
      // the A core: towers on a shared podium, every one different
      const sets: Shape[][] = [
        ['landmark', 'twist', 'round'],
        ['stepped', 'glass'],
        ['round', 'twist'],
      ];
      const k = label === 'A-14' ? 0 : label === 'A-27' ? 1 : 2;
      add({ x: cx, z: cz, w: w - 18, d: d - 18, yaw, floors: 3, use, facade: 3, accent: 1, shape: 'podium' });
      const fl = (sh: Shape) => (sh === 'landmark' ? 52 : sh === 'twist' ? 40 : sh === 'round' ? 34 : sh === 'stepped' ? 30 : 32);
      const spots: P2[] = sets[k].length === 3 ? [inQuad(q, 0.28, 0.3), inQuad(q, 0.72, 0.36), inQuad(q, 0.45, 0.74)] : [inQuad(q, 0.3, 0.32), inQuad(q, 0.7, 0.68)];
      sets[k].forEach((sh, m) => add({ x: spots[m][0], z: spots[m][1], w: 26, d: 26, yaw: 0, floors: fl(sh), use, facade: 3, accent: (k + m) % 4, shape: sh }));
      continue;
    }
    // housing and mixed-use parcels: buildings along the parcel's edges in stepped sections, a courtyard inside
    const depth = 15;
    const gap = 8;
    const tall = use === 'shops' ? 1.25 : 1;
    const f0 = Math.floor(rand(++n) * 6);
    const a = Math.floor(rand(++n) * 4);
    const edge = (p0: P2, p1: P2, inward: 1 | -1, facade: number) => {
      const dx = p1[0] - p0[0];
      const dz = p1[1] - p0[1];
      const len = Math.hypot(dx, dz);
      if (len < 2 * gap + 18) return;
      const ux = dx / len;
      const uz = dz / len;
      const nx = -uz * inward;
      const nz = ux * inward;
      const run = len - 2 * gap;
      const parts = run > 90 ? 3 : run > 45 ? 2 : 1;
      const base = Math.round((9 + rand(++n) * 5) * tall);
      for (let k = 0; k < parts; k++) {
        const c = -run / 2 + (run / parts) * (k + 0.5);
        add({
          x: (p0[0] + p1[0]) / 2 + ux * c + nx * (depth / 2),
          z: (p0[1] + p1[1]) / 2 + uz * c + nz * (depth / 2),
          w: run / parts - 0.6,
          d: depth - (k % 2) * 1.2,
          yaw: Math.atan2(-uz, ux),
          floors: Math.max(5, base + [0, 3, -2][k % 3]),
          use,
          facade: (facade + k) % 6,
          accent: a,
        });
      }
    };
    const shrink = (p0: P2, p1: P2): [P2, P2] => {
      const k0 = Math.min(0.45, (gap + depth) / Math.hypot(p1[0] - p0[0], p1[1] - p0[1]));
      return [
        [p0[0] + (p1[0] - p0[0]) * k0, p0[1] + (p1[1] - p0[1]) * k0],
        [p1[0] - (p1[0] - p0[0]) * k0, p1[1] - (p1[1] - p0[1]) * k0],
      ];
    };
    edge(q[0], q[1], 1, f0);
    if (d > 45) {
      edge(q[3], q[2], -1, f0);
      const [w0, w1] = shrink(q[0], q[3]);
      edge(w0, w1, -1, (f0 + 1) % 6);
      const [e0, e1] = shrink(q[1], q[2]);
      edge(e0, e1, 1, (f0 + 1) % 6);
    }
    for (let k = 0; k < 6; k++) {
      const [tx, tz] = inQuad(q, 0.3 + rand(++n) * 0.4, 0.3 + rand(++n) * 0.4);
      trees.push({ x: tx, z: tz, s: 0.7 + rand(++n) * 0.4, kind: rand(++n) < 0.2 ? 1 : 0, t: rand(++n) });
    }
  }
  // the river park: along the west bank between the riverside road and the river
  for (let z = ZS[0]; z < ZS[ZS.length - 1]; z += 9) {
    const x0 = NS_LINES[2].x(z) + 14;
    const x1 = bankX(z, -1) - 6;
    for (let x = x0; x < x1; x += 11) if (rand(++n) < 0.5) trees.push({ x: x + rand(++n) * 6, z: z + rand(++n) * 6, s: 0.8 + rand(++n) * 0.7, kind: rand(++n) < 0.3 ? 1 : 0, t: rand(++n) });
  }
  // street trees
  for (const r of ROADS) {
    const total = roadLength(r);
    for (let s = 10; s < total - 10; s += 15) {
      const [x, z, tx, tz] = pointAt(r, s);
      for (const side of [-1, 1]) {
        const off = side * (r.width / 2 + 3.2);
        const px2 = x - tz * off;
        const pz2 = z + tx * off;
        if (px2 > bankX(pz2, -1) - 10 && px2 < bankX(pz2, 1) + 10) continue;
        if (r.axis === 'ns' ? ZS.some((zz) => Math.abs(pz2 - zz) < zWidth(zz) / 2 + 6) : NS_LINES.some((l) => Math.abs(px2 - l.x(pz2)) < l.width / 2 + 6)) continue;
        trees.push({ x: px2, z: pz2, s: 0.75, kind: 0, t: rand(++n) });
      }
    }
  }
  // ---- infill: the plan's blank areas between parcels and streets become house streets and gardens ----------------
  const parcelQuads = blocks.map((b) => b.q);
  const inside = (q: Block['q'], x: number, z: number, pad: number) => {
    // convex quad test, grown by pad metres
    for (let k = 0; k < 4; k++) {
      const [ax, az] = q[k];
      const [bx, bz] = q[(k + 1) % 4];
      const l = Math.hypot(bx - ax, bz - az) || 1;
      if (((bx - ax) * (z - az) - (bz - az) * (x - ax)) / l < -pad) return false;
    }
    return true;
  };
  const roadEnd = (z: number) => NS_LINES[NS_LINES.length - 1].x(z) + 26;
  const zRoads: [number, number] = [ZS[0] - 30 - EXT, ZS[ZS.length - 1] + 30 + EXT];
  // the area to fill: the plan and the cleared ring round it, up to where the existing city starts
  const A = { x0: PROJECT.x0 - 22, x1: PROJECT.x1 + 22, z0: PROJECT.z0 - 22, z1: PROJECT.z1 + 22 };
  const free = (x: number, z: number) => {
    if (x < A.x0 || x > A.x1 || z < A.z0 || z > A.z1) return false;
    // the river, and a strip of park along its east bank
    if (x > bankX(z, -1) - 16 && x < bankX(z, 1) + 60) return false;
    if (z > zRoads[0] && z < zRoads[1] && NS_LINES.some((l) => Math.abs(x - l.x(z)) < l.width / 2 + 9)) return false;
    if (ZS.some((zz) => Math.abs(z - zz) < zWidth(zz) / 2 + 9 && x < roadEnd(zz) + 4)) return false;
    if (parcelQuads.some((q) => inside(q, x, z, 7))) return false;
    return true;
  };
  const fillQ: Block['q'] = [
    [A.x0, A.z0],
    [A.x1, A.z0],
    [A.x1, A.z1],
    [A.x0, A.z1],
  ];
  const fi = blocks.length;
  blocks.push({ q: fillQ, i: 0, j: 0, use: 'housing', pkg: 4, t0: 0, cx: CENTRE[0], cz: CENTRE[1], label: '', ghost: true });
  // apartment blocks on a 46 × 40 m grid: one slab per plot, now and then a courtyard with a playground or a court
  const CW = 46;
  const RW = 40;
  const cols = Math.ceil((A.x1 - A.x0) / CW);
  const rows = Math.ceil((A.z1 - A.z0) / RW);
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) {
      const x = A.x0 + (i + 0.5) * CW;
      const z = A.z0 + (j + 0.5) * RW;
      // the whole slab must be clear, not just its middle
      if (![[0, 0], [-17, -6], [17, -6], [17, 6], [-17, 6]].every(([dx, dz]) => free(x + dx, z + dz))) continue;
      const r = rand(++n);
      if (r < 0.1) INFILL.playgrounds.push({ x, z, yaw: 0 });
      else if (r < 0.16) INFILL.courts.push({ x, z, yaw: 0, w: 15, d: 28, kind: 'basket' });
      else {
        const long = rand(++n) < 0.7;
        buildings.push({
          x,
          z,
          w: long ? 34 + rand(++n) * 6 : 16,
          d: long ? 13 : 16 + rand(++n) * 6,
          yaw: 0,
          floors: 5 + Math.floor(rand(++n) * 5),
          use: 'housing',
          facade: Math.floor(rand(++n) * 6),
          accent: Math.floor(rand(++n) * 4),
          pkg: 4,
          block: fi,
          t0: 0,
          seed: rand(++n),
        });
      }
      // trees along the front
      for (let k = 0; k < 2; k++) trees.push({ x: x - 14 + k * 28, z: z + 15, s: 0.7 + rand(++n) * 0.4, kind: rand(++n) < 0.3 ? 1 : 0, t: rand(++n) });
    }
  // a football pitch in each green zone
  blocks.forEach((b) => {
    if (b.use !== 'park') return;
    const [x, z] = inQuad(b.q, 0.35, 0.6);
    INFILL.courts.push({ x, z, yaw: 0, w: 18, d: 32, kind: 'football' });
  });

  // ---- nothing collides: no building in the river, on a street or a pavement, or on top of another --------------------
  const dry = (x: number, z: number, r: number) => x + r < bankX(z, -1) - 3 || x - r > bankX(z, 1) + 3;
  // on a carriageway or its pavement (margin = how far past the kerb counts)
  const onStreet = (x: number, z: number, margin: number) => {
    if (z > zRoads[0] && z < zRoads[1] && NS_LINES.some((l) => Math.abs(x - l.x(z)) < l.width / 2 + margin)) return true;
    return ZS.some((zz) => Math.abs(z - zz) < zWidth(zz) / 2 + margin && x > WEST_END - EXT - margin && x < roadEnd(zz) + margin);
  };
  const corners = (b: { x: number; z: number; w: number; d: number; yaw: number }): P2[] => {
    const c = Math.cos(b.yaw);
    const sn = Math.sin(b.yaw);
    const out: P2[] = [[b.x, b.z]];
    const k: [number, number][] = [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
      [0, -1],
      [0, 1],
      [-1, 0],
      [1, 0],
    ];
    for (const [u, v] of k) {
      const lx = (u * b.w) / 2;
      const lz = (v * b.d) / 2;
      out.push([b.x + lx * c + lz * sn, b.z - lx * sn + lz * c]);
    }
    return out;
  };
  const tower = (b: Building) => !!b.shape && b.shape !== 'podium';
  for (let k = buildings.length - 1; k >= 0; k--) {
    const b = buildings[k];
    if (tower(b)) continue; // towers stand on their podium
    if (!dry(b.x, b.z, Math.hypot(b.w, b.d) / 2)) {
      buildings.splice(k, 1);
      continue;
    }
    if (!corners(b).some(([x, z]) => onStreet(x, z, 5.5))) continue;
    // too close to a street: step it back (up to 30 m, in any direction) rather than lose it
    const x0 = b.x;
    const z0 = b.z;
    let ok = false;
    for (let r = 2; r <= 30 && !ok; r += 2)
      for (let a = 0; a < 8 && !ok; a++) {
        b.x = x0 + Math.cos((a * Math.PI) / 4) * r;
        b.z = z0 + Math.sin((a * Math.PI) / 4) * r;
        ok = dry(b.x, b.z, Math.hypot(b.w, b.d) / 2) && !corners(b).some(([x, z]) => onStreet(x, z, 5.5));
      }
    if (!ok) buildings.splice(k, 1);
  }
  // no two buildings overlap (towers on their own podium aside): the smaller one, or the infill one, gives way
  type Box = { x: number; z: number; w: number; d: number; yaw: number };
  const overlap = (a: Box, b: Box, gap: number) => {
    // separating axis test on the two footprints, grown by half the gap each
    const axes = [a.yaw, a.yaw + Math.PI / 2, b.yaw, b.yaw + Math.PI / 2].map((t) => [Math.cos(t), -Math.sin(t)] as const);
    const proj = (o: Box, [ax, az]: readonly [number, number]) => {
      const c = Math.cos(o.yaw);
      const sn = Math.sin(o.yaw);
      // the box's own axes in world space: local x → (c, −sn), local z → (sn, c)
      const r = Math.abs((c * ax - sn * az) * (o.w / 2 + gap / 2)) + Math.abs((sn * ax + c * az) * (o.d / 2 + gap / 2));
      const m = o.x * ax + o.z * az;
      return [m - r, m + r];
    };
    return axes.every((ax) => {
      const [a0, a1] = proj(a, ax);
      const [b0, b1] = proj(b, ax);
      return a1 > b0 && b1 > a0;
    });
  };
  const gone = new Set<Building>();
  for (let a = 0; a < buildings.length; a++)
    for (let b = a + 1; b < buildings.length; b++) {
      const A2 = buildings[a];
      const B2 = buildings[b];
      if (gone.has(A2) || gone.has(B2)) continue;
      if (tower(A2) || tower(B2)) continue;
      if (Math.hypot(A2.x - B2.x, A2.z - B2.z) > (Math.hypot(A2.w, A2.d) + Math.hypot(B2.w, B2.d)) / 2 + 4) continue;
      // the sections of one block stand side by side on purpose; anything else keeps a 4 m gap from the infill
      if (!overlap(A2, B2, A2.block === fi || B2.block === fi ? 4 : -0.4)) continue;
      const loser = A2.block === fi && B2.block !== fi ? A2 : B2.block === fi && A2.block !== fi ? B2 : A2.w * A2.d < B2.w * B2.d ? A2 : B2;
      gone.add(loser);
    }
  for (let k = buildings.length - 1; k >= 0; k--) if (gone.has(buildings[k])) buildings.splice(k, 1);
  // courts and playgrounds keep clear of the streets and the buildings; trees keep off the streets and the water
  const spots = (o: Box) => buildings.some((b) => !tower(b) && overlap(o, b, 3));
  for (let k = INFILL.courts.length - 1; k >= 0; k--) {
    const c = INFILL.courts[k];
    if (corners(c).some(([x, z]) => onStreet(x, z, 4.2)) || spots(c)) INFILL.courts.splice(k, 1);
  }
  for (let k = INFILL.playgrounds.length - 1; k >= 0; k--) {
    const p = INFILL.playgrounds[k];
    if (spots({ ...p, w: 22, d: 18 })) INFILL.playgrounds.splice(k, 1);
  }
  for (let k = trees.length - 1; k >= 0; k--) {
    const t = trees[k];
    if (!dry(t.x, t.z, 2) || onStreet(t.x, t.z, 0.5) || buildings.some((b) => !tower(b) && overlap({ x: t.x, z: t.z, w: 1, d: 1, yaw: 0 }, b, 1))) trees.splice(k, 1);
  }

  // build schedule: package by package, north to south within each
  const built = blocks.map((b, i) => ({ b, i })).filter(({ b }) => b.use !== 'park' && b.use !== 'plaza');
  built.sort((p, q) => PACKAGE_ORDER.indexOf(p.b.pkg) - PACKAGE_ORDER.indexOf(q.b.pkg) || p.b.cz - q.b.cz);
  built.forEach(({ b }, k) => (b.t0 = T.build[0] + (k / Math.max(1, built.length - 1)) * (T.build[1] - T.build[0])));
  for (const b of buildings) b.t0 = blocks[b.block].t0 + b.seed * 0.02;

  // the street grid's cells (for people walking between places)
  const cells: Block[] = [];
  for (let i = 0; i < NS_LINES.length - 1; i++)
    for (let j = 0; j < ZS.length - 1; j++) {
      const L = NS_LINES[i];
      const R = NS_LINES[i + 1];
      const zt = ZS[j] + zWidth(ZS[j]) / 2 + 4;
      const zb = ZS[j + 1] - zWidth(ZS[j + 1]) / 2 - 4;
      const q: Block['q'] = [
        [L.x(zt) + L.width / 2 + 4, zt],
        [R.x(zt) - R.width / 2 - 4, zt],
        [R.x(zb) - R.width / 2 - 4, zb],
        [L.x(zb) + L.width / 2 + 4, zb],
      ];
      const [cx, cz] = inQuad(q, 0.5, 0.5);
      cells.push({ q, i, j, use: 'plaza', pkg: 0, t0: 0, cx, cz, label: '' });
    }
  return { blocks, buildings, trees, cells };
}

export const DISTRICT = build();

// ---- the river park and the neighbourhoods: paths, benches, lamps, footbridges, cafés, playgrounds -----------------
export type Spot = { x: number; z: number; yaw: number };
function amenities() {
  const benches: Spot[] = [];
  const lamps: Spot[] = [];
  const footbridges: Spot[] = [];
  const cafes: Spot[] = [];
  const playgrounds: Spot[] = [];
  const flowers: Spot[] = [];
  let n = 900;
  for (let z = ZS[0] + 12; z < ZS[ZS.length - 1] - 12; z += 26) {
    if (ZS.some((zz) => Math.abs(z - zz) < 14)) continue;
    const dx = (riverX(z + 1) - riverX(z - 1)) / 2;
    const yaw = Math.atan2(-1, dx);
    for (const side of [-1, 1]) {
      const x = bankX(z, side) + side * 19;
      if (side < 0 && x < NS_LINES[2].x(z) + 14) continue;
      benches.push({ x: x + side * 2.6, z, yaw: yaw + (side > 0 ? Math.PI : 0) });
      if (Math.round(z / 26) % 2 === 0) lamps.push({ x: x - side * 2.6, z, yaw });
    }
    if (rand(++n) < 0.25) flowers.push({ x: rand(++n) < 0.5 ? bankX(z, -1) - 10 : bankX(z, 1) + 30, z, yaw: 0 });
  }
  for (let j = 0; j < ZS.length - 1; j++) {
    const z = (ZS[j] + ZS[j + 1]) / 2;
    // footbridges only where the channel is narrow
    if (riverEast(z) < RIVER_W) footbridges.push({ x: riverX(z), z, yaw: 0 });
    if (j % 2 === 0) cafes.push({ x: bankX(z - 40, 1) + 35, z: z - 40, yaw: 0 });
  }
  // playgrounds in the housing courtyards and the low-rise neighbourhoods, benches round them
  DISTRICT.blocks.forEach((b, k) => {
    if (b.ghost) return;
    if (b.use !== 'housing' && b.use !== 'park') return; // the house areas get theirs with the infill
    if (b.use === 'park' && rand(k + 50) < 0.5) return;
    const [px2, pz2] = inQuad(b.q, 0.5, 0.55);
    playgrounds.push({ x: px2, z: pz2, yaw: 0 });
    benches.push({ x: px2 - 11, z: pz2 - 7, yaw: Math.PI / 2 }, { x: px2 + 11, z: pz2 - 7, yaw: -Math.PI / 2 });
  });
  for (const p of INFILL.playgrounds) {
    playgrounds.push(p);
    benches.push({ x: p.x - 7.5, z: p.z - 6, yaw: Math.PI / 2 }, { x: p.x + 7.5, z: p.z - 6, yaw: -Math.PI / 2 });
  }
  return { benches, lamps, footbridges, cafes, playgrounds, flowers, courts: INFILL.courts };
}
export const AMENITIES = amenities();

// Bus stops: on the avenue's bus corridor and on the main east–west street.
export const STOPS: { road: number; x: number; z: number }[] = [
  ...[px(0, 50)[1], px(0, 250)[1], px(0, 420)[1], px(0, 500)[1]].map((z) => ({ road: BRT_LINE, x: NS_LINES[BRT_LINE].x(z), z })),
  ...[px(80, 0)[0], px(160, 0)[0]].map((x) => ({ road: NS_LINES.length + ZS.indexOf(AVENUE_Z), x, z: AVENUE_Z })),
];

const quadArea = (q: Block['q']) => Math.abs(q.reduce((a, p, i) => a + p[0] * q[(i + 1) % 4][1] - q[(i + 1) % 4][0] * p[1], 0)) / 2;
const total = (PROJECT.x1 - PROJECT.x0) * (PROJECT.z1 - PROJECT.z0);
export const DISTRICT_FIGURES = {
  hectares: Math.round(total / 10000),
  buildings: DISTRICT.buildings.filter((b) => b.use === 'housing' || b.use === 'shops' || b.use === 'house').length,
  greenPct: Math.round((DISTRICT.blocks.filter((b) => b.use === 'park').reduce((a, b) => a + quadArea(b.q), 0) / total) * 100),
  stops: STOPS.length,
  schools: DISTRICT.blocks.filter((b) => b.use === 'school' || b.use === 'kinder').length,
};
