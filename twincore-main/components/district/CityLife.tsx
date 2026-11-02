'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import {
  AMENITIES,
  DISTRICT,
  FLOOR_H,
  NS_LINES,
  PLINTH_H,
  RIVER_W,
  ROADS,
  STOPS,
  T,

  ZS,
  ewWidth,
  inQuad,
  junctionAt,
  nsWidth,
  pointAt,
  riverX,
  PROJECT,
  roadLength,
  sAt,
  type Block,
  type Road,
} from '@/lib/district';
import type { Timeline } from './DistrictCanvas';

// Life on the streets and in the courtyards, by the rules.
//  - Traffic lights at every junction (east–west green, amber, all-red, north–south green, amber, all-red).
//  - Vehicles keep to their lane on the right, keep a safe gap, stop at the stop line on amber/red; buses pull in
//    at their stops. Every car is different; buses and construction trucks share one livery.
//  - People walk on the pavements and cross at the zebra crossings on their own green, keeping to the right and
//    stepping round each other. Others go about their day: children play on the playgrounds, people sit on the
//    benches, wait at the bus stops and stand out on their balconies. Umbrellas come out in the rain.

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const ramp = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const rnd = (n: number) => {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

// How busy the streets are through the day (0 = empty): quiet before dawn, busy by day, thinning late at night.
const activity = (h: number) => {
  if (h < 5) return 0.08;
  if (h < 7) return 0.08 + ((h - 5) / 2) * 0.62;
  if (h < 20) return 0.7 + 0.3 * Math.sin(((h - 7) / 13) * Math.PI);
  if (h < 23) return 0.7 - ((h - 20) / 3) * 0.55;
  return 0.12;
};
const childrenOut = (h: number) => h >= 8 && h < 20.5;
const busesRun = (h: number) => h >= 6 && h < 23.5;

// ---- network -----------------------------------------------------------------------------------------------------
const NX = NS_LINES.length;
const NZ = ZS.length;
const junction = (i: number, j: number) => i * NZ + j;
const SIDE = 2; // pavement centre beyond the kerb
const lenOf = ROADS.map(roadLength);
const normalAt = (r: Road, s: number) => {
  const [, , tx, tz] = pointAt(r, s);
  return [-tz, tx] as const; // to the right of the road's direction
};

// ---- traffic lights ------------------------------------------------------------------------------------------------
const CYCLE = 33;
const OFFSET = Array.from({ length: NX * NZ }, (_, j) => (Math.floor(j / NZ) * 4 + (j % NZ) * 7) % CYCLE);
type Phase = 'xg' | 'xa' | 'red' | 'zg' | 'za';
const phaseAt = (j: number, clock: number): [Phase, number] => {
  const k = (clock + OFFSET[j]) % CYCLE;
  if (k < 13) return ['xg', k];
  if (k < 15) return ['xa', k - 13];
  if (k < 16.5) return ['red', 0];
  if (k < 29.5) return ['zg', k - 16.5];
  if (k < 31.5) return ['za', k - 29.5];
  return ['red', 0];
};
// 'x' = east–west traffic, 'z' = north–south
const carMay = (ph: Phase, axis: 'x' | 'z') => (axis === 'x' ? ph === 'xg' : ph === 'zg');
const carAmber = (ph: Phase, axis: 'x' | 'z') => (axis === 'x' ? ph === 'xa' : ph === 'za');
// walking east–west crosses a north–south road: allowed during the east–west green (its first 9 s)
const walkMay = (ph: Phase, k: number, moving: 'x' | 'z') => (moving === 'x' ? ph === 'xg' && k < 9 : ph === 'zg' && k < 9);

// ---- vehicles ---------------------------------------------------------------------------------------------------
type Lane = { road: number; off: number; dir: 1 | -1; axis: 'x' | 'z'; len: number; junctions: { s: number; j: number; half: number }[]; stops: number[] };
type Kind = 'car' | 'bus' | 'truck';
// shown: on the street now (it only comes or goes where the camera can't see); hold: back at the start of its lane,
// waiting until that spot is out of view before it drives in
type Vehicle = { lane: number; s: number; v: number; vmax: number; kind: Kind; len: number; on: number; wait: number; served: number; model: number; shown: boolean; hold: boolean };
const MODELS = [
  { L: 4.6, W: 1.85, H: 0.72, cl: 2.4, ch: 0.62, co: -0.15 },
  { L: 4.0, W: 1.78, H: 0.74, cl: 2.2, ch: 0.68, co: -0.45 },
  { L: 4.8, W: 1.95, H: 0.95, cl: 3.0, ch: 0.78, co: -0.3 },
  { L: 5.3, W: 1.95, H: 0.9, cl: 1.9, ch: 0.8, co: 0.9 },
  { L: 5.0, W: 1.95, H: 1.0, cl: 3.9, ch: 1.05, co: -0.4 },
  { L: 4.4, W: 1.92, H: 0.58, cl: 1.8, ch: 0.48, co: -0.2 },
];
type Car = { L: number; W: number; H: number; cl: number; ch: number; co: number; color: THREE.Color };
const makeCar = (i: number): Car => {
  const m = MODELS[Math.floor(rnd(i * 7 + 1) * MODELS.length)];
  const j = 0.94 + rnd(i * 7 + 2) * 0.12;
  const color = new THREE.Color().setHSL((i * 0.6180339) % 1, 0.15 + rnd(i * 7 + 3) * 0.65, 0.22 + rnd(i * 7 + 4) * 0.5);
  return { L: m.L * j, W: m.W * (0.97 + rnd(i * 7 + 5) * 0.06), H: m.H, cl: m.cl * j, ch: m.ch, co: m.co * j, color };
};

// ---- pedestrian network: pavement corners at every junction ----------------------------------------------------------
type Edge = { to: number; d: number; cross?: { j: number; moving: 'x' | 'z' } };
const NODE = (i: number, j: number, cx: number, cz: number) => (junction(i, j) * 2 + (cx > 0 ? 1 : 0)) * 2 + (cz > 0 ? 1 : 0);
const GRAPH = (() => {
  const pos: [number, number][] = [];
  const edges: Edge[][] = [];
  for (let i = 0; i < NX; i++)
    for (let j = 0; j < NZ; j++) {
      const [x, z] = junctionAt(i, j);
      const r = ROADS[i];
      const [nx, nz] = normalAt(r, sAt(r, x, z)); // across the north–south road (points west for a southbound line)
      for (const cx of [-1, 1])
        for (const cz of [-1, 1]) {
          const a = cx * (nsWidth(i) / 2 + SIDE);
          const b = cz * (ewWidth(j) / 2 + SIDE);
          const n = NODE(i, j, cx, cz);
          // east of the line is -normal (the normal of a southbound line points west)
          pos[n] = [x - nx * a, z - nz * a + b];
          edges[n] = [];
        }
    }
  const link = (a: number, b: number, cross?: Edge['cross']) => {
    const d = Math.hypot(pos[a][0] - pos[b][0], pos[a][1] - pos[b][1]);
    edges[a].push({ to: b, d, cross });
    edges[b].push({ to: a, d, cross });
  };
  for (let i = 0; i < NX; i++)
    for (let j = 0; j < NZ; j++) {
      const J = junction(i, j);
      for (const cz of [-1, 1]) link(NODE(i, j, -1, cz), NODE(i, j, 1, cz), { j: J, moving: 'x' });
      for (const cx of [-1, 1]) link(NODE(i, j, cx, -1), NODE(i, j, cx, 1), { j: J, moving: 'z' });
      if (i + 1 < NX) for (const cz of [-1, 1]) link(NODE(i, j, 1, cz), NODE(i + 1, j, -1, cz));
      if (j + 1 < NZ) for (const cx of [-1, 1]) link(NODE(i, j, cx, 1), NODE(i, j + 1, cx, -1));
    }
  return { pos, edges };
})();
function route(from: number, to: number): { n: number; cross?: Edge['cross'] }[] {
  const N = GRAPH.pos.length;
  const dist = new Float64Array(N).fill(Infinity);
  const prev = new Int32Array(N).fill(-1);
  const via: (Edge['cross'] | undefined)[] = [];
  const done = new Uint8Array(N);
  dist[from] = 0;
  for (;;) {
    let u = -1;
    for (let i = 0; i < N; i++) if (!done[i] && dist[i] < Infinity && (u < 0 || dist[i] < dist[u])) u = i;
    if (u < 0 || u === to) break;
    done[u] = 1;
    for (const e of GRAPH.edges[u]) {
      const d = dist[u] + e.d + (e.cross ? 8 : 0);
      if (d < dist[e.to]) {
        dist[e.to] = d;
        prev[e.to] = u;
        via[e.to] = e.cross;
      }
    }
  }
  const out: { n: number; cross?: Edge['cross'] }[] = [];
  for (let n = to; n !== -1 && n !== from; n = prev[n]) out.unshift({ n, cross: via[n] });
  return out;
}
const nearestNode = (x: number, z: number) => {
  let best = 0;
  let bd = Infinity;
  GRAPH.pos.forEach(([px, pz], n) => {
    const d = (px - x) ** 2 + (pz - z) ** 2;
    if (d < bd) {
      bd = d;
      best = n;
    }
  });
  return best;
};

// Places people go: courtyards (in through the open corners), the river park and the square.
// Each parcel is reached from the corners of the street-grid cell it sits in.
type Place = { b: Block; cell: Block; corners: number[]; yard: boolean; weight: number };
const cellOf = (x: number, z: number) =>
  DISTRICT.cells.find((c) => x >= NS_LINES[c.i].x(z) && x < NS_LINES[c.i + 1].x(z) && z >= ZS[c.j] && z < ZS[c.j + 1]);
const PLACES: Place[] = DISTRICT.blocks
  .filter((b) => !b.ghost && b.use !== 'school' && b.use !== 'kinder' && b.use !== 'office')
  .flatMap((b) => {
    const cell = cellOf(b.cx, b.cz);
    if (!cell) return [];
    return [
      {
        b,
        cell,
        corners: [NODE(cell.i, cell.j, 1, 1), NODE(cell.i + 1, cell.j, -1, 1), NODE(cell.i + 1, cell.j + 1, -1, -1), NODE(cell.i, cell.j + 1, 1, -1)],
        yard: b.use === 'housing' || b.use === 'shops',
        weight: b.use === 'park' ? 2.5 : 1,
      },
    ];
  });
// the way in from corner k (0 NW, 1 NE, 2 SE, 3 SW) of the cell, then across to the parcel
const entry = (p: Place, k: number): [number, number][] => {
  const u = k === 1 || k === 2 ? 1 : 0;
  const v = k >= 2 ? 1 : 0;
  const s = (a: number, toward: number) => (toward ? 1 - a : a);
  const near = inQuad(p.cell.q, s(0.03, u), s(0.03, v));
  if (!p.yard) return [near, inQuad(p.b.q, s(0.1, u), s(0.1, v))];
  return [near, inQuad(p.b.q, 0.5, s(0.02, v)), inQuad(p.b.q, 0.5, s(0.3, v))];
};
const wanderPoint = (p: Place, r1: number, r2: number) => (p.yard ? inQuad(p.b.q, 0.24 + r1 * 0.52, 0.26 + r2 * 0.5) : inQuad(p.b.q, 0.08 + r1 * 0.84, 0.08 + r2 * 0.84));
const pickPlace = (r: number) => {
  const total = PLACES.reduce((a, p) => a + p.weight, 0);
  let k = r * total;
  for (const p of PLACES) if ((k -= p.weight) <= 0) return p;
  return PLACES[0];
};

// ---- the playgrounds in the rain and the snow: where the puddles are, where the snowman stands, the sledging slope ---
const PUDDLES = (ax: number, az: number): [number, number][] => [
  [ax - 3.5, az + 4],
  [ax + 3, az + 5.5],
];
const SNOW = (ax: number, az: number) => ({
  man: [ax + 4.5, az - 1] as [number, number],
  top: [ax - 9, az - 5] as [number, number],
  bottom: [ax - 9, az + 8] as [number, number],
  a: [ax - 4, az - 7.5] as [number, number],
  b: [ax + 4, az - 7.5] as [number, number],
});

// ---- people -----------------------------------------------------------------------------------------------------
type Step = { x: number; z: number; cross?: { j: number; moving: 'x' | 'z' } };
type Mode = 'walk' | 'play' | 'sit' | 'wait' | 'balcony';
type Pose = 'none' | 'build' | 'sled' | 'throw' | 'jump';
type Person = {
  pose: Pose;
  stride: number; // walk-cycle phase, advanced by the distance actually covered
  gait: number; // 0 standing … 1 walking, eased
  group: number; // playground
  slot: number; // which child of the group
  girl: boolean; // woman / girl (else man / boy)
  bag: boolean;
  skirt: boolean;
  shorts: boolean;
  on: boolean;
  mode: Mode;
  x: number;
  z: number;
  y: number;
  yaw: number;
  path: Step[];
  place: Place | null;
  stay: number;
  v: number;
  phase: number;
  crossing: boolean;
  kid: boolean;
  anchor: [number, number];
  umbrella: boolean;
};

// balconies with someone out on them (world positions, from the buildings' own frames)
const BALCONY_SPOTS = (() => {
  const out: { x: number; y: number; z: number; yaw: number; b: number }[] = [];
  let n = 5;
  DISTRICT.buildings.forEach((b, bi) => {
    if ((b.use !== 'housing' && b.use !== 'shops') || b.floors < 5 || Math.min(b.w, b.d) > 16) return;
    const alongX = b.w >= b.d;
    const len = alongX ? b.w : b.d;
    const c = Math.cos(b.yaw);
    const sn = Math.sin(b.yaw);
    for (let s = -len / 2 + 7; s <= len / 2 - 7; s += 14.4)
      for (const side of [-1, 1])
        for (let f = 1; f < b.floors; f++) {
          if (rnd(++n) > 0.035) continue;
          const off = (alongX ? b.d : b.w) / 2 + 0.9;
          const lx = alongX ? s : side * off;
          const lz = alongX ? side * off : s;
          // rotate the local point by the building's yaw (three.js: x' = x cos + z sin, z' = −x sin + z cos)
          out.push({ x: b.x + lx * c + lz * sn, y: PLINTH_H + (f - 1) * FLOOR_H + 0.2, z: b.z - lx * sn + lz * c, yaw: b.yaw + (alongX ? (side > 0 ? 0 : Math.PI) : side > 0 ? Math.PI / 2 : -Math.PI / 2), b: bi });
        }
  });
  return out;
})();

export default function CityLife({ timeline }: { timeline: React.RefObject<Timeline> }) {
  // ---------- lanes and vehicles ----------
  const sim = useMemo(() => {
    const lanes: Lane[] = [];
    const vehicles: Vehicle[] = [];
    let n = 0;
    let cars = 0;
    ROADS.forEach((r, ri) => {
      const L = lenOf[ri];
      const ns = r.axis === 'ns';
      const lanesHere: { off: number; bus: boolean }[] =
        r.kind === 'brt'
          ? [
              { off: 4, bus: false },
              { off: -4, bus: false },
              { off: 11.5, bus: true },
              { off: -11.5, bus: true },
            ]
          : r.kind === 'avenue'
            ? [
                { off: 4, bus: false },
                { off: -4, bus: false },
                { off: 8.5, bus: true },
                { off: -8.5, bus: true },
              ]
            : [
                { off: r.width / 4, bus: false },
                { off: -r.width / 4, bus: false },
              ];
      for (const { off, bus } of lanesHere) {
        // drive on the right: positive offsets (to the right of the line's direction) travel along it
        const dir: 1 | -1 = off > 0 ? 1 : -1;
        const along = (s: number) => (dir > 0 ? s : L - s);
        const junctions = (ns ? ZS.map((_, j) => junctionAt(r.line, j)) : NS_LINES.map((_, i) => junctionAt(i, r.line))).map(([x, z], k) => ({
          s: along(sAt(r, x, z)),
          j: ns ? junction(r.line, k) : junction(k, r.line),
          half: (ns ? ewWidth(k) : nsWidth(k)) / 2,
        }));
        junctions.sort((a, b) => a.s - b.s);
        const stops = bus ? STOPS.filter((st) => st.road === ri).map((st) => along(sAt(r, st.x, st.z))).sort((a, b) => a - b) : [];
        const li = lanes.length;
        lanes.push({ road: ri, off, dir, axis: ns ? 'z' : 'x', len: L, junctions, stops });
        if (bus) for (let k = 0; k < 3; k++) vehicles.push({ lane: li, s: (L / 3) * k + 30, v: 0, vmax: 11, kind: 'bus', len: 12.5, on: k / 3, wait: 0, served: -1, model: -1, shown: false, hold: false });
        else {
          const count = Math.max(3, Math.round(L / 150));
          for (let k = 0; k < count; k++) {
            const truck = rnd(++n) < 0.1;
            vehicles.push({ lane: li, s: (L / count) * k + rnd(++n) * 20, v: 0, vmax: 9 + rnd(++n) * 4, kind: truck ? 'truck' : 'car', len: truck ? 8.5 : 4.8, on: rnd(++n), wait: 0, served: -1, model: truck ? -1 : cars++, shown: false, hold: false });
          }
        }
      }
    });
    // the cross streets end at the riverside road: eastbound traffic turns onto it there instead of vanishing
    const side = ROADS.findIndex((r) => r.axis === 'ns' && r.line === NS_LINES.length - 1);
    const sideLanes = lanes.map((l, k) => ({ l, k })).filter(({ l }) => l.road === side);
    const turns = lanes.map((l) => {
      if (l.axis !== 'x' || l.dir < 0) return null;
      const r = ROADS[l.road];
      const [jx, jz] = junctionAt(NS_LINES.length - 1, r.line);
      return { at: sAt(r, jx, jz), to: sideLanes.map(({ l: sl, k }) => ({ lane: k, s: sl.dir > 0 ? sAt(ROADS[sl.road], jx, jz) : sl.len - sAt(ROADS[sl.road], jx, jz) })) };
    });
    // parked cars along the local streets
    const parked: { x: number; z: number; yaw: number; on: number; model: number }[] = [];
    let p = 9;
    ROADS.forEach((r, ri) => {
      if (r.kind !== 'street') return;
      for (let s = 24; s < lenOf[ri] - 24; s += 6.4)
        for (const side of [-1, 1]) {
          if (rnd(++p) > 0.42) continue;
          const [x, z, tx, tz] = pointAt(r, s);
          const off = side * (r.width / 2 - 1.2);
          const px = x - tz * off;
          const pz = z + tx * off;
          if (r.axis === 'ew' && px < NS_LINES[0].x(pz)) continue;
          if (pz < PROJECT.z0 || pz > PROJECT.z1) continue; // parked cars only in the district
          if (Math.abs(px - riverX(pz)) < RIVER_W + 20) continue;
          if (r.axis === 'ns' ? ZS.some((zz, j) => Math.abs(pz - zz) < ewWidth(j) / 2 + 10) : NS_LINES.some((l, i) => Math.abs(px - l.x(pz)) < nsWidth(i) / 2 + 10)) continue;
          parked.push({ x: px, z: pz, yaw: Math.atan2(-tz, tx), on: rnd(++p), model: cars++ });
        }
    });
    const models = Array.from({ length: cars }, (_, i) => makeCar(i));
    return { lanes, vehicles, parked, models, turns };
  }, []);

  // ---------- people ----------
  const WALKERS = 1300;
  const people = useMemo<Person[]>(() => {
    const base = (i: number, mode: Mode, kid = false): Person => ({
      pose: 'none',
      stride: rnd(i + 11) * 6,
      gait: 0,
      group: -1,
      slot: 0,
      girl: rnd(i * 13 + 7) < 0.5,
      bag: rnd(i * 37 + 1) < 0.3,
      skirt: rnd(i * 17 + 3) < 0.45,
      shorts: rnd(i * 19 + 5) < 0.35,
      on: false,
      mode,
      x: 0,
      z: 0,
      y: 0,
      yaw: 0,
      path: [],
      place: null,
      stay: 0,
      v: kid ? 1.6 : 1.15 + rnd(i) * 0.5,
      phase: rnd(i + 3) * 6,
      crossing: false,
      kid,
      anchor: [0, 0],
      umbrella: rnd(i + 17) < 0.65,
    });
    const out: Person[] = [];
    for (let i = 0; i < WALKERS; i++) out.push(base(i, 'walk'));
    // children on each playground, people on the benches, at the bus stops and on the balconies
    AMENITIES.playgrounds.forEach((pg, k) => {
      for (let c = 0; c < 5; c++) {
        const p = base(2000 + k * 7 + c, 'play', true);
        p.anchor = [pg.x, pg.z];
        p.group = k;
        p.slot = c;
        out.push(p);
      }
      const parent = base(2600 + k, 'sit');
      parent.anchor = [pg.x - 9, pg.z - 6];
      out.push(parent);
    });
    AMENITIES.benches.forEach((bn, k) => {
      if (rnd(k + 300) > 0.45) return;
      const p = base(3000 + k, 'sit');
      p.anchor = [bn.x, bn.z];
      p.yaw = bn.yaw;
      out.push(p);
    });
    STOPS.forEach((st, k) => {
      const r = ROADS[st.road];
      const s = sAt(r, st.x, st.z);
      const [x, z, tx, tz] = pointAt(r, s);
      for (const side of [-1, 1])
        for (let c = 0; c < 3; c++) {
          const p = base(4000 + k * 11 + c + (side > 0 ? 5 : 0), 'wait');
          const off = side * (r.width / 2 + 2.2);
          p.anchor = [x - tz * off + tx * (c * 1.6 - 1.6), z + tx * off + tz * (c * 1.6 - 1.6)];
          p.yaw = Math.atan2(-(-tz * side), -tx * side);
          out.push(p);
        }
    });
    BALCONY_SPOTS.forEach((bs, k) => {
      const p = base(5000 + k, 'balcony');
      p.anchor = [bs.x, bs.z];
      p.y = bs.y;
      p.yaw = bs.yaw;
      out.push(p);
    });
    return out;
  }, []);
  const clock = useRef(0);
  const spawnClock = useRef(0);

  // What the children of a playground do, by the weather. Sun: running round. Rain (in their raincoats): splashing
  // in the puddles, two still running. Snow: two build a snowman, one goes sledging, two have a snowball fight.
  const ease2 = (k: number) => k * k * (3 - 2 * k);
  const facing = (pr: Person, tx: number, tz: number) => (pr.yaw = Math.atan2(-(tz - pr.z), tx - pr.x));
  const play = (pr: Person, now: number, w: 'sun' | 'rain' | 'snow') => {
    const [ax, az] = pr.anchor;
    const run = () => {
      const a = now * (0.45 + rnd(pr.slot + pr.group) * 0.35) + pr.phase;
      const r = 3 + rnd(pr.slot * 3 + pr.group) * 4;
      pr.x = ax + Math.cos(a) * r;
      pr.z = az + Math.sin(a) * r * 0.7;
      pr.yaw = -a - Math.PI / 2;
    };
    if (w === 'sun') return run();
    if (w === 'rain') {
      if (pr.slot > 2) return run();
      const [px, pz] = PUDDLES(ax, az)[pr.slot % 2];
      pr.x = px + Math.cos(pr.slot * 2.1) * 0.9;
      pr.z = pz + Math.sin(pr.slot * 2.1) * 0.9;
      facing(pr, px, pz);
      pr.pose = 'jump';
      return;
    }
    const S = SNOW(ax, az);
    if (pr.slot <= 1) {
      // round the snowman, patting it into shape
      const a = pr.slot ? 2.4 : 0.6;
      pr.x = S.man[0] + Math.cos(a) * 1.15;
      pr.z = S.man[1] + Math.sin(a) * 1.15;
      facing(pr, S.man[0], S.man[1]);
      pr.pose = 'build';
    } else if (pr.slot === 2) {
      // down the slope on the sled, then walk it back up
      const u = ((now + pr.phase) % 11) / 11;
      const [x0, z0] = S.top;
      const [x1, z1] = S.bottom;
      if (u < 0.3) {
        const k = ease2(u / 0.3);
        pr.x = x0 + (x1 - x0) * k;
        pr.z = z0 + (z1 - z0) * k;
        facing(pr, x1, z1);
        pr.pose = 'sled';
      } else {
        const k = (u - 0.3) / 0.7;
        pr.x = x1 + (x0 - x1) * k;
        pr.z = z1 + (z0 - z1) * k;
        facing(pr, x0, z0);
      }
    } else {
      // a snowball fight across the playground
      const [mx, mz] = pr.slot === 3 ? S.a : S.b;
      const [tx, tz] = pr.slot === 3 ? S.b : S.a;
      pr.x = mx + Math.sin(now * 0.9 + pr.phase) * 0.6;
      pr.z = mz;
      facing(pr, tx, tz);
      pr.pose = 'throw';
    }
  };

  const goTo = (p: Person, fromNode: number, target: Place) => {
    let best = 0;
    target.corners.forEach((c, k) => {
      const [x, z] = GRAPH.pos[c];
      const [bx, bz] = GRAPH.pos[target.corners[best]];
      if ((x - p.x) ** 2 + (z - p.z) ** 2 < (bx - p.x) ** 2 + (bz - p.z) ** 2) best = k;
    });
    const steps: Step[] = [{ x: GRAPH.pos[fromNode][0], z: GRAPH.pos[fromNode][1] }];
    for (const s of route(fromNode, target.corners[best])) steps.push({ x: GRAPH.pos[s.n][0], z: GRAPH.pos[s.n][1], cross: s.cross });
    for (const [x, z] of entry(target, best)) steps.push({ x, z });
    p.path = steps;
    p.place = target;
    p.stay = 0;
  };
  const spawnWalker = (x: number, z: number, seed: number) => {
    const p = people.find((q) => q.mode === 'walk' && !q.on);
    if (!p) return;
    p.on = true;
    p.x = x;
    p.z = z;
    goTo(p, nearestNode(x, z), pickPlace(rnd(seed)));
  };
  const leave = (p: Person, seed: number) => {
    const from = p.place!;
    const k = Math.floor(rnd(seed) * 4);
    const out: Step[] = entry(from, k)
      .reverse()
      .map(([x, z]) => ({ x, z }));
    goTo(p, from.corners[k], pickPlace(rnd(seed + 1)));
    p.path = [...out, ...p.path];
  };

  // ---------- meshes ----------
  const nCars = sim.models.length;
  const nBus = sim.vehicles.filter((v) => v.kind === 'bus').length;
  const nTruck = sim.vehicles.filter((v) => v.kind === 'truck').length;
  const nPeople = people.length;
  const refs = {
    body: useRef<THREE.InstancedMesh>(null),
    cabin: useRef<THREE.InstancedMesh>(null),
    roof: useRef<THREE.InstancedMesh>(null),
    wheels: useRef<THREE.InstancedMesh>(null),
    heads: useRef<THREE.InstancedMesh>(null),
    tails: useRef<THREE.InstancedMesh>(null),
    busBody: useRef<THREE.InstancedMesh>(null),
    busGlass: useRef<THREE.InstancedMesh>(null),
    truckCab: useRef<THREE.InstancedMesh>(null),
    truckDrum: useRef<THREE.InstancedMesh>(null),
    bigWheels: useRef<THREE.InstancedMesh>(null),
    signals: useRef<THREE.InstancedMesh>(null),
    torso: useRef<THREE.InstancedMesh>(null),
    head: useRef<THREE.InstancedMesh>(null),
    hair: useRef<THREE.InstancedMesh>(null),
    longHair: useRef<THREE.InstancedMesh>(null),
    skirt: useRef<THREE.InstancedMesh>(null),
    legL: useRef<THREE.InstancedMesh>(null),
    legR: useRef<THREE.InstancedMesh>(null),
    armL: useRef<THREE.InstancedMesh>(null),
    armR: useRef<THREE.InstancedMesh>(null),
    brolly: useRef<THREE.InstancedMesh>(null),
    shoes: useRef<THREE.InstancedMesh>(null),
    bag: useRef<THREE.InstancedMesh>(null),
    // bus details
    busRoof: useRef<THREE.InstancedMesh>(null),
    busStripe: useRef<THREE.InstancedMesh>(null),
    busFront: useRef<THREE.InstancedMesh>(null),
    busSign: useRef<THREE.InstancedMesh>(null),
    busDoor: useRef<THREE.InstancedMesh>(null),
    // car bumpers and number plates
    trim: useRef<THREE.InstancedMesh>(null),
    // the weather's games
    puddle: useRef<THREE.InstancedMesh>(null),
    snowman: useRef<THREE.InstancedMesh>(null),
    carrot: useRef<THREE.InstancedMesh>(null),
    sled: useRef<THREE.InstancedMesh>(null),
    snowball: useRef<THREE.InstancedMesh>(null),
  };
  const nGroups = AMENITIES.playgrounds.length;
  const hidden = useRef(new Uint8Array(people.length));
  const headMat = useRef<THREE.MeshBasicMaterial>(null);
  const tailMat = useRef<THREE.MeshBasicMaterial>(null);
  const tmp = useMemo(
    () => ({ e: new THREE.Euler(), m: new THREE.Matrix4(), base: new THREE.Matrix4(), part: new THREE.Matrix4(), rot: new THREE.Matrix4(), sc: new THREE.Matrix4(), off: new THREE.Matrix4(), q: new THREE.Quaternion(), p: new THREE.Vector3(), s: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0), zero: new THREE.Matrix4().makeScale(0, 0, 0), c: new THREE.Color() }),
    [],
  );
  const signalHeads = useMemo(() => {
    const out: { x: number; z: number; j: number; axis: 'x' | 'z' }[] = [];
    for (let i = 0; i < NX; i++)
      for (let j = 0; j < NZ; j++)
        for (const cx of [-1, 1])
          for (const cz of [-1, 1]) {
            const [x, z] = GRAPH.pos[NODE(i, j, cx, cz)];
            out.push({ x, z, j: junction(i, j), axis: cx === cz ? 'x' : 'z' });
          }
    return out;
  }, []);

  const placeCar = (i: number, base: THREE.Matrix4 | null) => {
    const { part, zero, m } = tmp;
    const md = sim.models[i];
    const R = refs;
    if (!base) {
      for (const r of [R.body, R.cabin, R.roof]) r.current?.setMatrixAt(i, zero);
      R.trim.current?.setMatrixAt(i * 2, zero);
      R.trim.current?.setMatrixAt(i * 2 + 1, zero);
      for (let k = 0; k < 4; k++) R.wheels.current?.setMatrixAt(i * 4 + k, zero);
      for (let k = 0; k < 2; k++) {
        R.heads.current?.setMatrixAt(i * 2 + k, zero);
        R.tails.current?.setMatrixAt(i * 2 + k, zero);
      }
      return;
    }
    const set = (r: React.RefObject<THREE.InstancedMesh | null>, idx: number, x: number, y: number, z: number, sx: number, sy: number, sz: number) =>
      r.current?.setMatrixAt(idx, part.copy(base).multiply(m.makeScale(sx, sy, sz).setPosition(x, y, z)));
    const bodyY = 0.32 + md.H / 2;
    set(R.body, i, 0, bodyY, 0, md.L, md.H, md.W);
    set(R.cabin, i, md.co, 0.32 + md.H + md.ch / 2, 0, md.cl, md.ch, md.W * 0.9);
    set(R.roof, i, md.co, 0.32 + md.H + md.ch, 0, md.cl * 0.92, 0.07, md.W * 0.92);
    let k = 0;
    for (const fx of [1, -1]) for (const fz of [1, -1]) set(R.wheels, i * 4 + k++, fx * (md.L / 2 - 0.75), 0.34, fz * (md.W / 2 - 0.08), 0.68, 0.68, 0.26);
    set(R.heads, i * 2, md.L / 2, bodyY + 0.1, md.W / 2 - 0.35, 0.06, 0.16, 0.38);
    set(R.heads, i * 2 + 1, md.L / 2, bodyY + 0.1, -(md.W / 2 - 0.35), 0.06, 0.16, 0.38);
    set(R.tails, i * 2, -md.L / 2, bodyY + 0.1, md.W / 2 - 0.3, 0.06, 0.14, 0.34);
    set(R.tails, i * 2 + 1, -md.L / 2, bodyY + 0.1, -(md.W / 2 - 0.3), 0.06, 0.14, 0.34);
    // bumpers, front and back
    set(R.trim, i * 2, md.L / 2 + 0.04, 0.5, 0, 0.14, 0.24, md.W * 0.98);
    set(R.trim, i * 2 + 1, -md.L / 2 - 0.04, 0.5, 0, 0.14, 0.24, md.W * 0.98);
  };

  // A person: legs, torso, arms, head and hair (children smaller), posed for what they are doing.
  const placePerson = (i: number, p: Person | null, now: number, rain: number, snow = 0) => {
    const { m, base, part, q, s, zero } = tmp;
    const R = refs;
    const parts = [R.torso, R.head, R.hair, R.longHair, R.skirt, R.legL, R.legR, R.armL, R.armR, R.brolly, R.bag];
    if (!p) {
      if (hidden.current[i]) return; // already off the street: nothing to redo
      hidden.current[i] = 1;
      for (const r of parts) r.current?.setMatrixAt(i, zero);
      R.shoes.current?.setMatrixAt(i * 2, zero);
      R.shoes.current?.setMatrixAt(i * 2 + 1, zero);
      return;
    }
    hidden.current[i] = 0;
    const k = p.kid ? 0.62 : 1;
    const sc = 1.4 * k; // larger than life, so they read from the air
    q.setFromAxisAngle(tmp.up, p.yaw);
    base.compose(tmp.p.set(p.x, p.y, p.z), q, s.set(sc, sc, sc));
    // the walk cycle follows the distance actually covered — standing still (at a red light, say) the legs stop
    const pose = p.pose;
    const g = p.gait;
    const swing = Math.sin(p.stride) * 0.55 * g;
    const sit = p.mode === 'sit' || pose === 'sled';
    const crouch = pose === 'build';
    const jump = pose === 'jump' ? Math.max(0, Math.sin(now * 3.4 + p.phase)) * 0.55 : 0;
    const bob = Math.abs(Math.cos(p.stride)) * 0.06 * g;
    const sway = p.mode === 'wait' || p.mode === 'balcony' ? Math.sin(now * 0.8 + p.phase) * 0.03 : 0;
    const hip = sit ? 0.48 : crouch ? 0.62 : 0.88 + bob + jump;
    // a slight lean into the walk; bent over when building
    const lean = crouch ? -0.45 : -0.07 * g;
    const fwd = -Math.sin(lean);
    const legA = sit ? Math.PI / 2 : crouch ? 1.05 : jump > 0.05 ? 0.35 : swing;
    const legB = sit ? Math.PI / 2 : crouch ? 1.05 : jump > 0.05 ? 0.35 : -swing;
    const set = (r: React.RefObject<THREE.InstancedMesh | null>, x: number, y: number, z: number, w: number, h: number, d: number, rx = 0) => {
      tmp.rot.makeRotationZ(rx);
      r.current?.setMatrixAt(i, part.copy(base).multiply(m.makeTranslation(x, y, z)).multiply(tmp.rot).multiply(tmp.sc.makeScale(w, h, d)));
    };
    // legs hang from the hip and swing (or stretch forward when sitting)
    set(R.legL, sway, hip, 0.11, 0.17, 0.88, 0.17, legA);
    set(R.legR, sway, hip, -0.11, 0.17, 0.88, 0.17, legB);
    // shoes at the end of each leg, turned with it
    for (const [k, side, a] of [
      [0, 0.11, legA],
      [1, -0.11, legB],
    ] as const) {
      tmp.rot.makeRotationZ(a);
      R.shoes.current?.setMatrixAt(i * 2 + k, part.copy(base).multiply(m.makeTranslation(sway, hip, side)).multiply(tmp.rot).multiply(tmp.off.makeTranslation(0.06, -0.86, 0)).multiply(tmp.sc.makeScale(0.3, 0.1, 0.17)));
    }
    // a school bag on the children, a backpack on some of the adults
    if ((p.kid ? p.mode === 'walk' : p.bag) && !sit && p.mode !== 'balcony') set(R.bag, fwd * 0.38 - 0.2 + sway, hip + 0.38, 0, 0.14, 0.4, 0.3, lean);
    else R.bag.current?.setMatrixAt(i, zero);
    set(R.torso, fwd * 0.33 + sway, hip + 0.33, 0, 0.26, 0.66, 0.42, lean);
    // arms: swinging opposite the legs, or doing what the pose needs
    let aL = -swing * 0.8;
    let aR = swing * 0.8;
    if (p.mode === 'sit') aL = aR = 0.55; // hands on the lap
    if (p.mode === 'wait') {
      aL = 0.05;
      aR = 0.15;
    }
    if (p.mode === 'balcony') aL = aR = 1.15; // leaning on the rail
    if (crouch) {
      const pat = Math.sin(now * 4 + p.phase) * 0.35; // patting the snow into shape
      aL = 1.35 + pat;
      aR = 1.35 - pat;
    }
    if (pose === 'sled') aL = aR = 0.9; // holding the rope
    if (pose === 'jump') aL = aR = -2.6 * Math.min(1, jump * 2); // arms up as they splash
    if (pose === 'throw') {
      const t = (now * 0.7 + (p.slot === 4 ? 0.5 : 0)) % 1; // in step with the snowballs
      aR = t < 0.55 ? -2.4 * (t / 0.55) : t < 0.7 ? -2.4 + 3.9 * ((t - 0.55) / 0.15) : 1.5 * (1 - (t - 0.7) / 0.3);
      aL = 0.6;
    }
    set(R.armL, fwd * 0.62 + sway, hip + 0.62, 0.27, 0.12, 0.6, 0.12, aL);
    set(R.armR, fwd * 0.62 + sway, hip + 0.62, -0.27, 0.12, 0.6, 0.12, aR);
    set(R.head, fwd * 0.86 + sway, hip + 0.86 - (crouch ? 0.05 : 0), 0, 0.24, 0.26, 0.24);
    // a hat in the snow; long hair on many women and girls; a skirt or dress on some (not in the snow)
    if (snow > 0.5) set(R.hair, fwd * 0.98 - 0.01 + sway, hip + 0.98, 0, 0.27, 0.15, 0.27);
    else set(R.hair, fwd * 0.96 - 0.02 + sway, hip + 0.96, 0, 0.25, 0.1, 0.25);
    if (p.girl && snow < 0.5) set(R.longHair, fwd * 0.86 - 0.13 + sway, hip + 0.86, 0, 0.08, 0.34, 0.22);
    else R.longHair.current?.setMatrixAt(i, zero);
    if (p.girl && p.skirt && snow < 0.5 && !sit) set(R.skirt, 0, hip + 0.02, 0, 0.36, 0.42, 0.36);
    else R.skirt.current?.setMatrixAt(i, zero);
    if (rain > 0.3 && p.umbrella && !p.kid && p.mode !== 'balcony') set(R.brolly, 0.05, hip + 1.25, 0, 1.0, 0.35, 1.0);
    else R.brolly.current?.setMatrixAt(i, zero);
  };

  useEffect(() => {
    const { c } = tmp;
    sim.models.forEach((md, i) => {
      refs.body.current?.setColorAt(i, md.color);
      refs.roof.current?.setColorAt(i, md.color);
      placeCar(i, null);
    });
    signalHeads.forEach((sh, i) => {
      refs.signals.current?.setMatrixAt(i, tmp.m.makeScale(0.7, 1.6, 0.7).setPosition(sh.x, 5.6, sh.z));
      refs.signals.current?.setColorAt(i, c.set('#ef4444'));
    });
    const skin = ['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbac'];
    const brolly = ['#ef4444', '#1d4ed8', '#111827', '#f59e0b', '#16a34a', '#a21caf'];
    people.forEach((_, i) => {
      placePerson(i, null, 0, 0);
      refs.head.current?.setColorAt(i, c.set(skin[Math.floor(rnd(i * 5 + 4) * skin.length)]));
      refs.brolly.current?.setColorAt(i, c.set(brolly[Math.floor(rnd(i * 11 + 6) * brolly.length)]));
    });
    dress('sun');
    for (const r of Object.values(refs)) {
      if (!r.current) continue;
      r.current.instanceMatrix.needsUpdate = true;
      if (r.current.instanceColor) r.current.instanceColor.needsUpdate = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sim, signalHeads, people]);

  const lastPark = useRef(-1);
  const lastWardrobe = useRef('');
  const grid = useMemo(() => new Map<number, number[]>(), []);
  const dress = (w: 'sun' | 'rain' | 'snow') => {
    const c = new THREE.Color();
    const summer = ['#ef4444', '#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#f8fafc', '#0ea5e9', '#84cc16', '#fde047'];
    const rainwear = ['#facc15', '#1d4ed8', '#111827', '#dc2626', '#0f766e', '#4b5563'];
    const coats = ['#1f2937', '#7f1d1d', '#1e3a8a', '#3f3f46', '#78350f', '#065f46', '#4c1d95'];
    const trousers = ['#1f2937', '#334155', '#1e3a8a', '#78350f', '#111827', '#475569'];
    const hats = ['#dc2626', '#1d4ed8', '#f8fafc', '#111827', '#f59e0b', '#16a34a'];
    const skin = ['#f1c27d', '#e0ac69', '#c68642', '#ffdbac'];
    people.forEach((p, i) => {
      const top = w === 'snow' ? coats : w === 'rain' ? (p.kid ? ['#facc15', '#3b82f6', '#22c55e', '#f9a8d4'] : rainwear) : summer;
      c.set(top[Math.floor(rnd(i * 3 + 1) * top.length)]);
      if (p.kid && w !== 'snow') c.offsetHSL(0, 0.1, 0.05);
      refs.torso.current?.setColorAt(i, c);
      refs.armL.current?.setColorAt(i, w === 'sun' && rnd(i * 23) < 0.6 ? c.set(skin[Math.floor(rnd(i * 5 + 4) * skin.length)]) : c);
      refs.armR.current?.setColorAt(i, c);
      // shorts show the legs in the sun
      c.set(w === 'sun' && p.shorts ? skin[Math.floor(rnd(i * 5 + 4) * skin.length)] : trousers[Math.floor(rnd(i * 3 + 2) * trousers.length)]);
      refs.legL.current?.setColorAt(i, c);
      refs.legR.current?.setColorAt(i, c);
      refs.skirt.current?.setColorAt(i, c.set(summer[Math.floor(rnd(i * 29 + 2) * summer.length)]));
      if (w === 'snow') refs.hair.current?.setColorAt(i, c.set(hats[Math.floor(rnd(i * 31) * hats.length)]));
      else refs.hair.current?.setColorAt(i, c.set(['#1c1917', '#3f2a1e', '#6b4423', '#111827'][Math.floor(rnd(i * 7 + 5) * 4)]));
      refs.longHair.current?.setColorAt(i, c);
    });
    for (const k of ['torso', 'armL', 'armR', 'legL', 'legR', 'skirt', 'hair', 'longHair'] as const) {
      const r = refs[k].current;
      if (r?.instanceColor) r.instanceColor.needsUpdate = true;
    }
  };

  const frameNo = useRef(0);
  // what the camera can see right now (near enough to make out): nothing appears or disappears there
  const view = useMemo(() => ({ f: new THREE.Frustum(), m: new THREE.Matrix4(), s: new THREE.Sphere(new THREE.Vector3(), 6) }), []);
  const camAt = useRef(new THREE.Vector3());
  const seen = (x: number, z: number) => {
    const c = camAt.current;
    if ((x - c.x) ** 2 + (z - c.z) ** 2 > 700 * 700) return false;
    view.s.center.set(x, 2, z);
    return view.f.intersectsSphere(view.s);
  };
  const carAt = (v: Vehicle): [number, number] => {
    const lane = sim.lanes[v.lane];
    const [x, z, tx, tz] = pointAt(ROADS[lane.road], lane.dir > 0 ? v.s : lane.len - v.s);
    return [x - tz * lane.off, z + tx * lane.off];
  };
  // puddles (rain), snowmen, sleds and snowballs (snow) at every playground
  const lastGames = useRef('');
  const games = (now: number, on: boolean, rain: number, snow: number) => {
    const { m, q, p, s, up, zero, e } = tmp;
    const R = refs;
    const wet = on && rain > 0.4 && snow < 0.5;
    const white = on && snow > 0.5;
    if (R.puddle.current) R.puddle.current.visible = wet;
    for (const r of [R.snowman, R.carrot, R.sled, R.snowball]) if (r.current) r.current.visible = white;
    const key = `${wet}-${white}`;
    const still = key === lastGames.current;
    lastGames.current = key;
    AMENITIES.playgrounds.forEach((pg, k) => {
      if (wet && !still)
        PUDDLES(pg.x, pg.z).forEach(([x, z], j) => R.puddle.current?.setMatrixAt(k * 2 + j, m.compose(p.set(x, 0.07, z), q.identity(), s.set(1.7 + j * 0.4, 0.02, 1.3 + j * 0.3))));
      if (!white) return;
      const S = SNOW(pg.x, pg.z);
      if (!still) {
        [
          [0.75, 0.7],
          [0.55, 1.75],
          [0.38, 2.55],
        ].forEach(([r, y], j) => R.snowman.current?.setMatrixAt(k * 3 + j, m.compose(p.set(S.man[0], y, S.man[1]), q.identity(), s.set(r, r, r))));
        R.carrot.current?.setMatrixAt(k, m.compose(p.set(S.man[0] + 0.42, 2.58, S.man[1]), q.setFromEuler(e.set(0, 0, -Math.PI / 2)), s.set(0.07, 0.3, 0.07)));
      }
      // the sled goes with the sledger: under them on the way down, towed behind on the way back up
      const u = ((now + rnd(2000 + k * 7 + 2 + 3) * 6) % 11) / 11;
      const [x0, z0] = S.top;
      const [x1, z1] = S.bottom;
      const down = u < 0.3;
      const kk = down ? ease2(u / 0.3) : (u - 0.3) / 0.7;
      const sx = down ? x0 + (x1 - x0) * kk : x1 + (x0 - x1) * kk;
      const sz = (down ? z0 + (z1 - z0) * kk : z1 + (z0 - z1) * kk) + (down ? 0 : 1.4);
      q.setFromAxisAngle(up, Math.PI / 2);
      R.sled.current?.setMatrixAt(k, m.compose(p.set(sx, 0.3, sz), q, s.set(1.2, 0.12, 0.55)));
      // a snowball in the air from each side, half a throw apart
      for (const j of [0, 1]) {
        const t = (now * 0.7 + (j ? 0.5 : 0)) % 1;
        const [fx, fz] = j ? S.b : S.a;
        const [tx, tz] = j ? S.a : S.b;
        if (t < 0.68 || t > 0.98) {
          R.snowball.current?.setMatrixAt(k * 2 + j, zero);
          continue;
        }
        const f = (t - 0.68) / 0.3;
        R.snowball.current?.setMatrixAt(k * 2 + j, m.compose(p.set(fx + (tx - fx) * f, 1.6 + Math.sin(f * Math.PI) * 1.8, fz + (tz - fz) * f), q.identity(), s.set(0.13, 0.13, 0.13)));
      }
    });
    for (const r of [R.puddle, R.snowman, R.carrot, R.sled, R.snowball]) if (r.current) r.current.instanceMatrix.needsUpdate = true;
  };
  useFrame((state, dtRaw) => {
    const cam = state.camera.position;
    camAt.current.copy(cam);
    view.m.multiplyMatrices(state.camera.projectionMatrix, state.camera.matrixWorldInverse);
    view.f.setFromProjectionMatrix(view.m);
    frameNo.current++;
    const tl = timeline.current;
    const t = tl?.t ?? 1;
    const env = tl?.env;
    const dt = Math.min(dtRaw, 0.1);
    clock.current += dt;
    const now = clock.current;
    const { m, base, q, p, s, up, zero, c } = tmp;
    const life = ramp(t, T.live + 0.02, 0.97);
    const building = t > T.roads[1] && t < T.live + 0.04;
    const streetsOpen = t > T.roads[1];
    const night = env?.night ?? 0.2;
    const rain = env?.rain ?? 0;
    const snowNow = env?.snow ?? 0;
    const hour = env?.hour ?? 12;
    const act = activity(hour);
    const kidsOut = childrenOut(hour);
    const busesOn = busesRun(hour);

    // signals
    const sig = refs.signals.current;
    if (sig) {
      sig.visible = streetsOpen;
      signalHeads.forEach((h, i) => {
        const [ph] = phaseAt(h.j, now);
        sig.setColorAt(i, c.set(carMay(ph, h.axis) ? '#22c55e' : carAmber(ph, h.axis) ? '#f59e0b' : '#ef4444'));
      });
      if (sig.instanceColor) sig.instanceColor.needsUpdate = true;
    }
    headMat.current?.color.setRGB(0.9 + night, 0.85 + night * 0.8, 0.7 + night * 0.5);
    tailMat.current?.color.setRGB(0.6 + night * 1.2, 0.05, 0.05);

    // ---- vehicles, lane by lane ----
    const byLane: Vehicle[][] = sim.lanes.map(() => []);
    for (const v of sim.vehicles) {
      const want = streetsOpen && (v.kind === 'truck' ? building || v.on < life * 0.3 * act : v.kind === 'bus' ? busesOn && v.on < life : v.on < life * act);
      if (v.hold) {
        const [x, z] = carAt(v);
        if (seen(x, z)) {
          v.v = 0;
          continue;
        }
        v.hold = false;
      }
      // a car joins or leaves the traffic only where nobody is looking (or before the streets open)
      if (want !== v.shown) {
        const [x, z] = carAt(v);
        if (!streetsOpen || !seen(x, z)) v.shown = want;
      }
      if (v.shown) byLane[v.lane].push(v);
      else v.v = 0;
    }
    byLane.forEach((list, li) => {
      if (!list.length) return;
      const lane = sim.lanes[li];
      list.sort((a, b) => a.s - b.s);
      list.forEach((me, k) => {
        let target = me.vmax;
        if (list.length > 1) {
          const lead = list[(k + 1) % list.length];
          const gap = ((lead.s - me.s + lane.len) % lane.len) - (lead.len + me.len) / 2;
          // the speed you can still stop from (comfortable 3 m/s²), keeping 3 m behind the car in front
          target = Math.min(target, Math.sqrt(2 * 3 * Math.max(0, gap - 3)));
        }
        for (const jn of lane.junctions) {
          const line = jn.s - jn.half - SIDE - 4.5 - me.len / 2;
          const d = line - me.s;
          if (d < -0.5) continue;
          if (d > 45) break;
          const [ph] = phaseAt(jn.j, now);
          // red (or amber with room to stop): brake smoothly to the stop line; green: ease off through the junction
          if (!(carMay(ph, lane.axis) || (carAmber(ph, lane.axis) && d < 3))) target = Math.min(target, Math.sqrt(2 * 3 * Math.max(0, d - 0.3)));
          else if (d < 30) target = Math.min(target, me.vmax * 0.75);
          break;
        }
        if (me.kind === 'bus') {
          if (me.wait > 0) {
            me.wait -= dt;
            target = 0;
          } else
            for (let si = 0; si < lane.stops.length; si++) {
              const d = lane.stops[si] - me.s;
              if (si === me.served || d < -1 || d > 40) continue;
              target = Math.min(target, Math.sqrt(2 * 2 * Math.max(0, d)));
              if (d < 0.8 && me.v < 0.6) {
                me.wait = 4;
                me.served = si;
                // a few people get off, onto the pavement
                if (life > 0) {
                  const r = ROADS[lane.road];
                  const [x, z, tx, tz] = pointAt(r, lane.dir > 0 ? me.s : lane.len - me.s);
                  const off = Math.sign(lane.off) * (Math.abs(lane.off) + 5.5);
                  for (let k2 = 0; k2 < 2 + Math.floor(rnd(now + si) * 3); k2++) spawnWalker(x - tz * off + (rnd(now * 3 + k2) - 0.5) * 6, z + tx * off + (rnd(now * 5 + k2) - 0.5) * 6, now * 11 + k2);
                }
              }
              break;
            }
        }
        me.v = Math.max(0, me.v + Math.max(-6 * dt, Math.min(2.5 * dt, target - me.v)));
        me.s += me.v * dt;
        // at the riverside road, eastbound traffic turns onto it (north or south)
        const turn = sim.turns[li];
        if (turn && turn.to.length && me.s >= turn.at) {
          const pick = turn.to[Math.floor(rnd(me.on * 97 + now) * turn.to.length)];
          me.lane = pick.lane;
          me.s = pick.s;
          return;
        }
        // off the far end (well out of town): back to the start, once that spot is out of view
        if (me.s >= lane.len) {
          me.s -= lane.len;
          me.served = -1;
          me.hold = true;
        }
      });
    });
    let bi = 0;
    let ti = 0;
    for (const v of sim.vehicles) {
      const lane = sim.lanes[v.lane];
      const active = v.shown && !v.hold;
      const r = ROADS[lane.road];
      const [x, z, tx, tz] = pointAt(r, lane.dir > 0 ? v.s : lane.len - v.s);
      p.set(x - tz * lane.off, 0, z + tx * lane.off);
      const yaw = Math.atan2(-tz, tx) + (lane.dir > 0 ? 0 : Math.PI);
      q.setFromAxisAngle(up, yaw);
      base.compose(p, q, s.set(1, 1, 1));
      if (v.kind === 'car') placeCar(v.model, active ? base : null);
      else if (v.kind === 'bus') {
        refs.busBody.current?.setMatrixAt(bi, active ? m.copy(base).multiply(tmp.part.makeScale(12.5, 2.6, 2.55).setPosition(0, 1.75, 0)) : zero);
        refs.busGlass.current?.setMatrixAt(bi, active ? m.copy(base).multiply(tmp.part.makeScale(11.4, 1.0, 2.6).setPosition(-0.3, 2.3, 0)) : zero);
        const put = (r: React.RefObject<THREE.InstancedMesh | null>, idx: number, x: number, y: number, z: number, w: number, h: number, d: number) =>
          r.current?.setMatrixAt(idx, active ? m.copy(base).multiply(tmp.part.makeScale(w, h, d).setPosition(x, y, z)) : zero);
        put(refs.busRoof, bi * 2, 0, 3.12, 0, 12.3, 0.16, 2.45);
        put(refs.busRoof, bi * 2 + 1, -1.5, 3.35, 0, 3.2, 0.32, 1.7);
        put(refs.busStripe, bi, 0, 1.35, 0, 12.56, 0.2, 2.6);
        put(refs.busFront, bi, 6.24, 2.05, 0, 0.06, 1.7, 2.3);
        put(refs.busSign, bi, 6.27, 2.95, 0, 0.05, 0.28, 1.7);
        put(refs.busDoor, bi * 2, 4.6, 1.5, 1.285, 1.2, 2.1, 0.04);
        put(refs.busDoor, bi * 2 + 1, -0.8, 1.5, 1.285, 1.2, 2.1, 0.04);
        for (let k = 0; k < 2; k++) for (const fz of [1, -1]) refs.bigWheels.current?.setMatrixAt((nTruck + bi) * 4 + k * 2 + (fz > 0 ? 0 : 1), active ? m.copy(base).multiply(tmp.part.makeScale(1, 1, 0.3).setPosition(k ? -4.2 : 4.2, 0.5, fz * 1.2)) : zero);
        bi++;
      } else {
        refs.truckCab.current?.setMatrixAt(ti, active ? m.copy(base).multiply(tmp.part.makeScale(2.3, 2.7, 2.5).setPosition(3, 1.75, 0)) : zero);
        refs.truckDrum.current?.setMatrixAt(ti, active ? m.copy(base).multiply(tmp.part.makeRotationZ(-0.25).setPosition(-1.1, 2.4, 0)).multiply(tmp.rot.makeRotationX(now * 2)).multiply(tmp.sc.makeScale(5, 2.3, 2.3)) : zero);
        for (let k = 0; k < 2; k++) for (const fz of [1, -1]) refs.bigWheels.current?.setMatrixAt(ti * 4 + k * 2 + (fz > 0 ? 0 : 1), active ? m.copy(base).multiply(tmp.part.makeScale(1, 1, 0.3).setPosition(k ? -2.6 : 3, 0.5, fz * 1.15)) : zero);
        ti++;
      }
    }
    // parked cars arrive as people move in; the driver gets out and walks home
    const pk = Math.round(life * 60) / 60;
    if (lastPark.current !== pk) {
      sim.parked.forEach((cr, i) => {
        q.setFromAxisAngle(up, cr.yaw);
        base.compose(p.set(cr.x, 0, cr.z), q, s.set(1, 1, 1));
        placeCar(cr.model, cr.on < pk ? base : null);
        if (lastPark.current >= 0 && cr.on >= lastPark.current && cr.on < pk) spawnWalker(cr.x, cr.z, i * 13);
      });
      lastPark.current = pk;
    }
    for (const k of ['body', 'cabin', 'roof', 'wheels', 'heads', 'tails', 'trim', 'busBody', 'busGlass', 'busRoof', 'busStripe', 'busFront', 'busSign', 'busDoor', 'truckCab', 'truckDrum', 'bigWheels'] as const) {
      const r = refs[k].current;
      if (r) r.instanceMatrix.needsUpdate = true;
    }

    // ---- people ----
    if (life > 0) {
      // walkers set out from the courtyards, spread over time
      spawnClock.current += dt * (3 + life * 8);
      while (spawnClock.current > 1) {
        spawnClock.current -= 1;
        const active = people.reduce((a, x) => a + (x.mode === 'walk' && x.on ? 1 : 0), 0);
        if (active > WALKERS * life * act) break;
        const pp = people.find((x) => x.mode === 'walk' && !x.on);
        if (!pp) break;
        const pl = PLACES[Math.floor(rnd(now * 7.3) * PLACES.length)];
        const [wx, wz] = wanderPoint(pl, rnd(now * 3.1), rnd(now * 5.7));
        if (seen(wx, wz)) continue; // set out from somewhere out of view
        pp.on = true;
        pp.x = wx;
        pp.z = wz;
        pp.place = pl;
        pp.path = [];
        pp.stay = 2 + rnd(now * 9) * 10;
      }
    }
    // keep a little personal space (spatial hash, 2 m cells)
    grid.clear();
    people.forEach((pr, i) => {
      if (!pr.on || pr.mode !== 'walk') return;
      const key = Math.floor(pr.x / 2) * 100003 + Math.floor(pr.z / 2);
      const cell = grid.get(key);
      if (cell) cell.push(i);
      else grid.set(key, [i]);
    });
    people.forEach((pr, i) => {
      // clothes follow the weather: light colours (some shorts) in the sun, raincoats in the rain, coats and hats in snow
    const wardrobe = snowNow > 0.5 ? 'snow' : rain > 0.4 ? 'rain' : 'sun';
    if (wardrobe !== lastWardrobe.current) {
      lastWardrobe.current = wardrobe;
      dress(wardrobe);
    }
    // the stationary ones appear as the district comes to life
      if (pr.mode !== 'walk') {
        const share = pr.mode === 'play' ? (kidsOut ? 1 : 0) : pr.mode === 'wait' ? (busesOn ? act : 0) : pr.mode === 'balcony' ? Math.max(0.15, act) : act;
        const want = life > 0 && rnd(i * 1.7) < life * share;
        // they arrive or go in only out of view
        if (want !== pr.on && (life <= 0 || !seen(pr.anchor[0], pr.anchor[1]))) pr.on = want;
        if (!pr.on) {
          placePerson(i, null, now, rain, snowNow);
          return;
        }
        const ox = pr.x;
        const oz = pr.z;
        pr.pose = 'none';
        if (pr.mode === 'play') play(pr, now, snowNow > 0.5 ? 'snow' : rain > 0.4 ? 'rain' : 'sun');
        else {
          pr.x = pr.anchor[0];
          pr.z = pr.anchor[1];
          if (pr.mode === 'wait') pr.yaw += Math.sin(now * 0.7 + pr.phase) * 0.002;
        }
        const moved = Math.hypot(pr.x - ox, pr.z - oz);
        if (moved < 3) pr.stride += moved * 4.5;
        pr.gait += ((moved > 0.15 * dt && moved < 3 && (pr.pose as Pose) !== 'sled' ? 1 : 0) - pr.gait) * Math.min(1, dt * 8);
        placePerson(i, pr, now, rain, snowNow);
        return;
      }
      if (!pr.on || life <= 0) {
        if (pr.on && life <= 0) pr.on = false;
        placePerson(i, null, now, rain, snowNow);
        return;
      }
      const speed = pr.v * 1.9;
      const ox = pr.x;
      const oz = pr.z;
      if (pr.path.length) {
        const nx = pr.path[0];
        let may = true;
        if (nx.cross && Math.hypot(nx.x - pr.x, nx.z - pr.z) > 1) {
          const [ph, k] = phaseAt(nx.cross.j, now);
          may = pr.crossing || walkMay(ph, k, nx.cross.moving);
          pr.crossing = may;
        }
        if (may) {
          const dx = nx.x - pr.x;
          const dz = nx.z - pr.z;
          const d = Math.hypot(dx, dz);
          if (d < speed * dt + 0.3) {
            pr.x = nx.x;
            pr.z = nx.z;
            pr.path.shift();
            pr.crossing = false;
            if (!pr.path.length) pr.stay = 12 + rnd(i + now) * 25;
          } else {
            // keep to the right of the way you are going
            const rx = -dz / d;
            const rz = dx / d;
            pr.x += (dx / d) * speed * dt + rx * 0.4 * dt;
            pr.z += (dz / d) * speed * dt + rz * 0.4 * dt;
            pr.yaw = Math.atan2(-dz, dx);
          }
        }
      } else if (pr.place) {
        pr.stay -= dt;
        // late at night most go in and stay in
        if (pr.stay <= 0 && rnd(i * 2.3) > act && !seen(pr.x, pr.z)) {
          pr.on = false;
          placePerson(i, null, now, rain, snowNow);
          return;
        }
        if (pr.stay <= 0) leave(pr, i * 31 + now);
        else {
          const [tx, tz] = wanderPoint(pr.place, rnd(i * 3 + Math.floor(now / 6)), rnd(i * 7 + Math.floor(now / 6)));
          const dx = tx - pr.x;
          const dz = tz - pr.z;
          const d = Math.hypot(dx, dz);
          if (d > 0.5) {
            pr.x += (dx / d) * speed * 0.4 * dt;
            pr.z += (dz / d) * speed * 0.4 * dt;
            pr.yaw = Math.atan2(-dz, dx);
          }
        }
      }
      // the walk cycle follows the ground covered; standing still, the legs come to rest
      const moved = Math.hypot(pr.x - ox, pr.z - oz);
      pr.stride += moved * 3.2;
      pr.gait += ((moved > 0.15 * dt ? 1 : 0) - pr.gait) * Math.min(1, dt * 8);
      pr.pose = 'none';
      // step round anyone too close
      const gx = Math.floor(pr.x / 2);
      const gz = Math.floor(pr.z / 2);
      for (let a = -1; a <= 1; a++)
        for (let b = -1; b <= 1; b++) {
          const cell = grid.get((gx + a) * 100003 + gz + b);
          if (!cell) continue;
          for (const o of cell) {
            if (o === i) continue;
            const other = people[o];
            const dx = pr.x - other.x;
            const dz = pr.z - other.z;
            const d = Math.hypot(dx, dz);
            if (d > 0 && d < 1.3) {
              pr.x += (dx / d) * (1.3 - d) * 0.5;
              pr.z += (dz / d) * (1.3 - d) * 0.5;
            }
          }
        }
      const far = (pr.x - cam.x) ** 2 + (pr.z - cam.z) ** 2 > 420 * 420;
      if (!far || (frameNo.current + i) % 3 === 0) placePerson(i, pr, now, rain, snowNow);
    });
    games(now, life > 0 && kidsOut, rain, snowNow);
    for (const k of ['torso', 'head', 'hair', 'longHair', 'skirt', 'legL', 'legR', 'armL', 'armR', 'brolly', 'shoes', 'bag'] as const) {
      const r = refs[k].current;
      if (!r) continue;
      r.visible = life > 0;
      r.instanceMatrix.needsUpdate = true;
    }
  });

  const box = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const limb = useMemo(() => new THREE.BoxGeometry(1, 1, 1).translate(0, -0.5, 0), []); // hangs from its joint
  const wheel = useMemo(() => new THREE.CylinderGeometry(0.5, 0.5, 1, 10).rotateX(Math.PI / 2), []);
  const drum = useMemo(() => new THREE.CylinderGeometry(0.5, 0.42, 1, 12).rotateZ(Math.PI / 2), []);
  const headGeo = useMemo(() => new THREE.SphereGeometry(1, 10, 8), []);
  const hairGeo = useMemo(() => new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), []);
  const torsoGeo = useMemo(() => new THREE.CylinderGeometry(0.5, 0.45, 1, 8), []);
  const brollyGeo = useMemo(() => new THREE.ConeGeometry(1, 1, 8), []);
  const puddleGeo = useMemo(() => new THREE.CylinderGeometry(1, 1, 1, 18), []);
  const ball = useMemo(() => new THREE.SphereGeometry(1, 14, 10), []);
  const carrotGeo = useMemo(() => new THREE.ConeGeometry(1, 1, 8), []);
  const skirtGeo = useMemo(() => new THREE.CylinderGeometry(0.28, 0.5, 1, 10).translate(0, -0.5, 0), []);
  return (
    <group>
      <instancedMesh ref={refs.body} args={[box, undefined, nCars]} frustumCulled={false}>
        <meshStandardMaterial roughness={0.35} metalness={0.45} />
      </instancedMesh>
      <instancedMesh ref={refs.cabin} args={[box, undefined, nCars]} frustumCulled={false}>
        <meshStandardMaterial color="#1e293b" roughness={0.1} metalness={0.6} />
      </instancedMesh>
      <instancedMesh ref={refs.roof} args={[box, undefined, nCars]} frustumCulled={false}>
        <meshStandardMaterial roughness={0.35} metalness={0.45} />
      </instancedMesh>
      <instancedMesh ref={refs.wheels} args={[wheel, undefined, nCars * 4]} frustumCulled={false}>
        <meshStandardMaterial color="#111827" roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={refs.heads} args={[box, undefined, nCars * 2]} frustumCulled={false}>
        <meshBasicMaterial ref={headMat} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={refs.tails} args={[box, undefined, nCars * 2]} frustumCulled={false}>
        <meshBasicMaterial ref={tailMat} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={refs.trim} args={[box, undefined, nCars * 2]} frustumCulled={false}>
        <meshStandardMaterial color="#1f2937" roughness={0.6} />
      </instancedMesh>
      <instancedMesh ref={refs.busBody} args={[box, undefined, Math.max(1, nBus)]} frustumCulled={false}>
        <meshStandardMaterial color="#2563eb" emissive="#1d4ed8" emissiveIntensity={0.2} roughness={0.35} metalness={0.2} />
      </instancedMesh>
      <instancedMesh ref={refs.busRoof} args={[box, undefined, Math.max(1, nBus * 2)]} frustumCulled={false}>
        <meshStandardMaterial color="#e5e7eb" roughness={0.5} />
      </instancedMesh>
      <instancedMesh ref={refs.busStripe} args={[box, undefined, Math.max(1, nBus)]} frustumCulled={false}>
        <meshStandardMaterial color="#fbbf24" roughness={0.5} />
      </instancedMesh>
      <instancedMesh ref={refs.busFront} args={[box, undefined, Math.max(1, nBus)]} frustumCulled={false}>
        <meshStandardMaterial color="#0b1220" roughness={0.05} metalness={0.7} />
      </instancedMesh>
      <instancedMesh ref={refs.busSign} args={[box, undefined, Math.max(1, nBus)]} frustumCulled={false}>
        <meshBasicMaterial color="#fbbf24" toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={refs.busDoor} args={[box, undefined, Math.max(1, nBus * 2)]} frustumCulled={false}>
        <meshStandardMaterial color="#111827" roughness={0.2} metalness={0.5} />
      </instancedMesh>
      <instancedMesh ref={refs.busGlass} args={[box, undefined, Math.max(1, nBus)]} frustumCulled={false}>
        <meshStandardMaterial color="#0f172a" emissive="#fde68a" emissiveIntensity={0.25} roughness={0.1} />
      </instancedMesh>
      <instancedMesh ref={refs.truckCab} args={[box, undefined, Math.max(1, nTruck)]} frustumCulled={false}>
        <meshStandardMaterial color="#f59e0b" roughness={0.5} />
      </instancedMesh>
      <instancedMesh ref={refs.truckDrum} args={[drum, undefined, Math.max(1, nTruck)]} frustumCulled={false}>
        <meshStandardMaterial color="#cbd5e1" roughness={0.6} />
      </instancedMesh>
      <instancedMesh ref={refs.bigWheels} args={[wheel, undefined, (nTruck + nBus) * 4]} frustumCulled={false}>
        <meshStandardMaterial color="#111827" roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={refs.signals} args={[box, undefined, signalHeads.length]} frustumCulled={false} visible={false}>
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      {/* people */}
      <instancedMesh ref={refs.torso} args={[torsoGeo, undefined, nPeople]} frustumCulled={false} visible={false}>
        <meshStandardMaterial roughness={0.8} />
      </instancedMesh>
      <instancedMesh ref={refs.armL} args={[limb, undefined, nPeople]} frustumCulled={false} visible={false}>
        <meshStandardMaterial roughness={0.8} />
      </instancedMesh>
      <instancedMesh ref={refs.armR} args={[limb, undefined, nPeople]} frustumCulled={false} visible={false}>
        <meshStandardMaterial roughness={0.8} />
      </instancedMesh>
      <instancedMesh ref={refs.legL} args={[limb, undefined, nPeople]} frustumCulled={false} visible={false}>
        <meshStandardMaterial roughness={0.8} />
      </instancedMesh>
      <instancedMesh ref={refs.legR} args={[limb, undefined, nPeople]} frustumCulled={false} visible={false}>
        <meshStandardMaterial roughness={0.8} />
      </instancedMesh>
      <instancedMesh ref={refs.head} args={[headGeo, undefined, nPeople]} frustumCulled={false} visible={false}>
        <meshStandardMaterial roughness={0.7} />
      </instancedMesh>
      <instancedMesh ref={refs.hair} args={[hairGeo, undefined, nPeople]} frustumCulled={false} visible={false}>
        <meshStandardMaterial roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={refs.longHair} args={[box, undefined, nPeople]} frustumCulled={false} visible={false}>
        <meshStandardMaterial roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={refs.skirt} args={[skirtGeo, undefined, nPeople]} frustumCulled={false} visible={false}>
        <meshStandardMaterial roughness={0.8} />
      </instancedMesh>
      <instancedMesh ref={refs.shoes} args={[box, undefined, nPeople * 2]} frustumCulled={false}>
        <meshStandardMaterial color="#1f1b18" roughness={0.7} />
      </instancedMesh>
      <instancedMesh ref={refs.bag} args={[box, undefined, nPeople]} frustumCulled={false}>
        <meshStandardMaterial color="#b91c1c" roughness={0.8} />
      </instancedMesh>
      <instancedMesh ref={refs.puddle} args={[puddleGeo, undefined, Math.max(1, nGroups * 2)]} frustumCulled={false} visible={false}>
        <meshStandardMaterial color="#3b5670" roughness={0.05} metalness={0.7} transparent opacity={0.85} />
      </instancedMesh>
      <instancedMesh ref={refs.snowman} args={[ball, undefined, Math.max(1, nGroups * 3)]} frustumCulled={false} visible={false}>
        <meshStandardMaterial color="#f8fafc" roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={refs.carrot} args={[carrotGeo, undefined, Math.max(1, nGroups)]} frustumCulled={false} visible={false}>
        <meshStandardMaterial color="#f97316" roughness={0.6} />
      </instancedMesh>
      <instancedMesh ref={refs.sled} args={[box, undefined, Math.max(1, nGroups)]} frustumCulled={false} visible={false}>
        <meshStandardMaterial color="#dc2626" roughness={0.5} />
      </instancedMesh>
      <instancedMesh ref={refs.snowball} args={[ball, undefined, Math.max(1, nGroups * 2)]} frustumCulled={false} visible={false}>
        <meshStandardMaterial color="#ffffff" roughness={0.8} />
      </instancedMesh>
      <instancedMesh ref={refs.brolly} args={[brollyGeo, undefined, nPeople]} frustumCulled={false} visible={false}>
        <meshStandardMaterial roughness={0.5} side={THREE.DoubleSide} />
      </instancedMesh>
    </group>
  );
}

