'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { DISTRICT, T, type Building } from '@/lib/district';
import type { Timeline } from './DistrictCanvas';

// The business district's office towers, each one designed differently:
//  glass     — a crisp glass prism with a set-back crown and a mast
//  stepped   — three tiers stepping in as it rises
//  twist     — floor plates turning a little on each floor
//  round     — a glass cylinder with a crown ring
//  landmark  — the tallest: a tapering glass tower with a spire
// The core and floor slabs go up first (raw concrete), the curtain wall follows; at night the offices light up.

export const OFFICE_FLOOR = 3.9;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const ease = (k: number) => k * k * (3 - 2 * k);
const ramp = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const BUILD = T.buildLen + 0.06; // towers take a little longer
export const towerTop = (b: Building) => b.floors * OFFICE_FLOOR + (b.shape === 'landmark' ? 36 : b.shape === 'glass' ? 18 : 0);

const TINTS = ['#2f6f8f', '#3b5f7d', '#2c7a7b', '#4a6a8c'];

function glassMaterial(round: boolean) {
  return new THREE.ShaderMaterial({
    defines: round ? { ROUND: '' } : {},
    uniforms: { uNight: { value: 0.1 }, uFog: { value: new THREE.Color('#13213d') }, uNear: { value: 2600 }, uFar: { value: 9000 }, uSnow: { value: 0 } },
    vertexShader: `
      attribute float aFacade; attribute float aLife; attribute vec3 aTint; attribute float aSeed;
      varying vec3 vPos; varying vec3 vN; varying vec3 vLoc; varying vec3 vNl; varying float vFac; varying float vLife; varying vec3 vTint; varying float vSeed;
      void main(){
        vec3 sc = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
        vLoc = position * sc;
        vNl = normal;
        mat4 m = modelMatrix * instanceMatrix;
        vec4 wp = m * vec4(position, 1.0);
        vPos = wp.xyz;
        vN = normalize(mat3(m) * normal);
        vFac = aFacade; vLife = aLife; vTint = aTint; vSeed = aSeed;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: `
      uniform float uNight; uniform vec3 uFog; uniform float uNear; uniform float uFar; uniform float uSnow;
      varying vec3 vPos; varying vec3 vN; varying vec3 vLoc; varying vec3 vNl; varying float vFac; varying float vLife; varying vec3 vTint; varying float vSeed;
      // stable hash (no sin of large numbers, which turns to per-pixel noise on GPUs)
      float h(vec2 p){ vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
      void main(){
        vec3 n = normalize(vN);
        float day = 1.0 - uNight;
        vec3 sun = normalize(vec3(0.45, 0.8, 0.3));
        float diff = (max(dot(n, sun), 0.0) * 0.5 + 0.5) * mix(0.4, 1.0, day);
        vec3 col;
        #ifdef ROUND
          bool roof = abs(vNl.y) > 0.5;
        #else
          bool roof = abs(vNl.y) > 0.5;
        #endif
        if (roof) {
          col = mix(vec3(0.28, 0.30, 0.34), vec3(0.92), uSnow) * diff;
        } else {
          #ifdef ROUND
            float along = atan(vLoc.z, vLoc.x) * length(vLoc.xz);
          #else
            float along = abs(vNl.x) > 0.5 ? vLoc.z : vLoc.x;
          #endif
          float fy = fract(vPos.y / ${OFFICE_FLOOR.toFixed(1)});
          float fu = fract(along / 1.6);
          if (vPos.y > vFac) {
            // the raw frame: slab edges every floor, columns every 8 m, open between
            float slab = step(fy, 0.13);
            float colm = step(fract(along / 8.0), 0.05);
            col = mix(vec3(0.03, 0.04, 0.06), vec3(0.6, 0.6, 0.58) * diff, clamp(slab + colm, 0.0, 1.0));
          } else {
            vec3 V = normalize(cameraPosition - vPos);
            float fres = pow(1.0 - abs(dot(V, n)), 3.0);
            vec3 skyRef = mix(vec3(0.55, 0.68, 0.85), vec3(0.06, 0.09, 0.16), uNight);
            vec3 glass = mix(vTint * 0.55, skyRef, 0.25 + 0.55 * fres) * mix(0.6, 1.0, day);
            // a hint of the sky gradient up the tower
            glass += vec3(0.04, 0.06, 0.09) * clamp(vPos.y / 160.0, 0.0, 1.0) * day;
            float spandrel = step(fy, 0.16);
            float mull = step(fu, 0.05);
            float cell = h(vec2(floor(along / 3.2) + floor(vSeed * 91.0), floor(vPos.y / ${OFFICE_FLOOR.toFixed(1)})));
            float lit = step(cell, vLife * 0.75) * uNight;
            vec3 inside = vec3(1.0, 0.86, 0.62) * 0.95;
            col = mix(glass, inside, lit * (1.0 - spandrel));
            col = mix(col, vTint * 0.32 * diff, spandrel);
            col = mix(col, vec3(0.72, 0.75, 0.8) * diff, mull * (1.0 - spandrel));
            float blur = smoothstep(0.08, 0.32, fwidth(along / 1.6));
            col = mix(col, mix(glass, inside, vLife * 0.75 * uNight * 0.8), blur * 0.85);
          }
        }
        float f = smoothstep(uNear, uFar, distance(vPos, cameraPosition));
        gl_FragColor = linearToOutputTexel(vec4(mix(col, uFog, f), 1.0));
      }`,
  });
}

type Part = { b: number; base: number; h: number; w: number; d: number; rot: number; x: number; z: number; round: boolean; slab: boolean };

function partsOf(b: Building, i: number): Part[] {
  const H = b.floors * OFFICE_FLOOR;
  const P = (base: number, h: number, w: number, d: number, extra: Partial<Part> = {}): Part => ({ b: i, base, h, w, d, rot: 0, x: b.x, z: b.z, round: false, slab: false, ...extra });
  switch (b.shape) {
    case 'stepped':
      return [P(0, H * 0.45, b.w + 6, b.d + 6), P(H * 0.45, H * 0.32, b.w, b.d), P(H * 0.77, H * 0.23, b.w - 8, b.d - 8)];
    case 'twist':
      return Array.from({ length: b.floors }, (_, f) => P(f * OFFICE_FLOOR, OFFICE_FLOOR, b.w, b.d, { rot: f * 0.045, slab: true }));
    case 'round':
      return [P(0, H, b.w, b.w, { round: true }), P(H, 4, b.w * 0.8, b.w * 0.8, { round: true })];
    case 'landmark':
      return [P(0, H * 0.55, b.w + 4, b.d + 4), P(H * 0.55, H * 0.3, b.w - 2, b.d - 2), P(H * 0.85, H * 0.15, b.w - 10, b.d - 10)];
    default:
      return [P(0, H - 8, b.w, b.d), P(H - 8, 8, b.w - 6, b.d - 6)];
  }
}

export default function Offices({ timeline }: { timeline: React.RefObject<Timeline> }) {
  const towers = useMemo(() => DISTRICT.buildings.map((b, i) => ({ b, i })).filter(({ b }) => b.use === 'office' && b.shape && b.shape !== 'podium'), []);
  const parts = useMemo(() => towers.flatMap(({ b, i }) => partsOf(b, i)), [towers]);
  const boxes = useMemo(() => parts.filter((p) => !p.round && !p.slab), [parts]);
  const slabs = useMemo(() => parts.filter((p) => p.slab), [parts]);
  const rounds = useMemo(() => parts.filter((p) => p.round), [parts]);

  const make = (list: Part[], round: boolean) => {
    const geo = round ? new THREE.CylinderGeometry(0.5, 0.5, 1, 40).translate(0, 0.5, 0) : new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
    const n = Math.max(1, list.length);
    const at = (size: number) => new THREE.InstancedBufferAttribute(new Float32Array(n * size), size);
    geo.setAttribute('aFacade', at(1));
    geo.setAttribute('aLife', at(1));
    geo.setAttribute('aTint', at(3));
    geo.setAttribute('aSeed', at(1));
    const mesh = new THREE.InstancedMesh(geo, glassMaterial(round), n);
    mesh.frustumCulled = false;
    const c = new THREE.Color();
    const tint = geo.getAttribute('aTint') as THREE.InstancedBufferAttribute;
    const seed = geo.getAttribute('aSeed') as THREE.InstancedBufferAttribute;
    const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    list.forEach((p, k) => {
      const b = DISTRICT.buildings[p.b];
      c.set(TINTS[b.accent % TINTS.length]);
      tint.setXYZ(k, c.r, c.g, c.b);
      seed.setX(k, b.seed);
      mesh.setMatrixAt(k, zero);
    });
    if (!list.length) mesh.setMatrixAt(0, zero);
    return mesh;
  };
  const boxMesh = useMemo(() => make(boxes, false), [boxes]);
  const slabMesh = useMemo(() => make(slabs, false), [slabs]);
  const roundMesh = useMemo(() => make(rounds, true), [rounds]);
  const extras = useRef<THREE.InstancedMesh>(null); // masts and spires
  const m = useMemo(() => new THREE.Matrix4(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const pv = useMemo(() => new THREE.Vector3(), []);
  const sv = useMemo(() => new THREE.Vector3(), []);
  const zero = useMemo(() => new THREE.Matrix4().makeScale(0, 0, 0), []);
  const lastT = useRef(-1);

  useEffect(() => {
    for (let i = 0; i < towers.length; i++) extras.current?.setMatrixAt(i, zero);
    if (extras.current) extras.current.instanceMatrix.needsUpdate = true;
  }, [towers, zero]);

  useFrame(() => {
    const t = timeline.current?.t ?? 1;
    const env = timeline.current?.env;
    if (env)
      for (const mesh of [boxMesh, slabMesh, roundMesh]) {
        const u = (mesh.material as THREE.ShaderMaterial).uniforms;
        u.uNight.value = env.night;
        u.uSnow.value = env.snow;
        u.uNear.value = env.fogNear;
        u.uFar.value = env.fogFar;
        (u.uFog.value as THREE.Color).copy(env.sky);
      }
    if (Math.abs(t - lastT.current) < 2e-4) return;
    lastT.current = t;
    const prog = towers.map(({ b }) => {
      const u = clamp01((t - b.t0) / BUILD);
      const H = towerTop(b);
      return {
        frame: H * ease(ramp(u, 0.08, 0.75)),
        facade: H * ease(ramp(u, 0.2, 0.9)),
        life: ramp(t, T.live + b.seed * 0.1, T.live + b.seed * 0.1 + 0.1),
        mast: ease(ramp(u, 0.86, 0.98)),
      };
    });
    const byBuilding = new Map(towers.map(({ i }, k) => [i, prog[k]]));
    const place = (mesh: THREE.InstancedMesh, list: Part[]) => {
      const fac = mesh.geometry.getAttribute('aFacade') as THREE.InstancedBufferAttribute;
      const life = mesh.geometry.getAttribute('aLife') as THREE.InstancedBufferAttribute;
      list.forEach((p, k) => {
        const g = byBuilding.get(p.b)!;
        const h = Math.min(p.h, Math.max(0, g.frame - p.base));
        if (h < 0.05) mesh.setMatrixAt(k, zero);
        else {
          q.setFromAxisAngle(up, p.rot);
          mesh.setMatrixAt(k, m.compose(pv.set(p.x, p.base, p.z), q, sv.set(p.w, p.slab ? Math.min(h, OFFICE_FLOOR - 0.35) : h, p.d)));
        }
        fac.setX(k, g.facade);
        life.setX(k, g.life);
      });
      mesh.instanceMatrix.needsUpdate = true;
      fac.needsUpdate = true;
      life.needsUpdate = true;
    };
    place(boxMesh, boxes);
    place(slabMesh, slabs);
    place(roundMesh, rounds);
    // masts and spires go on last
    towers.forEach(({ b }, k) => {
      const g = prog[k];
      const H = b.floors * OFFICE_FLOOR;
      const tall = b.shape === 'landmark' ? 36 : b.shape === 'glass' ? 18 : 0;
      extras.current?.setMatrixAt(k, tall && g.mast > 0.01 ? m.makeScale(b.shape === 'landmark' ? 1.6 : 0.9, tall * g.mast, b.shape === 'landmark' ? 1.6 : 0.9).setPosition(b.x, H, b.z) : zero);
    });
    if (extras.current) extras.current.instanceMatrix.needsUpdate = true;
  });

  const mastGeo = useMemo(() => new THREE.CylinderGeometry(0.25, 0.5, 1, 8).translate(0, 0.5, 0), []);
  return (
    <group>
      <primitive object={boxMesh} />
      <primitive object={slabMesh} />
      <primitive object={roundMesh} />
      <instancedMesh ref={extras} args={[mastGeo, undefined, Math.max(1, towers.length)]} frustumCulled={false}>
        <meshStandardMaterial color="#e5e7eb" metalness={0.7} roughness={0.3} />
      </instancedMesh>
    </group>
  );
}
