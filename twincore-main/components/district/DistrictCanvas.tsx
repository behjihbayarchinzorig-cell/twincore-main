'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import Birds from './Birds';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  AMENITIES,
  AVENUE_Z,
  CENTRE,
  BRT_LINE,
  PLAN,
  bankX,
  WEST_END,
  px,
  DISTRICT,
  FLOOR_H,
  NS_LINES,
  PLINTH_H,
  PROJECT,
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
  roadLength,
  sAt,
  type Block,
  type Building,
  type Use,
} from '@/lib/district';
import CityLife from './CityLife';
import Offices, { towerTop } from './Offices';
import { RealCity, RealLines, RealTerrain, SelbeInDistrict, useCity, useGround, useLines } from './World';

// The front-page district on its real site — the Selbe corridor in Ulaanbaatar — as one continuous sequence, like a
// short film. The camera comes in from over the city centre and flies up the Selbe valley while the district is
// planned, its streets paved, its blocks built (a tower crane rises in each courtyard, the concrete frame climbs,
// the façade follows, the crane leaves) and trees planted; then people move in, cars and buses run and the windows
// light up. After that it is a sandbox: the clock and the weather run on, and the camera is free.

export type Weather = 'sunny' | 'rainy' | 'snowy';
// The world's state, worked out each frame from the film (or, once it has ended, from the clock and the weather).
export type Env = { night: number; snow: number; snowing: number; rain: number; autumn: number; hour: number; cloud: number; sky: THREE.Color; fogNear: number; fogFar: number; sun: THREE.Vector3; sunUp: number };
// The weather outside, live (see app/api/weather): when set, the sky, the clock and the season follow Ulaanbaatar now.
export type Live = { cloud: number; rain: number; snow: number; fog: number; cover: number };
// targetHour: the time of day picked; the clock glides there, then runs on at `speed` (game hours per real second).
// hourPicked: someone chose a time, so the clock is theirs even while the film plays.
// after: seconds since the build finished (the camera then drifts round the living district)
// ready: the scene is built and its shaders compiled — the film starts (and fades in) only then
export type Timeline = { ready: boolean; after: number; t: number; cam: number; playing: boolean; manual: boolean; sandbox: boolean; targetHour: number; hourPicked: boolean; speed: number; weather: Weather; live: Live | null; env: Env };
export const newTimeline = (): Timeline => ({
  ready: false,
  after: 0,
  t: 0,
  cam: 0,
  playing: true,
  manual: false,
  sandbox: false,
  targetHour: 21,
  hourPicked: false,
  speed: 1 / 60,
  weather: 'sunny',
  live: null,
  env: { night: 0.12, snow: 0, snowing: 0, rain: 0, autumn: 0, hour: 12, cloud: 0.15, sky: new THREE.Color('#8fb0d8'), fogNear: 3000, fogFar: 11000, sun: new THREE.Vector3(0, 1, 0), sunUp: 1 },
});
export type DistrictProps = {
  timeline: React.RefObject<Timeline>;
  running: boolean;
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const ease = (k: number) => k * k * (3 - 2 * k);
const ramp = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const rnd = (n: number) => {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};
const FOG_NEAR = 3000;
const FOG_FAR = 11000;
const [CX, CZ] = CENTRE;

// how far along each part of a building is at timeline t
const stageOf = (b: Building, t: number) => {
  const u = clamp01((t - b.t0) / T.buildLen);
  const life = ramp(t, T.live + b.seed * 0.1, T.live + b.seed * 0.1 + 0.12);
  return { plinth: ease(ramp(u, 0.04, 0.14)), frame: ease(ramp(u, 0.12, 0.72)), facade: ease(ramp(u, 0.26, 0.86)), crown: ease(ramp(u, 0.8, 0.94)), life };
};
// low-rise houses sit on a short foundation instead of a shop-front ground floor
const baseOf = (b: Building) => (b.use === 'house' ? 0.6 : PLINTH_H);
const topOf = (b: Building) => (b.shape && b.shape !== 'podium' ? towerTop(b) : b.use === 'house' ? 0.6 + b.floors * 2.9 : PLINTH_H + (b.floors - 1) * FLOOR_H);
// the film's clock: midday while planning and building, then on into the evening as the district fills
const filmHour = (t: number) => 12 + 9 * ease(ramp(t, 0.6, 0.94));

// ---- camera ----------------------------------------------------------------------------------------------------
// A background film: the camera sweeps slowly round the district — high and wide while it is planned, closing in as
// it is built, low among the towers once it is alive — always looking at its heart on the main avenue. Nobody steers
// it; it stays inside the area and above the ground and the roofs.
const HEART = new THREE.Vector3(-90, 0, -640);
const filmEase = (u: number) => 0.55 * u + 0.45 * ease(u);
// After the build: round and round, slowly, a little lower — starting exactly where the film ends.
const driftShot = (s: number, p: THREE.Vector3, q: THREE.Vector3) => {
  const a = 3.55 + 1.75 + s * 0.02;
  const r = 330 + 45 * Math.sin(s * 0.05);
  p.set(HEART.x + Math.cos(a) * r, 120 - 22 * (1 - Math.cos(s * 0.04)), HEART.z + Math.sin(a) * r);
  q.set(HEART.x + Math.cos(a + 1.2) * 60, 10, HEART.z + Math.sin(a + 1.2) * 60);
};
const filmShot = (u: number, p: THREE.Vector3, q: THREE.Vector3) => {
  const k = filmEase(u);
  const a = 3.55 + k * 1.75; // about a hundred degrees round
  const r = 780 - 450 * k;
  p.set(HEART.x + Math.cos(a) * r, 430 - 310 * k, HEART.z + Math.sin(a) * r);
  q.set(HEART.x + Math.cos(a + 1.2) * 60 * k, 10 + 30 * (1 - k), HEART.z + Math.sin(a + 1.2) * 60 * k);
};
// where the camera may be
const BOUND = { x0: PROJECT.x0 - 60, x1: PROJECT.x1 + 40, z0: PROJECT.z0 - 60, z1: PROJECT.z1 + 60, top: 900 };
// The roofline: the tallest thing in each 8 m cell (buildings by their rotated footprints, towers by theirs).
const ROOF = (() => {
  const C = 8;
  const nx = Math.ceil((BOUND.x1 - BOUND.x0) / C) + 1;
  const nz = Math.ceil((BOUND.z1 - BOUND.z0) / C) + 1;
  const h = new Float32Array(nx * nz);
  for (const b of DISTRICT.buildings) {
    const top = topOf(b) + (b.use === 'house' || b.use === 'kinder' ? 4 : 4);
    const c = Math.cos(b.yaw);
    const sn = Math.sin(b.yaw);
    const r = Math.hypot(b.w, b.d) / 2 + 4;
    for (let x = b.x - r; x <= b.x + r; x += C / 2)
      for (let z = b.z - r; z <= b.z + r; z += C / 2) {
        // into the building's own frame (three.js yaw: local x = dx cos − dz sin, local z = dx sin + dz cos)
        const dx = x - b.x;
        const dz = z - b.z;
        const lx = dx * c - dz * sn;
        const lz = dx * sn + dz * c;
        if (Math.abs(lx) > b.w / 2 + 4 || Math.abs(lz) > b.d / 2 + 4) continue;
        const i = Math.round((x - BOUND.x0) / C);
        const j = Math.round((z - BOUND.z0) / C);
        if (i < 0 || j < 0 || i >= nx || j >= nz) continue;
        h[j * nx + i] = Math.max(h[j * nx + i], top);
      }
  }
  // the highest roof within r metres
  return (x: number, z: number, r: number) => {
    let m = 0;
    const i0 = Math.max(0, Math.floor((x - r - BOUND.x0) / C));
    const i1 = Math.min(nx - 1, Math.ceil((x + r - BOUND.x0) / C));
    const j0 = Math.max(0, Math.floor((z - r - BOUND.z0) / C));
    const j1 = Math.min(nz - 1, Math.ceil((z + r - BOUND.z0) / C));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) m = Math.max(m, h[j * nx + i]);
    return m;
  };
})();
// Depth precision: the near clipping plane moves out as the camera climbs, so the layered ground (plots, courtyards,
// pavements, roads) never flickers against itself when seen from high up.
function clipNear(camera: THREE.Camera) {
  const cam = camera as THREE.PerspectiveCamera;
  const near = Math.min(60, Math.max(0.8, cam.position.y * 0.04));
  if (Math.abs(near - cam.near) > 0.2) {
    cam.near = near;
    cam.updateProjectionMatrix();
  }
}
// keep a point inside the area and above the ground and the roofs
function keepSafe(p: THREE.Vector3, groundAt: (x: number, z: number) => number) {
  p.x = Math.min(BOUND.x1, Math.max(BOUND.x0, p.x));
  p.z = Math.min(BOUND.z1, Math.max(BOUND.z0, p.z));
  const floor = Math.max(groundAt(p.x, p.z) + 6, ROOF(p.x, p.z, 9) + 8);
  p.y = Math.min(BOUND.top, Math.max(floor, p.y));
  return p;
}
function CameraRig({ timeline, groundAt }: { timeline: React.RefObject<Timeline>; groundAt: (x: number, z: number) => number }) {
  const { camera } = useThree();
  const look = useRef(new THREE.Vector3().copy(HEART));
  const v = useMemo(() => ({ p: new THREE.Vector3(), q: new THREE.Vector3() }), []);
  const last = useRef(0);
  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.1);
    const tl = timeline.current;
    if (!tl) return;
    const u = clamp01(tl.cam);
    if (u >= 1) driftShot(tl.after, v.p, v.q);
    else filmShot(u, v.p, v.q);
    keepSafe(v.p, groundAt);
    // a new loop starts behind a fade to dark: cut straight to the opening shot
    if (u < last.current - 0.5) {
      camera.position.copy(v.p);
      look.current.copy(v.q);
    }
    last.current = u;
    const k = 1 - Math.exp(-dt * 2.2);
    camera.position.lerp(v.p, k);
    keepSafe(camera.position, groundAt);
    clipNear(camera);
    look.current.lerp(v.q, k);
    camera.lookAt(look.current);
  });
  return null;
}

// ---- façade shader: windows with frames, floor lines, accent bands, lights; raw concrete frame above the façade -
// Works in each building's own frame (so rotated buildings along the curving streets read right).
const FACADE = ['#e9e4da', '#d7dde6', '#e6dccb', '#c9d2dc', '#efe8dc', '#d9d2c5'];
const ACCENTS = ['#b85c38', '#3f5f8a', '#c9a24e', '#5a7d6a'];
const KINDER = ['#f59e0b', '#22c55e', '#38bdf8', '#f472b6', '#a78bfa'];

function facadeMaterial(kind: 'body' | 'plinth') {
  return new THREE.ShaderMaterial({
    defines: kind === 'plinth' ? { PLINTH: '' } : {},
    uniforms: { uNight: { value: 0.1 }, uFog: { value: new THREE.Color() }, uNear: { value: FOG_NEAR }, uFar: { value: FOG_FAR }, uSnow: { value: 0 } },
    vertexShader: `
      attribute float aFacade; attribute float aLife; attribute vec3 aAccent; attribute float aSeed;
      varying vec3 vPos; varying vec3 vN; varying vec3 vLoc; varying vec3 vNl; varying vec3 vCol; varying vec3 vAcc; varying float vFac; varying float vLife; varying float vSeed;
      void main(){
        vec3 sc = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
        vLoc = position * sc;
        vNl = normal;
        mat4 m = modelMatrix * instanceMatrix;
        vec4 wp = m * vec4(position, 1.0);
        vPos = wp.xyz;
        vN = normalize(mat3(m) * normal);
        #ifdef USE_INSTANCING_COLOR
          vCol = instanceColor;
        #else
          vCol = vec3(1.0);
        #endif
        vAcc = aAccent; vFac = aFacade; vLife = aLife; vSeed = aSeed;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: `
      uniform float uNight; uniform vec3 uFog; uniform float uNear; uniform float uFar; uniform float uSnow;
      varying vec3 vPos; varying vec3 vN; varying vec3 vLoc; varying vec3 vNl; varying vec3 vCol; varying vec3 vAcc; varying float vFac; varying float vLife; varying float vSeed;
      // stable hash (no sin of large numbers, which turns to per-pixel noise on GPUs)
      float h(vec2 p){ vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
      void main(){
        vec3 n = normalize(vN);
        float day = 1.0 - uNight;
        float diff = (max(dot(n, normalize(vec3(0.45, 0.8, 0.3))), 0.0) * 0.55 + 0.45) * mix(0.42, 1.0, day);
        vec3 col;
        if (vNl.y > 0.5) {
          col = mix(vec3(0.30, 0.32, 0.36), vec3(0.93, 0.95, 1.0), uSnow) * diff;
        } else if (vNl.y < -0.5) {
          col = vec3(0.2) * diff;
        } else {
          float along = abs(vNl.x) > 0.5 ? vLoc.z : vLoc.x;
          float side = vNl.x * 53.0 + vNl.z * 97.0 + vSeed * 311.0;
          vec3 glass = mix(vec3(0.04, 0.06, 0.10), vec3(0.16, 0.22, 0.30), day);
          vec3 warm = vec3(1.0, 0.72, 0.40);
          vec3 avg;
          float blur;
          #ifdef PLINTH
            // shopfront: tall glazing in a dark frame, a fascia band on top, shops glowing at night
            float fu = fract(along / 4.8);
            float y = vLoc.y;
            float pane = step(0.06, fu) * step(fu, 0.94) * step(0.35, y) * step(y, 3.7);
            float fascia = step(3.9, y);
            vec3 inside = mix(glass, warm * 0.9, vLife * uNight);
            col = mix(vec3(0.12, 0.13, 0.15) * diff, inside, pane);
            col = mix(col, vAcc * diff, fascia);
            avg = mix(col, inside, 0.6);
            if (vFac < 0.5) { col = vec3(0.5, 0.5, 0.48) * diff; avg = col; }
            blur = smoothstep(0.08, 0.32, fwidth(along / 4.8));
          #else
            float y = vLoc.y;
            float fu = fract(along / 3.6);
            float fv = fract(y / ${FLOOR_H.toFixed(1)});
            float bay = floor(along / 3.6);
            float flr = floor(y / ${FLOOR_H.toFixed(1)});
            if (y > vFac) {
              // raw concrete frame: columns and slab edges, open bays dark
              float solid = clamp(step(fu, 0.12) + step(fv, 0.14), 0.0, 1.0);
              vec3 conc = vec3(0.58, 0.58, 0.56) * diff;
              col = mix(vec3(0.03, 0.04, 0.06), conc, solid);
              avg = mix(vec3(0.03, 0.04, 0.06), conc, 0.35);
            } else {
              vec3 wall = vCol;
              float accentBay = step(mod(bay + floor(vSeed * 7.0), 6.0), 0.5);
              wall = mix(wall, vAcc, accentBay * 0.9);
              wall *= 1.0 - (1.0 - step(0.07, fv)) * 0.22;
              float win = step(0.2, fu) * step(fu, 0.8) * step(0.3, fv) * step(fv, 0.86);
              float frame = step(0.17, fu) * step(fu, 0.83) * step(0.26, fv) * step(fv, 0.9) - win;
              float mull = step(abs(fu - 0.5), 0.018) * win;
              float lit = step(h(vec2(bay + side, flr)), vLife * 0.6);
              vec3 sky = glass + vec3(0.06, 0.08, 0.10) * fv * day;
              vec3 wcol = mix(sky, warm, lit * uNight);
              col = wall * diff;
              col = mix(col, vec3(0.93, 0.93, 0.91) * diff, frame * (1.0 - accentBay));
              col = mix(col, wcol, win);
              col = mix(col, vec3(0.25) * diff, mull);
              avg = mix(wall * diff, mix(sky, warm, vLife * 0.6 * uNight), 0.36);
            }
            blur = smoothstep(0.08, 0.32, max(fwidth(along / 3.6), fwidth(y / ${FLOOR_H.toFixed(1)})));
          #endif
          col = mix(col, avg, blur);
        }
        float f = smoothstep(uNear, uFar, distance(vPos, cameraPosition));
        gl_FragColor = linearToOutputTexel(vec4(mix(col, uFog, f), 1.0));
      }`,
  });
}

function useFacadeMesh(count: number, kind: 'body' | 'plinth' | 'crown') {
  return useMemo(() => {
    const geo = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
    const attr = (size: number) => new THREE.InstancedBufferAttribute(new Float32Array(count * size), size);
    geo.setAttribute('aFacade', attr(1));
    geo.setAttribute('aLife', attr(1));
    geo.setAttribute('aAccent', attr(3));
    geo.setAttribute('aSeed', attr(1));
    const mesh = new THREE.InstancedMesh(geo, facadeMaterial(kind === 'plinth' ? 'plinth' : 'body'), count);
    mesh.frustumCulled = false;
    const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < count; i++) mesh.setMatrixAt(i, zero);
    return mesh;
  }, [count, kind]);
}

// ---- buildings: plinth, body, crown, roof plant, balconies, canopies, kindergarten roofs ---------------------------
type Balcony = { b: number; lx: number; ly: number; lz: number; rot: number };

function Buildings({ timeline }: { timeline: React.RefObject<Timeline> }) {
  const list = DISTRICT.buildings;
  const body = useFacadeMesh(list.length, 'body');
  const plinth = useFacadeMesh(list.length, 'plinth');
  const crown = useFacadeMesh(list.length, 'crown');
  const roof = useRef<THREE.InstancedMesh>(null);
  const balc = useRef<THREE.InstancedMesh>(null);
  const canopy = useRef<THREE.InstancedMesh>(null);
  const gable = useRef<THREE.InstancedMesh>(null);
  const gableGeo = useMemo(() => {
    const shape = new THREE.Shape([new THREE.Vector2(-0.5, 0), new THREE.Vector2(0.5, 0), new THREE.Vector2(0, 1)]);
    return new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false }).translate(0, 0, -0.5).rotateY(Math.PI / 2);
  }, []);
  // balconies: stacks on both long faces of the housing bars, every fourth bay, every floor (in the bar's own frame)
  const balconies = useMemo(() => {
    const out: Balcony[] = [];
    list.forEach((b, i) => {
      if (b.use !== 'housing' && b.use !== 'shops') return;
      if (b.floors < 5 || Math.min(b.w, b.d) > 16) return;
      const alongX = b.w >= b.d;
      const len = alongX ? b.w : b.d;
      for (let s = -len / 2 + 7; s <= len / 2 - 7; s += 14.4)
        for (const side of [-1, 1])
          for (let f = 1; f < b.floors; f++) {
            const off = (alongX ? b.d : b.w) / 2 + 0.65;
            out.push({ b: i, lx: alongX ? s : side * off, ly: PLINTH_H + (f - 1) * FLOOR_H + 0.05, lz: alongX ? side * off : s, rot: alongX ? 0 : Math.PI / 2 });
          }
    });
    return out;
  }, [list]);
  const balcRange = useMemo(() => {
    const r = list.map(() => [0, 0]);
    balconies.forEach((bl, k) => {
      if (r[bl.b][1] === 0) r[bl.b][0] = k;
      r[bl.b][1]++;
    });
    return r;
  }, [balconies, list]);

  useEffect(() => {
    const c = new THREE.Color();
    for (const [mesh, darker] of [
      [body, 1],
      [plinth, 1],
      [crown, 0.8],
    ] as const) {
      const acc = mesh.geometry.getAttribute('aAccent') as THREE.InstancedBufferAttribute;
      const seed = mesh.geometry.getAttribute('aSeed') as THREE.InstancedBufferAttribute;
      list.forEach((b, i) => {
        mesh.setColorAt(i, c.set(b.use === 'kinder' ? KINDER[Math.floor(b.seed * KINDER.length)] : FACADE[b.facade]).multiplyScalar(darker));
        c.set(ACCENTS[b.accent]);
        acc.setXYZ(i, c.r, c.g, c.b);
        seed.setX(i, b.seed);
      });
      acc.needsUpdate = true;
      seed.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    const tin = ['#b91c1c', '#15803d', '#1d4ed8', '#9a3412', '#0f766e', '#7f1d1d', '#475569'];
    list.forEach((b, i) => gable.current?.setColorAt(i, c.set(b.use === 'house' ? tin[Math.floor(b.seed * tin.length)] : '#c2410c')));
    if (gable.current?.instanceColor) gable.current.instanceColor.needsUpdate = true;
    const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    for (const r of [roof, balc, canopy, gable]) {
      const mm = r.current;
      if (!mm) continue;
      for (let i = 0; i < mm.count; i++) mm.setMatrixAt(i, zero);
      mm.instanceMatrix.needsUpdate = true;
    }
  }, [body, plinth, crown, list]);

  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), base: new THREE.Matrix4(), part: new THREE.Matrix4(), q: new THREE.Quaternion(), up: new THREE.Vector3(0, 1, 0), p: new THREE.Vector3(), s: new THREE.Vector3(), zero: new THREE.Matrix4().makeScale(0, 0, 0) }), []);
  const last = useRef<Float32Array>(new Float32Array(list.length).fill(-1));

  useFrame(() => {
    const tl = timeline.current;
    if (!tl) return;
    const t = tl.t;
    const env = tl.env;
    for (const mesh of [body, plinth, crown]) {
      const u = (mesh.material as THREE.ShaderMaterial).uniforms;
      u.uNight.value = env.night;
      u.uSnow.value = env.snow;
      u.uNear.value = env.fogNear;
      u.uFar.value = env.fogFar;
      (u.uFog.value as THREE.Color).copy(env.sky);
    }
    const fac = [body, plinth, crown].map((x) => x.geometry.getAttribute('aFacade') as THREE.InstancedBufferAttribute);
    const life = [body, plinth, crown].map((x) => x.geometry.getAttribute('aLife') as THREE.InstancedBufferAttribute);
    const { m, base, part, q, up, p, s: sc, zero } = tmp;
    let changed = false;
    list.forEach((b, i) => {
      if (b.shape && b.shape !== 'podium') return; // towers are drawn by Offices
      const s = stageOf(b, t);
      const key = s.plinth + s.frame * 3 + s.facade * 7 + s.crown * 11 + s.life * 13;
      if (key === last.current[i]) return;
      last.current[i] = key;
      changed = true;
      const top = topOf(b);
      const foot = baseOf(b);
      const bodyH = (top - foot) * s.frame;
      q.setFromAxisAngle(up, b.yaw);
      base.compose(p.set(b.x, 0, b.z), q, sc.set(1, 1, 1));
      const put = (mesh: THREE.InstancedMesh | null, k: number, lx: number, ly: number, lz: number, w: number, h: number, d: number) =>
        mesh?.setMatrixAt(k, part.copy(base).multiply(m.makeScale(w, h, d).setPosition(lx, ly, lz)));
      if (s.plinth > 0.001) put(plinth, i, 0, 0, 0, b.w + (foot < 1 ? 0.3 : 0.8), foot * s.plinth, b.d + (foot < 1 ? 0.3 : 0.8));
      else plinth.setMatrixAt(i, zero);
      fac[1].setX(i, s.facade > 0.05 ? 1 : 0);
      if (bodyH > 0.05) put(body, i, 0, foot, 0, b.w, bodyH, b.d);
      else body.setMatrixAt(i, zero);
      fac[0].setX(i, (top - foot) * s.facade);
      if (s.crown > 0.001 && b.floors >= 9) put(crown, i, 0, top, 0, b.w * 0.62, 3.3 * s.crown, b.d * 0.7);
      else crown.setMatrixAt(i, zero);
      fac[2].setX(i, 999);
      for (const l of life) l.setX(i, s.life);
      for (let k = 0; k < 2; k++) {
        if (s.crown > 0.5 && b.use !== 'kinder' && b.use !== 'house') put(roof.current, i * 2 + k, (k ? 0.28 : -0.3) * b.w, top, (k ? -0.22 : 0.2) * b.d, 5 + k * 2, 2.4, 3.6);
        else roof.current?.setMatrixAt(i * 2 + k, zero);
      }
      const [from, count] = balcRange[i];
      const facTop = PLINTH_H + (top - PLINTH_H) * s.facade;
      for (let k = from; k < from + count; k++) {
        const bl = balconies[k];
        if (bl.ly + 1.2 < facTop) put(balc.current, k, bl.lx, bl.ly, bl.lz, bl.rot ? 1.3 : 3.4, 1.1, bl.rot ? 3.4 : 1.3);
        else balc.current?.setMatrixAt(k, zero);
      }
      const alongX = b.w >= b.d;
      if (s.facade > 0.3 && b.use !== 'school' && b.use !== 'house') put(canopy.current, i, alongX ? 0 : b.w / 2 + 1.3, 3.6, alongX ? b.d / 2 + 1.3 : 0, alongX ? 7 : 2.6, 0.35, alongX ? 2.6 : 7);
      else canopy.current?.setMatrixAt(i, zero);
      // pitched roofs: kindergartens, and the coloured tin roofs of the houses
      if ((b.use === 'kinder' || b.use === 'house') && s.facade > 0.9) put(gable.current, i, 0, top, 0, b.w + 1, b.use === 'house' ? 2.6 + b.seed * 1.4 : 3.4, b.d + 1);
      else gable.current?.setMatrixAt(i, zero);
    });
    if (!changed) return;
    for (const mesh of [body, plinth, crown]) mesh.instanceMatrix.needsUpdate = true;
    for (const a of [...fac, ...life]) a.needsUpdate = true;
    for (const r of [roof, balc, canopy, gable]) if (r.current) r.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <primitive object={plinth} />
      <primitive object={body} />
      <primitive object={crown} />
      <instancedMesh ref={roof} args={[undefined, undefined, list.length * 2]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#6b7280" roughness={0.8} />
      </instancedMesh>
      <instancedMesh ref={balc} args={[undefined, undefined, Math.max(1, balconies.length)]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#e5e7eb" roughness={0.6} />
      </instancedMesh>
      <instancedMesh ref={gable} args={[gableGeo, undefined, list.length]} frustumCulled={false}>
        <meshStandardMaterial roughness={0.7} />
      </instancedMesh>
      <instancedMesh ref={canopy} args={[undefined, undefined, list.length]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#334155" roughness={0.5} />
      </instancedMesh>
    </group>
  );
}

// ---- tower cranes: one in each block's courtyard while it goes up ----------------------------------------------
function latticeTexture(rx: number, ry: number) {
  const cv = document.createElement('canvas');
  cv.width = 64;
  cv.height = 64;
  const g = cv.getContext('2d')!;
  g.strokeStyle = '#f2b705';
  g.lineWidth = 7;
  g.strokeRect(3, 3, 58, 58);
  g.lineWidth = 5;
  g.beginPath();
  g.moveTo(0, 64);
  g.lineTo(64, 0);
  g.stroke();
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.repeat.set(rx, ry);
  return t;
}
type Crane = { x: number; z: number; h: number; t0: number; seed: number };
function Cranes({ timeline }: { timeline: React.RefObject<Timeline> }) {
  const cranes = useMemo<Crane[]>(() => {
    const byBlock = new Map<number, Building[]>();
    DISTRICT.buildings.forEach((b) => byBlock.set(b.block, [...(byBlock.get(b.block) ?? []), b]));
    // tower cranes on the blocks of flats, schools and towers (not the houses)
    return [...byBlock.entries()].filter(([bi]) => DISTRICT.blocks[bi].use !== 'house' && !DISTRICT.blocks[bi].ghost).map(([bi, bs], k) => {
      const bl = DISTRICT.blocks[bi];
      const [x, z] = bl.use === 'school' ? inQuad(bl.q, 0.75, 0.7) : inQuad(bl.q, 0.44, 0.44);
      return { x, z, h: Math.max(...bs.map(topOf)) + 16, t0: bl.t0, seed: rnd(k + 3) };
    });
  }, []);
  const tex = useMemo(() => ({ mast: latticeTexture(1, 30), jib: latticeTexture(26, 1) }), []);
  const mastGeo = useMemo(() => new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), []);
  const mast = useRef<THREE.InstancedMesh>(null);
  const jib = useRef<THREE.InstancedMesh>(null);
  const counter = useRef<THREE.InstancedMesh>(null);
  const cab = useRef<THREE.InstancedMesh>(null);
  const cable = useRef<THREE.InstancedMesh>(null);
  const m = useMemo(() => new THREE.Matrix4(), []);
  const r = useMemo(() => new THREE.Matrix4(), []);
  const top = useMemo(() => new THREE.Matrix4(), []);
  const zero = useMemo(() => new THREE.Matrix4().makeScale(0, 0, 0), []);
  useFrame(({ clock }) => {
    const t = timeline.current?.t ?? 1;
    const now = clock.elapsedTime;
    cranes.forEach((c, i) => {
      const u = clamp01((t - c.t0) / (T.buildLen + 0.03));
      const k = Math.min(ease(ramp(u, 0, 0.1)), 1 - ease(ramp(u, 0.9, 1)));
      if (k <= 0.001) {
        for (const x of [mast, jib, counter, cab, cable]) x.current?.setMatrixAt(i, zero);
        return;
      }
      const h = c.h * k;
      mast.current?.setMatrixAt(i, m.makeScale(2.4, h, 2.4).setPosition(c.x, 0, c.z));
      const full = k > 0.98;
      top.makeRotationY(now * 0.22 + c.seed * 6).setPosition(c.x, h, c.z);
      jib.current?.setMatrixAt(i, full ? r.copy(top).multiply(m.makeScale(58, 1.8, 1.8).setPosition(-24, 0.9, 0)) : zero);
      counter.current?.setMatrixAt(i, full ? r.copy(top).multiply(m.makeScale(18, 2.6, 2.6).setPosition(12, 1, 0)) : zero);
      cab.current?.setMatrixAt(i, r.copy(top).multiply(m.makeScale(3.2, 3, 3.2).setPosition(0, -1.5, 2.6)));
      const reach = 20 + (Math.sin(now * 0.5 + c.seed * 9) * 0.5 + 0.5) * 26;
      const work = Math.max(4, h * ease(ramp(u, 0.12, 0.72)) - 4);
      const len = Math.max(0.1, h - work);
      cable.current?.setMatrixAt(i, full ? r.copy(top).multiply(m.makeScale(0.25, len, 0.25).setPosition(-reach, -len / 2, 0)) : zero);
    });
    for (const x of [mast, jib, counter, cab, cable]) if (x.current) x.current.instanceMatrix.needsUpdate = true;
  });
  const n = cranes.length;
  return (
    <group>
      <instancedMesh ref={mast} args={[mastGeo, undefined, n]} frustumCulled={false}>
        <meshStandardMaterial map={tex.mast} alphaTest={0.5} side={THREE.DoubleSide} roughness={0.6} />
      </instancedMesh>
      <instancedMesh ref={jib} args={[undefined, undefined, n]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial map={tex.jib} alphaTest={0.5} side={THREE.DoubleSide} roughness={0.6} />
      </instancedMesh>
      <instancedMesh ref={counter} args={[undefined, undefined, n]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#9ca3af" roughness={0.8} />
      </instancedMesh>
      <instancedMesh ref={cab} args={[undefined, undefined, n]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#f2b705" roughness={0.5} />
      </instancedMesh>
      <instancedMesh ref={cable} args={[undefined, undefined, n]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#111827" />
      </instancedMesh>
    </group>
  );
}

// ---- ground: plots (and the plan drawn on them), courtyards, playgrounds, sports fields, snow ----------------------
const USE_FILL: Record<Use, string> = { house: '#d6b48c', housing: '#3b82f6', shops: '#a78bfa', school: '#f59e0b', kinder: '#fbbf24', park: '#22c55e', plaza: '#93c5fd', office: '#e879f9' };
// the plots in the terrain's own dusty colours: paved yards, a little greener in the parks
const GROUND: Record<Use, string> = { house: '#8a7f66', housing: '#8b8476', shops: '#8f887a', school: '#867f6c', kinder: '#867f6c', park: '#6f7a4c', plaza: '#958e80', office: '#918a7d' };
const quadGeo = (q: [number, number][], y: number) => {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([q[0][0], y, q[0][1], q[1][0], y, q[1][1], q[2][0], y, q[2][1], q[3][0], y, q[3][1]], 3));
  g.setIndex([0, 2, 1, 0, 3, 2]);
  g.computeVertexNormals();
  return g;
};
const shrinkQuad = (q: Block['q'], k: number): [number, number][] => [inQuad(q, k, k), inQuad(q, 1 - k, k), inQuad(q, 1 - k, 1 - k), inQuad(q, k, 1 - k)];

function Ground({ timeline }: { timeline: React.RefObject<Timeline> }) {
  const blocks = useMemo(() => DISTRICT.blocks.filter((b) => !b.ghost), []);
  const fills = useRef<(THREE.Mesh | null)[]>([]);
  const courts = useRef<(THREE.Group | null)[]>([]);
  const order = useMemo(() => blocks.map((b) => Math.hypot(b.cx - CX, b.cz - CZ) / 900), [blocks]);
  const housing = useMemo(() => blocks.filter((b) => b.use === 'housing' || b.use === 'shops'), [blocks]);
  const geos = useMemo(
    () => ({
      plots: blocks.map((b) => quadGeo(b.q, 0.03)),
      plan: blocks.map((b) => quadGeo(b.q, 0.6)),
      yards: housing.map((b) => quadGeo(shrinkQuad(b.q, 0.2), 0.06)),
      pads: housing.map((b) => quadGeo(shrinkQuad(b.q, 0.12), 0.045)),
    }),
    [blocks, housing],
  );
  // the site is the plan west of the river: from its west edge to just past the riverside road
  const siteGeo = useMemo(() => {
    const pos: number[] = [];
    const idx: number[] = [];
    const east = (z: number) => NS_LINES[NS_LINES.length - 1].x(Math.min(PROJECT.z1, Math.max(PROJECT.z0, z))) + 22;
    let k = 0;
    for (let z = PROJECT.z0 - 40; z <= PROJECT.z1 + 40; z += 20, k++) {
      pos.push(PROJECT.x0 - 40, 0.01, z, east(z), 0.01, z);
      if (k) idx.push(2 * k - 2, 2 * k, 2 * k - 1, 2 * k - 1, 2 * k, 2 * k + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }, []);
  // the graded site: bare earth while it is built, finished ground (grass verges, paving) once it is done
  const site = useRef<THREE.MeshStandardMaterial>(null);
  const earth = useMemo(() => new THREE.Color('#6b6150'), []);
  const done = useMemo(() => new THREE.Color('#857c62'), []); // the finished ground matches the valley floor round it
  useFrame(() => {
    const t = timeline.current?.t ?? 1;
    const rain = timeline.current?.env.rain ?? 0;
    site.current?.color.copy(earth).lerp(done, ease(ramp(t, T.trees[0], T.trees[1]))).multiplyScalar(1 - 0.3 * rain);
    blocks.forEach((b, i) => {
      const f = fills.current[i];
      if (!f) return;
      const k = ease(ramp(t, 0.02 + order[i] * 0.1, 0.06 + order[i] * 0.1)) * (1 - ease(ramp(t, 0.2, 0.3)));
      (f.material as THREE.MeshBasicMaterial).opacity = k * (b.use === 'park' ? 0.5 : 0.42);
      f.visible = k > 0.01;
    });
    housing.forEach((b, k) => {
      const c = courts.current[k];
      if (c) c.visible = t > b.t0 + T.buildLen * 0.9;
    });
  });
  return (
    <group>
      {/* the graded site */}
      <mesh geometry={siteGeo}>
        <meshStandardMaterial ref={site} color="#6b6150" roughness={1} />
      </mesh>
      {blocks.map((b, i) => (
        <mesh key={i} geometry={geos.plots[i]} userData={{ wet: true }}>
          <meshStandardMaterial color={GROUND[b.use]} roughness={1} />
        </mesh>
      ))}
      {housing.map((b, k) => {
        return (
          <group key={k} ref={(g) => void (courts.current[k] = g)} visible={false}>
            <mesh geometry={geos.yards[k]} userData={{ wet: true }}>
              <meshStandardMaterial color="#4b7a3a" roughness={1} />
            </mesh>
          </group>
        );
      })}
      {/* school sports fields */}
      {blocks
        .filter((b) => b.use === 'school')
        .map((b, k) => {
          const [fx, fz] = inQuad(b.q, 0.66, 0.66);
          return (
            <group key={`f${k}`} position={[fx, 0.07, fz]} rotation-x={-Math.PI / 2}>
              <mesh>
                <planeGeometry args={[52, 34]} />
                <meshStandardMaterial color="#b45309" roughness={1} />
              </mesh>
              <mesh position-z={0.02}>
                <planeGeometry args={[42, 24]} />
                <meshStandardMaterial color="#15803d" roughness={1} />
              </mesh>
              <mesh position-z={0.04}>
                <planeGeometry args={[0.4, 24]} />
                <meshBasicMaterial color="#f8fafc" />
              </mesh>
            </group>
          );
        })}
      <SnowCover timeline={timeline} />
      {/* the plan: the master-plan drawing itself, then the parcels coloured by use */}
      {blocks.map((b, i) => (
        <mesh key={`p${i}`} ref={(mm) => void (fills.current[i] = mm)} geometry={geos.plan[i]} visible={false}>
          <meshBasicMaterial color={USE_FILL[b.use]} transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      ))}
      <PlotLines timeline={timeline} />
    </group>
  );
}

function SnowCover({ timeline }: { timeline: React.RefObject<Timeline> }) {
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const mesh = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const snow = timeline.current?.env.snow ?? 0;
    if (mat.current) mat.current.opacity = snow * 0.92;
    if (mesh.current) mesh.current.visible = snow > 0.01;
  });
  return (
    <mesh ref={mesh} rotation-x={-Math.PI / 2} position={[CX, 0.085, CZ]} visible={false}>
      <planeGeometry args={[PROJECT.x1 - PROJECT.x0 + 120, PROJECT.z1 - PROJECT.z0 + 120]} />
      <meshStandardMaterial ref={mat} color="#eef3fa" roughness={0.9} transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

function PlotLines({ timeline }: { timeline: React.RefObject<Timeline> }) {
  const lines = useMemo(() => {
    const pts: number[] = [];
    for (const b of DISTRICT.blocks) if (!b.ghost) for (let i = 0; i < 4; i++) pts.push(b.q[i][0], 0.8, b.q[i][1], b.q[(i + 1) % 4][0], 0.8, b.q[(i + 1) % 4][1]);
    // the planned streets' centre lines
    for (const r of ROADS) for (let i = 1; i < r.pts.length; i++) pts.push(r.pts[i - 1][0], 0.8, r.pts[i - 1][1], r.pts[i][0], 0.8, r.pts[i][1]);
    const g = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: '#f8fafc', transparent: true, opacity: 0, depthWrite: false }));
  }, []);
  useFrame(() => {
    const t = timeline.current?.t ?? 1;
    (lines.material as THREE.LineBasicMaterial).opacity = 0.8 * ease(ramp(t, 0, 0.05)) * (1 - ease(ramp(t, 0.2, 0.3)));
  });
  return <primitive object={lines} />;
}

// ---- streets: carriageways and pavements paved outwards from the middle; markings, crossings, lights, bridges ------
function ribbon(pts: [number, number][], w: number, off: number, y: number) {
  const pos: number[] = [];
  const idx: number[] = [];
  pts.forEach(([x, z], k) => {
    const [ax, az] = pts[Math.max(0, k - 1)];
    const [bx, bz] = pts[Math.min(pts.length - 1, k + 1)];
    const dx = bx - ax;
    const dz = bz - az;
    const l = Math.hypot(dx, dz) || 1;
    const nx = -dz / l;
    const nz = dx / l;
    const c = off;
    pos.push(x + nx * (c - w / 2), y, z + nz * (c - w / 2), x + nx * (c + w / 2), y, z + nz * (c + w / 2));
    if (k) {
      // wound so the strip faces up (it was facing down, and so invisible from above)
      const a = (k - 1) * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
// streets appear outwards from the middle of the district: fragments beyond the reveal radius are discarded
const revealCompile = (u: { uReveal: { value: number } }) => (sh: { uniforms: Record<string, { value: unknown }>; vertexShader: string; fragmentShader: string }) => {
  sh.uniforms.uReveal = u.uReveal;
  sh.vertexShader = 'varying vec3 vWorld;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
  sh.fragmentShader = `uniform float uReveal;\nvarying vec3 vWorld;\n` + sh.fragmentShader.replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>\nif (length(vWorld.xz - vec2(${CX.toFixed(1)}, ${CZ.toFixed(1)})) > uReveal) discard;`);
};

function Streets({ timeline }: { timeline: React.RefObject<Timeline> }) {
  const geos = useMemo(() => {
    const roads = ROADS.map((r) => ribbon(r.pts, r.width, 0, 0.12));
    const walks = ROADS.flatMap((r) => [ribbon(r.pts, 4, r.width / 2 + 2, 0.15), ribbon(r.pts, 4, -(r.width / 2 + 2), 0.15)]);
    // solid white edge lines and kerbs, so the carriageways read from any height
    const edges = ROADS.flatMap((r) => [ribbon(r.pts, 0.5, r.width / 2 - 0.7, 0.2), ribbon(r.pts, 0.5, -(r.width / 2 - 0.7), 0.2)]);
    const kerbs = ROADS.flatMap((r) => [ribbon(r.pts, 0.45, r.width / 2 + 0.1, 0.24), ribbon(r.pts, 0.45, -(r.width / 2 + 0.1), 0.24)]);
    return { roads, walks, edges, kerbs };
  }, []);
  const u = useMemo(() => ({ uReveal: { value: 0 } }), []);
  const onCompile = useMemo(() => revealCompile(u), [u]);
  const roadMat = useRef<THREE.MeshStandardMaterial>(null);
  const lights = useMemo(() => {
    const out: [number, number][] = [];
    for (const r of ROADS) {
      const L = roadLength(r);
      for (let s = 16; s < L - 10; s += 34) {
        const [x, z, tx, tz] = pointAt(r, s);
        for (const side of [-1, 1]) {
          const off = side * (r.width / 2 + 1.2);
          out.push([x - tz * off, z + tx * off]);
        }
      }
    }
    return out;
  }, []);
  const stripes = useMemo(() => {
    const out: [number, number, number][] = [];
    NS_LINES.forEach((l, i) =>
      ZS.forEach((zz, j) => {
        // zebra crossings on every arm of every junction, just outside the junction box
        const [x, z] = junctionAt(i, j);
        const wx = nsWidth(i);
        const wz = ewWidth(j);
        for (let k = -wx / 2 + 1; k < wx / 2 - 0.5; k += 1.6) for (const s of [-1, 1]) out.push([x + k, z + s * (wz / 2 + 3.2), 0]);
        for (let k = -wz / 2 + 1; k < wz / 2 - 0.5; k += 1.6) {
          if (l.x(z + k) < WEST_END + 2) continue;
          for (const s of [-1, 1]) out.push([l.x(z + k) + s * (wx / 2 + 3.2), z + k, 1]);
        }
      }),
    );
    return out;
  }, []);
  const marks = useMemo(() => {
    const pts: number[] = [];
    for (const r of ROADS) {
      const offs = r.kind === 'brt' ? [-8, 0, 8] : r.kind === 'avenue' ? [-6.3, 0, 6.3] : [0];
      for (const o of offs)
        for (let i = 1; i < r.pts.length; i++) {
          const [ax, az] = r.pts[i - 1];
          const [bx, bz] = r.pts[i];
          const l = Math.hypot(bx - ax, bz - az) || 1;
          const nx = (-(bz - az) / l) * o;
          const nz = ((bx - ax) / l) * o;
          pts.push(ax + nx, 0.32, az + nz, bx + nx, 0.32, bz + nz);
        }
    }
    const g = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const l = new THREE.LineSegments(g, new THREE.LineDashedMaterial({ color: '#e5e7eb', dashSize: 5, gapSize: 7, transparent: true, opacity: 0 }));
    l.computeLineDistances();
    return l;
  }, []);
  const stripeRef = useRef<THREE.InstancedMesh>(null);
  const lineMats = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const poles = useRef<THREE.InstancedMesh>(null);
  const lamps = useRef<THREE.InstancedMesh>(null);
  const lampMat = useRef<THREE.MeshBasicMaterial>(null);
  const warm = useMemo(() => new THREE.Color(1.6, 1.25, 0.8), []);
  const m = useMemo(() => new THREE.Matrix4(), []);
  useEffect(() => {
    stripes.forEach(([x, z, alongX], i) => stripeRef.current?.setMatrixAt(i, m.makeScale(alongX ? 4.5 : 0.85, 0.05, alongX ? 0.85 : 4.5).setPosition(x, 0.3, z)));
    lights.forEach(([x, z], i) => poles.current?.setMatrixAt(i, m.makeScale(0.35, 9, 0.35).setPosition(x, 4.5, z)));
    lights.forEach(([x, z], i) => lamps.current?.setMatrixAt(i, m.makeScale(1.6, 0.5, 1.6).setPosition(x, 9.1, z)));
    for (const r of [stripeRef, poles, lamps]) if (r.current) r.current.instanceMatrix.needsUpdate = true;
  }, [stripes, lights, m]);
  useFrame(() => {
    const tl = timeline.current;
    const t = tl?.t ?? 1;
    const k = ease(ramp(t, T.roads[0], T.roads[1]));
    u.uReveal.value = k * 3400;
    (marks.material as THREE.Material).opacity = 0.5 * ramp(k, 0.7, 1);
    if (stripeRef.current) stripeRef.current.visible = k > 0.95;
    for (const r of lineMats.current) if (r) r.opacity = ramp(k, 0.6, 1);
    const upOn = t > T.roads[1];
    if (poles.current) poles.current.visible = upOn;
    if (lamps.current) lamps.current.visible = upOn;
    if (lampMat.current && tl) lampMat.current.color.setRGB(0.25, 0.27, 0.32).lerp(warm, tl.env.night);
    if (roadMat.current && tl) roadMat.current.roughness = 0.95 - tl.env.rain * 0.6;
  });
  return (
    <group>
      {geos.roads.map((g, i) => (
        <mesh key={`r${i}`} geometry={g} userData={{ wet: true }}>
          <meshStandardMaterial ref={i === 0 ? roadMat : undefined} color="#474e59" roughness={0.95} onBeforeCompile={onCompile} />
        </mesh>
      ))}
      {geos.walks.map((g, i) => (
        <mesh key={`w${i}`} geometry={g} userData={{ wet: true }}>
          <meshStandardMaterial color="#a9adb3" roughness={1} onBeforeCompile={onCompile} />
        </mesh>
      ))}
      {[...geos.edges, ...geos.kerbs].map((g, i) => (
        <mesh key={`e${i}`} geometry={g}>
          <meshBasicMaterial ref={(mm) => void (lineMats.current[i] = mm)} color={i < geos.edges.length ? '#e5e7eb' : '#cbd0d6'} transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
      <instancedMesh ref={stripeRef} args={[undefined, undefined, Math.max(1, stripes.length)]} frustumCulled={false} visible={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#f8fafc" />
      </instancedMesh>
      <primitive object={marks} />
      <instancedMesh ref={poles} args={[undefined, undefined, lights.length]} frustumCulled={false} visible={false}>
        <cylinderGeometry args={[0.5, 0.5, 1, 6]} />
        <meshStandardMaterial color="#4b5563" />
      </instancedMesh>
      <instancedMesh ref={lamps} args={[undefined, undefined, lights.length]} frustumCulled={false} visible={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial ref={lampMat} toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

// Steel arch bridges where the east–west streets cross the Selbe, with hangers down to the deck.
// ---- sports courts: half basketball courts in the neighbourhoods, football pitches in the green zones ---------------
function Courts({ timeline }: { timeline: React.RefObject<Timeline> }) {
  const g = useRef<THREE.Group>(null);
  useFrame(() => {
    if (g.current) g.current.visible = (timeline.current?.t ?? 1) > T.trees[0];
  });
  return (
    <group ref={g} visible={false}>
      {AMENITIES.courts.map((c, i) => {
        const ball = c.kind === 'basket';
        const line = (x: number, z: number, w: number, d: number, k: string) => (
          <mesh key={k} position={[x, 0.26, z]}>
            <boxGeometry args={[w, 0.02, d]} />
            <meshBasicMaterial color="#f8fafc" />
          </mesh>
        );
        return (
          <group key={i} position={[c.x, 0, c.z]} rotation-y={c.yaw}>
            {/* surround, then the playing surface */}
            <mesh position={[0, 0.16, 0]} userData={{ wet: true }}>
              <boxGeometry args={[c.w + 3, 0.12, c.d + 3]} />
              <meshStandardMaterial color={ball ? '#9a3412' : '#7c2d12'} roughness={0.9} />
            </mesh>
            <mesh position={[0, 0.22, 0]} userData={{ wet: true }}>
              <boxGeometry args={[c.w, 0.1, c.d]} />
              <meshStandardMaterial color={ball ? '#1d4ed8' : '#15803d'} roughness={0.85} />
            </mesh>
            {line(0, -c.d / 2 + 0.1, c.w, 0.2, 'a')}
            {line(0, c.d / 2 - 0.1, c.w, 0.2, 'b')}
            {line(-c.w / 2 + 0.1, 0, 0.2, c.d, 'c')}
            {line(c.w / 2 - 0.1, 0, 0.2, c.d, 'd')}
            {ball ? (
              <>
                {line(0, -c.d / 2 + 5.8, 4.9, 0.2, 'e')}
                {line(-2.45, -c.d / 2 + 2.9, 0.2, 5.8, 'f')}
                {line(2.45, -c.d / 2 + 2.9, 0.2, 5.8, 'g')}
                {/* the hoop on its post */}
                <mesh position={[0, 1.7, -c.d / 2 + 0.4]}>
                  <boxGeometry args={[0.18, 3.4, 0.18]} />
                  <meshStandardMaterial color="#334155" />
                </mesh>
                <mesh position={[0, 3.3, -c.d / 2 + 1.0]}>
                  <boxGeometry args={[1.8, 1.05, 0.08]} />
                  <meshStandardMaterial color="#f8fafc" />
                </mesh>
                <mesh position={[0, 3.0, -c.d / 2 + 1.5]} rotation-x={Math.PI / 2}>
                  <torusGeometry args={[0.23, 0.03, 6, 16]} />
                  <meshStandardMaterial color="#ea580c" />
                </mesh>
              </>
            ) : (
              <>
                {line(0, 0, c.w, 0.2, 'h')}
                {[-1, 1].map((sd) => (
                  <group key={sd}>
                    {line(0, sd * (c.d / 2 - 2.5), 8, 0.2, `p${sd}`)}
                    <mesh position={[0, 1.0, sd * (c.d / 2 - 0.2)]}>
                      <boxGeometry args={[5, 2, 0.15]} />
                      <meshStandardMaterial color="#f8fafc" transparent opacity={0.85} />
                    </mesh>
                  </group>
                ))}
              </>
            )}
          </group>
        );
      })}
    </group>
  );
}

// ---- the river park: promenades, benches, lamps, footbridges, cafés, flower beds; playgrounds everywhere ------------
function Park({ timeline }: { timeline: React.RefObject<Timeline> }) {
  const A = AMENITIES;
  const g = useRef<THREE.Group>(null);
  const paths = useMemo(() => {
    const out: THREE.BufferGeometry[] = [];
    for (const side of [-1, 1]) {
      const pts: [number, number][] = [];
      for (let z = ZS[0]; z <= ZS[ZS.length - 1]; z += 10) pts.push([bankX(z, side) + side * 19, z]);
      out.push(ribbon(pts, 5, 0, 0.09));
    }
    return out;
  }, []);
  const refs = {
    seat: useRef<THREE.InstancedMesh>(null),
    back: useRef<THREE.InstancedMesh>(null),
    pole: useRef<THREE.InstancedMesh>(null),
    lamp: useRef<THREE.InstancedMesh>(null),
    flower: useRef<THREE.InstancedMesh>(null),
  };
  const lampMat = useRef<THREE.MeshBasicMaterial>(null);
  useEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const p = new THREE.Vector3();
    const s2 = new THREE.Vector3();
    const part = new THREE.Matrix4();
    A.benches.forEach((b, i) => {
      q.setFromAxisAngle(up, b.yaw);
      const base = new THREE.Matrix4().compose(p.set(b.x, 0, b.z), q, s2.set(1, 1, 1));
      refs.seat.current?.setMatrixAt(i, part.copy(base).multiply(m.makeScale(2.2, 0.12, 0.6).setPosition(0, 0.48, 0)));
      refs.back.current?.setMatrixAt(i, part.copy(base).multiply(m.makeScale(2.2, 0.5, 0.1).setPosition(0, 0.8, -0.28)));
    });
    A.lamps.forEach((l, i) => {
      refs.pole.current?.setMatrixAt(i, m.makeScale(0.15, 4.5, 0.15).setPosition(l.x, 2.25, l.z));
      refs.lamp.current?.setMatrixAt(i, m.makeScale(0.6, 0.6, 0.6).setPosition(l.x, 4.6, l.z));
    });
    const c = new THREE.Color();
    A.flowers.forEach((f, i) => {
      refs.flower.current?.setMatrixAt(i, m.makeScale(6, 0.4, 6).setPosition(f.x, 0.2, f.z));
      refs.flower.current?.setColorAt(i, c.set(['#f472b6', '#facc15', '#f97316', '#a78bfa'][i % 4]));
    });
    for (const r of Object.values(refs)) {
      if (!r.current) continue;
      r.current.instanceMatrix.needsUpdate = true;
      if (r.current.instanceColor) r.current.instanceColor.needsUpdate = true;
    }
  }, [A, refs.seat, refs.back, refs.pole, refs.lamp, refs.flower]);
  useFrame(() => {
    const tl = timeline.current;
    if (g.current) g.current.visible = (tl?.t ?? 1) > T.trees[0];
    if (lampMat.current && tl) lampMat.current.color.setRGB(0.4, 0.4, 0.38).lerp(new THREE.Color(1.8, 1.5, 1.0), tl.env.night);
  });
  return (
    <group ref={g} visible={false}>
      {paths.map((p, i) => (
        <mesh key={i} geometry={p} userData={{ wet: true }}>
          <meshStandardMaterial color="#b9a88a" roughness={1} />
        </mesh>
      ))}
      <instancedMesh ref={refs.seat} args={[undefined, undefined, A.benches.length]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#8b5a2b" roughness={0.8} />
      </instancedMesh>
      <instancedMesh ref={refs.back} args={[undefined, undefined, A.benches.length]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#8b5a2b" roughness={0.8} />
      </instancedMesh>
      <instancedMesh ref={refs.pole} args={[undefined, undefined, Math.max(1, A.lamps.length)]} frustumCulled={false}>
        <cylinderGeometry args={[0.5, 0.5, 1, 6]} />
        <meshStandardMaterial color="#1f2937" />
      </instancedMesh>
      <instancedMesh ref={refs.lamp} args={[undefined, undefined, Math.max(1, A.lamps.length)]} frustumCulled={false}>
        <sphereGeometry args={[1, 10, 8]} />
        <meshBasicMaterial ref={lampMat} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={refs.flower} args={[undefined, undefined, Math.max(1, A.flowers.length)]} frustumCulled={false}>
        <cylinderGeometry args={[0.5, 0.5, 1, 16]} />
        <meshStandardMaterial roughness={1} />
      </instancedMesh>
      {/* footbridges over the river */}
      {A.footbridges.map((f, i) => (
        <group key={i} position={[f.x, 0, f.z]}>
          <mesh position={[0, 1.2, 0]}>
            <boxGeometry args={[RIVER_W + 14, 0.4, 3.2]} />
            <meshStandardMaterial color="#a8a29e" roughness={0.7} />
          </mesh>
          {[-1, 1].map((s2) => (
            <mesh key={s2} position={[0, 2, s2 * 1.55]}>
              <boxGeometry args={[RIVER_W + 14, 1.1, 0.08]} />
              <meshStandardMaterial color="#cbd5e1" transparent opacity={0.6} />
            </mesh>
          ))}
        </group>
      ))}
      {/* café pavilions with a terrace */}
      {A.cafes.map((c, i) => (
        <group key={i} position={[c.x, 0, c.z]}>
          <mesh position={[0, 2, 0]}>
            <boxGeometry args={[14, 4, 9]} />
            <meshStandardMaterial color="#9fc4d8" transparent opacity={0.75} roughness={0.1} metalness={0.3} />
          </mesh>
          <mesh position={[0, 4.15, 0]}>
            <boxGeometry args={[16, 0.3, 11]} />
            <meshStandardMaterial color="#e7e5e4" />
          </mesh>
          {[-4, 0, 4].map((x) => (
            <group key={x} position={[x, 0, 8.5]}>
              <mesh position={[0, 0.75, 0]}>
                <cylinderGeometry args={[0.6, 0.6, 0.06, 12]} />
                <meshStandardMaterial color="#f5f5f4" />
              </mesh>
              <mesh position={[0, 2.2, 0]}>
                <coneGeometry args={[1.6, 0.8, 10]} />
                <meshStandardMaterial color={['#ef4444', '#f59e0b', '#16a34a'][i % 3]} side={THREE.DoubleSide} />
              </mesh>
            </group>
          ))}
        </group>
      ))}
      {/* playgrounds: soft surface, swings, a slide, a sandpit */}
      {A.playgrounds.map((p, i) => (
        <group key={i} position={[p.x, 0, p.z]}>
          <mesh rotation-x={-Math.PI / 2} position-y={0.09} userData={{ wet: true }}>
            <planeGeometry args={[18, 13]} />
            <meshStandardMaterial color={i % 2 ? '#c2410c' : '#0f766e'} roughness={1} />
          </mesh>
          {[-2.4, 2.4].map((x) => (
            <mesh key={x} position={[-5 + x, 1.3, -3]}>
              <boxGeometry args={[0.15, 2.6, 0.15]} />
              <meshStandardMaterial color="#facc15" />
            </mesh>
          ))}
          <mesh position={[-5, 2.6, -3]}>
            <boxGeometry args={[5, 0.15, 0.15]} />
            <meshStandardMaterial color="#facc15" />
          </mesh>
          <mesh position={[4, 1, 2]} rotation-z={0.5}>
            <boxGeometry args={[4.5, 0.15, 1]} />
            <meshStandardMaterial color="#38bdf8" />
          </mesh>
          <mesh position={[5.8, 1.1, 2]}>
            <boxGeometry args={[1.2, 2.2, 1.2]} />
            <meshStandardMaterial color="#ef4444" />
          </mesh>
          <mesh rotation-x={-Math.PI / 2} position={[-4, 0.12, 3.5]}>
            <planeGeometry args={[4, 4]} />
            <meshStandardMaterial color="#e7d9a8" roughness={1} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ---- trees -------------------------------------------------------------------------------------------------------
function Trees({ timeline }: { timeline: React.RefObject<Timeline> }) {
  const list = DISTRICT.trees;
  const crown = useRef<THREE.InstancedMesh>(null);
  const cone = useRef<THREE.InstancedMesh>(null);
  const trunk = useRef<THREE.InstancedMesh>(null);
  const m = useMemo(() => new THREE.Matrix4(), []);
  const zero = useMemo(() => new THREE.Matrix4().makeScale(0, 0, 0), []);
  const last = useRef(-1);
  const lastSeason = useRef('');
  const base = useMemo(() => list.map((_, i) => new THREE.Color().setHSL(0.27 + rnd(i) * 0.1, 0.45, 0.24 + rnd(i + 9) * 0.1)), [list]);
  const fall = useMemo(() => list.map((_, i) => new THREE.Color().setHSL(0.02 + rnd(i + 3) * 0.1, 0.75, 0.42)), [list]);
  useFrame(() => {
    const tl = timeline.current;
    const g = ramp(tl?.t ?? 1, T.trees[0], T.trees[1]);
    // colours: summer green, autumn gold and red, snow on the branches in winter
    const e = tl?.env;
    const key = e ? `${Math.round(e.autumn * 20)}:${Math.round(e.snow * 20)}` : '';
    if (key !== lastSeason.current && e) {
      lastSeason.current = key;
      const c = new THREE.Color();
      const white = new THREE.Color('#e8eef6');
      list.forEach((t, i) => {
        c.copy(base[i]).lerp(fall[i], e.autumn).lerp(white, e.snow * 0.7);
        crown.current?.setColorAt(i, c);
        cone.current?.setColorAt(i, c.copy(base[i]).offsetHSL(0.02, 0, -0.05).lerp(white, e.snow * 0.45));
      });
      for (const r of [crown, cone]) if (r.current?.instanceColor) r.current.instanceColor.needsUpdate = true;
    }
    if (Math.abs(g - last.current) < 1e-3) return;
    last.current = g;
    list.forEach((t, i) => {
      const s = ease(clamp01(g * 1.5 - t.t * 0.5)) * t.s;
      if (s < 0.01) {
        for (const r of [crown, cone, trunk]) r.current?.setMatrixAt(i, zero);
        return;
      }
      trunk.current?.setMatrixAt(i, m.makeScale(0.6 * s, 3.5 * s, 0.6 * s).setPosition(t.x, 0, t.z));
      if (t.kind === 0) {
        crown.current?.setMatrixAt(i, m.makeScale(4.2 * s, 4.6 * s, 4.2 * s).setPosition(t.x, 5.2 * s, t.z));
        cone.current?.setMatrixAt(i, zero);
      } else {
        cone.current?.setMatrixAt(i, m.makeScale(3.6 * s, 11 * s, 3.6 * s).setPosition(t.x, 2.2 * s, t.z));
        crown.current?.setMatrixAt(i, zero);
      }
    });
    for (const r of [crown, cone, trunk]) if (r.current) r.current.instanceMatrix.needsUpdate = true;
  });
  const coneGeo = useMemo(() => new THREE.ConeGeometry(1, 1, 7).translate(0, 0.5, 0), []);
  const trunkGeo = useMemo(() => new THREE.CylinderGeometry(0.5, 0.6, 1, 5).translate(0, 0.5, 0), []);
  return (
    <group>
      <instancedMesh ref={crown} args={[undefined, undefined, list.length]} frustumCulled={false}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial roughness={1} flatShading />
      </instancedMesh>
      <instancedMesh ref={cone} args={[coneGeo, undefined, list.length]} frustumCulled={false}>
        <meshStandardMaterial roughness={1} flatShading />
      </instancedMesh>
      <instancedMesh ref={trunk} args={[trunkGeo, undefined, list.length]} frustumCulled={false}>
        <meshStandardMaterial color="#5b4636" roughness={1} />
      </instancedMesh>
    </group>
  );
}

// ---- bus stops: pins in the plan, shelters on both sides once the streets are in --------------------------------------
function Stops({ timeline }: { timeline: React.RefObject<Timeline> }) {
  const pins = useRef<THREE.Group>(null);
  const shelters = useRef<THREE.Group>(null);
  const spots = useMemo(
    () =>
      STOPS.flatMap((st) => {
        const r = ROADS[st.road];
        const [x, z, tx, tz] = pointAt(r, sAt(r, st.x, st.z));
        return [-1, 1].map((side) => {
          const off = side * (r.width / 2 + 3.5);
          return { x: x - tz * off, z: z + tx * off, yaw: Math.atan2(-tz, tx) + (side > 0 ? Math.PI : 0) };
        });
      }),
    [],
  );
  useFrame(({ clock }) => {
    const t = timeline.current?.t ?? 1;
    if (pins.current) {
      const k = ease(ramp(t, 0.08, 0.13)) * (1 - ease(ramp(t, 0.2, 0.26)));
      pins.current.visible = k > 0.01;
      pins.current.children.forEach((c, i) => (c.position.y = 18 + (1 - k) * 60 + Math.sin(clock.elapsedTime * 2 + i) * 1.5));
    }
    if (shelters.current) shelters.current.visible = t > T.roads[1];
  });
  return (
    <group>
      <group ref={shelters} visible={false}>
        {spots.map((s, i) => (
          <group key={i} position={[s.x, 0, s.z]} rotation-y={s.yaw}>
            <mesh position={[0, 2.9, 0]}>
              <boxGeometry args={[11, 0.3, 3]} />
              <meshStandardMaterial color="#1e3a8a" />
            </mesh>
            <mesh position={[0, 1.5, -1.3]}>
              <boxGeometry args={[11, 2.6, 0.15]} />
              <meshStandardMaterial color="#93c5fd" transparent opacity={0.5} emissive="#3b82f6" emissiveIntensity={0.4} />
            </mesh>
          </group>
        ))}
      </group>
      <group ref={pins}>
        {STOPS.map((s, i) => (
          <mesh key={i} position={[s.x, 18, s.z]}>
            <sphereGeometry args={[6, 16, 12]} />
            <meshBasicMaterial color="#60a5fa" />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// ---- sky, weather ----------------------------------------------------------------------------------------------
// ---- sky: the sun and the moon cross it with the clock; days are short when it snows (winter) ---------------------
// Ulaanbaatar: in summer the sun rises about 05:30 and sets about 21:15, high at noon; in winter it rises about
// 08:30, sets about 17:15 and stays low.
const DAY = { summer: { rise: 5.5, set: 21.25, top: 66 }, winter: { rise: 8.5, set: 17.25, top: 19 } };
// how far into winter today is: 0 at midsummer, 1 at midwinter (Ulaanbaatar's date)
function winterNow() {
  const d = new Date(Date.now() + 8 * 3600000);
  const day = (d.getTime() - Date.UTC(d.getUTCFullYear(), 0, 1)) / 86400000;
  return (1 + Math.cos((2 * Math.PI * (day - 172)) / 365.25)) / 2;
}
const SKY = { overcast: new THREE.Color('#8e979f'), sunny: new THREE.Color('#8fb3dc'), rainy: new THREE.Color('#6b7480'), snowy: new THREE.Color('#b9c6d4'), dusk: new THREE.Color('#e3895c'), night: new THREE.Color('#050a16') };
// where the sun is (unit vector; it rises in the east, x+, crosses the south, z+, and sets in the west)
function sunAt(hour: number, winter: number, out: THREE.Vector3) {
  const rise = DAY.summer.rise + (DAY.winter.rise - DAY.summer.rise) * winter;
  const set = DAY.summer.set + (DAY.winter.set - DAY.summer.set) * winter;
  const top = (DAY.summer.top + (DAY.winter.top - DAY.summer.top) * winter) * (Math.PI / 180);
  let u = (hour - rise) / (set - rise);
  let elev: number;
  if (u >= 0 && u <= 1) elev = Math.sin(u * Math.PI) * top;
  else {
    // below the horizon: as deep as the night is long
    const nightLen = 24 - (set - rise);
    const k = ((hour - set + 24) % 24) / nightLen;
    u = 1 + k;
    elev = -Math.sin(k * Math.PI) * 0.6;
  }
  const a = u * Math.PI;
  out.set(Math.cos(a) * Math.cos(elev), Math.sin(elev), Math.sin(a) * Math.cos(elev) * 0.85 + 0.15).normalize();
  return elev * (180 / Math.PI);
}
function Atmosphere({ timeline }: { timeline: React.RefObject<Timeline> }) {
  const { scene, camera } = useThree();
  const hemi = useRef<THREE.HemisphereLight>(null);
  const sun = useRef<THREE.DirectionalLight>(null);
  const sunDisc = useRef<THREE.Mesh>(null);
  const sunGlow = useRef<THREE.Mesh>(null);
  const moon = useRef<THREE.Mesh>(null);
  const bg = useMemo(() => SKY.sunny.clone(), []);
  const day = useMemo(() => new THREE.Color(), []);
  const tmpv = useMemo(() => new THREE.Vector3(), []);
  const wasSandbox = useRef(false);
  const mist = useRef(0);
  const glowTex = useMemo(() => {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 128;
    const g = cv.getContext('2d')!;
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, 'rgba(255,240,200,0.9)');
    grd.addColorStop(0.25, 'rgba(255,200,120,0.35)');
    grd.addColorStop(1, 'rgba(255,180,100,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(cv);
  }, []);
  useEffect(() => {
    scene.background = bg;
    scene.fog = new THREE.Fog(bg, FOG_NEAR, FOG_FAR);
  }, [scene, bg]);
  useFrame((_, dtRaw) => {
    const tl = timeline.current;
    if (!tl) return;
    const dt = Math.min(dtRaw, 0.1);
    const e = tl.env;
    let snowTo = 0;
    let rainTo = 0;
    const L = tl.live;
    if (L) {
      // Ulaanbaatar time (UTC+8, no daylight saving), whoever is watching and wherever they are
      e.hour = (((Date.now() / 3600000 + 8) % 24) + 24) % 24;
    } else if (!tl.sandbox && !tl.hourPicked) {
      wasSandbox.current = false;
      e.hour = filmHour(tl.t);
    } else {
      if (!wasSandbox.current && !tl.hourPicked) {
        e.hour = 21;
        tl.targetHour = 21;
      }
      wasSandbox.current = true;
      // glide to the picked hour (forwards, the way a day goes), then let the clock run on at its speed
      const ahead = (tl.targetHour - e.hour + 24) % 24;
      if (ahead > 0.02 && ahead < 23.9) e.hour = (e.hour + Math.min(ahead, Math.max(0.05, ahead * 1.6) * dt)) % 24;
      else {
        e.hour = (e.hour + dt * tl.speed) % 24;
        tl.targetHour = e.hour;
      }
    }
    // the weather: live from outside, or the one picked (it applies at once, in the film too)
    snowTo = L ? Math.max(L.cover, L.snow) : tl.weather === 'snowy' ? 1 : 0;
    rainTo = L ? L.rain : tl.weather === 'rainy' ? 1 : 0;
    const cloudTo = L ? L.cloud : tl.weather === 'sunny' ? 0.12 : 0.9;
    const fogTo = L ? L.fog : 0;
    e.snow += (snowTo - e.snow) * Math.min(1, dt * 0.35);
    e.snowing = L ? L.snow : snowTo;
    e.rain += (rainTo - e.rain) * Math.min(1, dt * 0.8);
    e.cloud += (cloudTo - e.cloud) * Math.min(1, dt * 0.5);
    mist.current += (fogTo - mist.current) * Math.min(1, dt * 0.5);
    e.autumn += (0 - e.autumn) * Math.min(1, dt * 0.35);
    // the length of the day follows the real season when live, the snow otherwise
    const elev = sunAt(e.hour, L ? winterNow() : e.snow, e.sun);
    e.sunUp = clamp01((elev + 4) / 10);
    // night follows the sun: full day above ~6°, full night below about −8°
    e.night = 0.1 + 0.82 * clamp01((6 - elev) / 14);
    day.copy(SKY.sunny).lerp(SKY.overcast, e.cloud * 0.75).lerp(SKY.rainy, e.rain * 0.9).lerp(SKY.snowy, e.snowing * 0.7);
    // sunrise and sunset colour the sky
    const dusk = clamp01(1 - Math.abs(elev - 2) / 10) * (1 - e.rain * 0.7);
    day.lerp(SKY.dusk, dusk * 0.55);
    e.sky.copy(day).lerp(SKY.night, clamp01((e.night - 0.1) / 0.82));
    e.fogNear = Math.max(150, FOG_NEAR - e.rain * 2200 - e.snowing * 1200 - mist.current * 2700);
    e.fogFar = Math.max(1400, FOG_FAR - e.rain * 6500 - e.snowing * 4500 - e.cloud * 1500 - mist.current * 8800);
    bg.copy(e.sky);
    const fog = scene.fog as THREE.Fog | null;
    if (fog) {
      fog.color.copy(e.sky);
      fog.near = e.fogNear;
      fog.far = e.fogFar;
    }
    const clear = 1 - e.rain * 0.85 - e.snowing * 0.5 - e.cloud * 0.55;
    if (hemi.current) hemi.current.intensity = (1.4 - e.night * 0.9) * (1 - e.rain * 0.3);
    if (sun.current) {
      sun.current.intensity = 2.0 * e.sunUp * Math.max(0.25, clear);
      sun.current.position.copy(e.sun).multiplyScalar(1500).add(tmpv.set(CX, 0, CZ));
      sun.current.target.position.set(CX, 0, CZ);
      sun.current.target.updateMatrixWorld();
      sun.current.color.set('#fff4e0').lerp(SKY.dusk, dusk * 0.7);
    }
    // the sun and the moon on the sky, far off, following the camera
    if (sunDisc.current && sunGlow.current) {
      sunDisc.current.position.copy(camera.position).addScaledVector(e.sun, 9000);
      sunGlow.current.position.copy(sunDisc.current.position);
      sunGlow.current.lookAt(camera.position);
      const vis = elev > -3 && clear > 0.3 && e.cloud < 0.8;
      sunDisc.current.visible = vis;
      sunGlow.current.visible = vis;
      (sunDisc.current.material as THREE.MeshBasicMaterial).color.set('#fff6d8').lerp(SKY.dusk, dusk * 0.8);
    }
    if (moon.current) {
      moon.current.position.copy(camera.position).addScaledVector(tmpv.copy(e.sun).multiplyScalar(-1).setY(Math.abs(e.sun.y) + 0.15).normalize(), 9000);
      moon.current.visible = e.night > 0.5 && e.rain < 0.5 && e.cloud < 0.8;
    }
  });
  return (
    <>
      <hemisphereLight ref={hemi} args={['#dbe7ff', '#3a3326', 1.3]} />
      <directionalLight ref={sun} position={[600, 900, 400]} intensity={1.7} />
      <mesh ref={sunDisc} renderOrder={-1}>
        <sphereGeometry args={[150, 24, 16]} />
        <meshBasicMaterial color="#fff6d8" fog={false} toneMapped={false} />
      </mesh>
      <mesh ref={sunGlow} renderOrder={-1}>
        <planeGeometry args={[1500, 1500]} />
        <meshBasicMaterial map={glowTex} transparent depthWrite={false} fog={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh ref={moon} renderOrder={-1}>
        <sphereGeometry args={[110, 24, 16]} />
        <meshBasicMaterial color="#e6ecf5" fog={false} />
      </mesh>
    </>
  );
}

// Wet in the rain: the ground, the streets and the pavements darken and shine.
function Wetness({ timeline }: { timeline: React.RefObject<Timeline> }) {
  const { scene } = useThree();
  const list = useRef<{ m: THREE.MeshStandardMaterial; c: THREE.Color; r: number }[] | null>(null);
  const last = useRef(-1);
  useFrame(() => {
    const rain = timeline.current?.env.rain ?? 0;
    if (Math.abs(rain - last.current) < 0.01) return;
    last.current = rain;
    if (!list.current) {
      list.current = [];
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.userData?.wet) return;
        const m = mesh.material as THREE.MeshStandardMaterial;
        if (m && m.color) list.current!.push({ m, c: m.color.clone(), r: m.roughness });
      });
    }
    for (const { m, c, r } of list.current) {
      m.color.copy(c).multiplyScalar(1 - 0.32 * rain);
      m.roughness = r * (1 - 0.65 * rain);
    }
  });
  return null;
}

// The clouds: a deck high over the city, drifting with the wind, as thick as the sky is covered.
function Clouds({ timeline }: { timeline: React.RefObject<Timeline> }) {
  const { camera } = useThree();
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        fog: false,
        side: THREE.DoubleSide, // seen from below
        uniforms: { uTime: { value: 0 }, uCover: { value: 0 }, uLight: { value: new THREE.Color('#ffffff') }, uShade: { value: new THREE.Color('#6b7480') }, uCam: { value: new THREE.Vector2() } },
        vertexShader: `varying vec2 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xz; gl_Position = projectionMatrix * viewMatrix * w; }`,
        fragmentShader: `
          uniform float uTime; uniform float uCover; uniform vec3 uLight; uniform vec3 uShade; uniform vec2 uCam; varying vec2 vW;
          float h(vec2 p){ vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
          float n(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
            return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
          float fbm(vec2 p){ float a = 0.5, s = 0.0; for (int k = 0; k < 5; k++) { s += a * n(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }
          void main(){
            vec2 p = vW * 0.00045 + vec2(uTime * 0.006, uTime * 0.0025);
            float c = fbm(p);
            float t = 1.0 - uCover;
            float a = smoothstep(t - 0.12, t + 0.22, c) * min(1.0, uCover * 1.6);
            // thin out towards the far edge of the deck
            a *= 1.0 - smoothstep(6000.0, 14000.0, distance(vW, uCam));
            vec3 col = mix(uShade, uLight, smoothstep(0.35, 0.85, c));
            gl_FragColor = vec4(col, a * 0.92);
          }`,
      }),
    [],
  );
  useFrame((_, dt) => {
    const e = timeline.current?.env;
    if (!e || !mesh.current) return;
    mat.uniforms.uTime.value += Math.min(dt, 0.1);
    mat.uniforms.uCover.value = e.cloud;
    // lit by the sun by day, dim at night; heavy and grey in rain and snow
    const lit = 1 - e.night * 0.85;
    (mat.uniforms.uLight.value as THREE.Color).setRGB(lit, lit, lit * 1.02).lerp(e.sky, 0.35 + e.rain * 0.3);
    (mat.uniforms.uShade.value as THREE.Color).copy(e.sky).multiplyScalar(0.55 + 0.25 * lit);
    mesh.current.visible = e.cloud > 0.05;
    mesh.current.position.set(camera.position.x, Math.max(1300, camera.position.y + 700), camera.position.z);
    (mat.uniforms.uCam.value as THREE.Vector2).set(camera.position.x, camera.position.z);
  });
  return (
    <mesh ref={mesh} material={mat} rotation-x={-Math.PI / 2} renderOrder={-1} frustumCulled={false}>
      <planeGeometry args={[30000, 30000]} />
    </mesh>
  );
}

// Warming up, behind the opening fade: once the terrain and the city have arrived, every shader is compiled ahead
// of time and a few frames are drawn, so the film starts smoothly instead of stuttering through its first seconds.
// (Gives up waiting after eight seconds, so a slow connection never leaves the page dark.)
function Warmup({ timeline, loaded }: { timeline: React.RefObject<Timeline>; loaded: boolean }) {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    const give = setTimeout(() => timeline.current && (timeline.current.ready = true), 8000);
    return () => clearTimeout(give);
  }, [timeline]);
  useEffect(() => {
    if (!loaded) return;
    let gone = false;
    const done = () => {
      // two more frames with everything compiled, then go
      requestAnimationFrame(() => requestAnimationFrame(() => !gone && timeline.current && (timeline.current.ready = true)));
    };
    const compile = (gl as THREE.WebGLRenderer & { compileAsync?: (s: THREE.Object3D, c: THREE.Camera) => Promise<unknown> }).compileAsync;
    if (compile) compile.call(gl, scene, camera).then(done, done);
    else done();
    return () => {
      gone = true;
    };
  }, [loaded, gl, scene, camera, timeline]);
  return null;
}

// Rain and snow falling round the camera.
function Precipitation({ timeline }: { timeline: React.RefObject<Timeline> }) {
  const { camera } = useThree();
  const N = 14000; // spread over twice the height, so the falling volume always covers the view
  const R = 340;
  const H = 420;
  const rain = useMemo(() => {
    const pos = new Float32Array(N * 6);
    for (let i = 0; i < N; i++) {
      const x = (rnd(i) - 0.5) * 2 * R;
      const y = rnd(i + 1) * H * 2;
      const z = (rnd(i + 2) - 0.5) * 2 * R;
      pos.set([x, y, z, x - 0.3, y - 3.2, z], i * 6);
    }
    return new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(pos, 3));
  }, []);
  const snow = useMemo(() => {
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) pos.set([(rnd(i + 5) - 0.5) * 2 * R, rnd(i + 6) * H * 2, (rnd(i + 7) - 0.5) * 2 * R], i * 3);
    return new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(pos, 3));
  }, []);
  const rainRef = useRef<THREE.LineSegments>(null);
  const snowRef = useRef<THREE.Points>(null);
  const fall = useRef(0);
  useFrame((_, dtRaw) => {
    const e = timeline.current?.env;
    if (!e) return;
    const dt = Math.min(dtRaw, 0.1);
    fall.current += dt;
    for (const [ref, on, speed] of [
      [rainRef, e.rain, 90],
      [snowRef, e.snowing * Math.min(1, e.snow * 3), 4],
    ] as const) {
      const o = ref.current;
      if (!o) continue;
      o.visible = on > 0.03;
      if (!o.visible) continue;
      ((o as THREE.Object3D & { material: THREE.Material }).material as THREE.Material).opacity = on * (speed > 10 ? 0.45 : 0.9);
      // the volume moves with the camera; the drops fall through it and wrap
      // from the ground up past the camera, wherever it is
      const y = (fall.current * speed) % H;
      const base = Math.max(-20, camera.position.y - H * 0.7);
      o.position.set(Math.round(camera.position.x / 20) * 20, base - y, Math.round(camera.position.z / 20) * 20);
      if (speed < 10) o.rotation.y = Math.sin(fall.current * 0.3) * 0.2;
    }
  });
  return (
    <group>
      <lineSegments ref={rainRef} geometry={rain} visible={false} frustumCulled={false}>
        <lineBasicMaterial color="#c7d2fe" transparent opacity={0.4} />
      </lineSegments>
      <points ref={snowRef} geometry={snow} visible={false} frustumCulled={false}>
        <pointsMaterial color="#ffffff" size={2.2} transparent opacity={0.9} sizeAttenuation />
      </points>
    </group>
  );
}

export default function DistrictCanvas({ timeline, running }: DistrictProps) {
  const ground = useGround();
  const lines = useLines();
  const city = useCity();
  const groundAt = useMemo(() => (ground ? ground.at : () => 0), [ground]);
  return (
    <div className="pointer-events-none relative h-full w-full">
      <Canvas dpr={[1, 1.25]} frameloop={running ? 'always' : 'never'} camera={{ fov: 38, near: 3, far: 26000, position: [-700, 430, -900] }} gl={{ antialias: true }}>
        <Atmosphere timeline={timeline} />
        {ground && <RealTerrain ground={ground} timeline={timeline} />}
        {ground && lines && <RealLines ground={ground} lines={lines} timeline={timeline} />}
        {ground && city && <RealCity ground={ground} city={city} timeline={timeline} />}
        <SelbeInDistrict timeline={timeline} />
        <Ground timeline={timeline} />
        <Streets timeline={timeline} />
        <Buildings timeline={timeline} />
        <Offices timeline={timeline} />
        <Cranes timeline={timeline} />
        <Park timeline={timeline} />
        <Courts timeline={timeline} />
        <Birds timeline={timeline} />
        <Trees timeline={timeline} />
        <Stops timeline={timeline} />
        <Wetness timeline={timeline} />
        <CityLife timeline={timeline} />
        <Precipitation timeline={timeline} />
        <Clouds timeline={timeline} />
        <CameraRig timeline={timeline} groundAt={groundAt} />
        <Warmup timeline={timeline} loaded={!!(ground && lines && city)} />
      </Canvas>
    </div>
  );
}
