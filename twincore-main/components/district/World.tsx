'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { PROJECT, RIVER_W, riverEast, riverWest, riverX, streetOutside } from '@/lib/district';
import { SELBE } from '@/lib/selbe';
import type { Timeline } from './DistrictCanvas';

// The real setting, from open data: the terrain of the Ulaanbaatar valley and its mountains (AWS Terrain Tiles), and
// the existing city round the project — buildings, gers, roads, rivers and the railway (© OpenStreetMap
// contributors). The ground under the new district is graded flat; everything else sits on the real terrain.

export type Ground = { n: number; half: number; h: Int16Array; at: (x: number, z: number) => number };

const PAD = 260; // blend from the graded pad to the natural ground
const smooth = (a: number, b: number, v: number) => {
  const k = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return k * k * (3 - 2 * k);
};
// inside the plan (plus a margin): the existing buildings, gers and streets there make way for the new district
const inSite = (x: number, z: number) => x > PROJECT.x0 - 25 && x < PROJECT.x1 + 25 && z > PROJECT.z0 - 25 && z < PROJECT.z1 + 25;
// cut polylines (flat [x, z, …]) where they enter the site
const outsideOnly = (pts: number[]) => {
  const out: number[][] = [];
  let cur: number[] = [];
  const visit = (x: number, z: number) => {
    if (inSite(x, z)) {
      if (cur.length >= 4) out.push(cur);
      cur = [];
    } else cur.push(x, z);
  };
  // long segments are walked in short steps, so a street that crosses the site is cut where it enters
  for (let i = 0; i < pts.length; i += 2) {
    if (i) {
      const x0 = pts[i - 2];
      const z0 = pts[i - 1];
      const n = Math.floor(Math.hypot(pts[i] - x0, pts[i + 1] - z0) / 8);
      for (let k = 1; k < n; k++) visit(x0 + ((pts[i] - x0) * k) / n, z0 + ((pts[i + 1] - z0) * k) / n);
    }
    visit(pts[i], pts[i + 1]);
  }
  if (cur.length >= 4) out.push(cur);
  return out;
};
const outsideProject = (x: number, z: number) => Math.hypot(Math.max(PROJECT.x0 - 60 - x, 0, x - PROJECT.x1 - 60), Math.max(PROJECT.z0 - 60 - z, 0, z - PROJECT.z1 - 60));

export function useGround() {
  const [g, setG] = useState<Ground | null>(null);
  useEffect(() => {
    let live = true;
    fetch('/geo/dem.bin')
      .then((r) => r.arrayBuffer())
      .then((buf) => {
        const head = new DataView(buf);
        const n = head.getInt32(0, true);
        const half = head.getInt32(4, true);
        const h = new Int16Array(buf, 12, n * n);
        const raw = (x: number, z: number) => {
          const fi = ((x + half) / (2 * half)) * (n - 1);
          const fj = ((z + half) / (2 * half)) * (n - 1);
          const i = Math.max(0, Math.min(n - 2, Math.floor(fi)));
          const j = Math.max(0, Math.min(n - 2, Math.floor(fj)));
          const a = Math.min(1, Math.max(0, fi - i));
          const b = Math.min(1, Math.max(0, fj - j));
          const v = (ii: number, jj: number) => h[jj * n + ii] / 10;
          return v(i, j) * (1 - a) * (1 - b) + v(i + 1, j) * a * (1 - b) + v(i, j + 1) * (1 - a) * b + v(i + 1, j + 1) * a * b;
        };
        // graded flat under the district, blending out to the real ground
        // level along the streets that run out into the city, too (a 70 m blend either side of them)
        const at = (x: number, z: number) => raw(x, z) * Math.min(smooth(0, PAD, outsideProject(x, z)), smooth(6, 76, streetOutside(x, z)));
        if (live) setG({ n, half, h, at });
      });
    return () => {
      live = false;
    };
  }, []);
  return g;
}

// ---- terrain ----------------------------------------------------------------------------------------------------
export function RealTerrain({ ground, timeline }: { ground: Ground; timeline: React.RefObject<Timeline> }) {
  const uni = useMemo(() => ({ uSnow: { value: 0 }, uRain: { value: 0 } }), []);
  useFrame(() => {
    const e = timeline.current?.env;
    if (!e) return;
    uni.uSnow.value = e.snow;
    uni.uRain.value = e.rain;
  });
  const geo = useMemo(() => {
    const seg = ground.n - 1;
    const size = ground.half * 2;
    const g = new THREE.PlaneGeometry(size, size, seg, seg).rotateX(-Math.PI / 2);
    const pos = g.getAttribute('position') as THREE.BufferAttribute;
    const col = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    // Ulaanbaatar as seen from above: dusty khaki valley floor, tawny-brown slopes, darker rock and larch on the ridges
    const valley = new THREE.Color('#8a7f63');
    const slope = new THREE.Color('#7f6f52');
    const ridge = new THREE.Color('#665a46');
    const peak = new THREE.Color('#5a5446');
    const noise = (x: number, z: number) => {
      const v = Math.sin(x * 0.013 + Math.sin(z * 0.009) * 2) * Math.cos(z * 0.011 + Math.sin(x * 0.007) * 2);
      const w = Math.sin(x * 0.051 + z * 0.037) * Math.sin(z * 0.047 - x * 0.029);
      return v * 0.6 + w * 0.4;
    };
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const h = ground.at(x, z);
      pos.setY(i, h - 0.4);
      if (h < 40) c.copy(valley).lerp(slope, Math.max(0, h) / 40);
      else if (h < 250) c.copy(slope).lerp(ridge, (h - 40) / 210);
      else c.copy(ridge).lerp(peak, Math.min(1, (h - 250) / 300));
      // patchy ground: grassier hollows, bare dusty patches
      const nz = noise(x, z);
      c.offsetHSL(0.012 * nz, 0.03 * nz, 0.035 * nz);
      col.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.computeVertexNormals();
    const nrm = g.getAttribute('normal') as THREE.BufferAttribute;
    const flat = new Float32Array(pos.count);
    for (let i = 0; i < pos.count; i++) {
      flat[i] = nrm.getY(i);
      // steep slopes darker and rockier
      const k = 1 - Math.min(1, Math.max(0, (nrm.getY(i) - 0.75) / 0.2));
      col[i * 3] *= 1 - 0.18 * k;
      col[i * 3 + 1] *= 1 - 0.2 * k;
      col[i * 3 + 2] *= 1 - 0.16 * k;
    }
    g.setAttribute('aFlat', new THREE.BufferAttribute(flat, 1));
    return g;
  }, [ground]);
  const onCompile = useMemo(
    () => (sh: { uniforms: Record<string, { value: unknown }>; vertexShader: string; fragmentShader: string }) => {
      sh.uniforms.uSnow = uni.uSnow;
      sh.uniforms.uRain = uni.uRain;
      sh.vertexShader = 'attribute float aFlat;\nvarying float vFlat;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvFlat = aFlat;');
      sh.fragmentShader =
        'uniform float uSnow;\nuniform float uRain;\nvarying float vFlat;\n' +
        sh.fragmentShader.replace(
          '#include <color_fragment>',
          '#include <color_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.92, 0.95, 1.0), uSnow * smoothstep(0.35, 0.8, vFlat));\ndiffuseColor.rgb *= 1.0 - 0.3 * uRain;',
        );
    },
    [uni],
  );
  return (
    <mesh geometry={geo}>
      <meshStandardMaterial vertexColors roughness={1} onBeforeCompile={onCompile} />
    </mesh>
  );
}

// ---- ribbons draped on the ground ----------------------------------------------------------------------------------
function drape(lines: { pts: number[]; w: number; c: THREE.Color; lift: number }[], ground: Ground) {
  const pos: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  for (const { pts, w, c, lift } of lines) {
    // subdivide long segments so the ribbon follows the ground
    const p: [number, number][] = [];
    for (let k = 0; k + 3 < pts.length; k += 2) {
      const x0 = pts[k];
      const z0 = pts[k + 1];
      const x1 = pts[k + 2];
      const z1 = pts[k + 3];
      const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 25));
      for (let st = 0; st < steps; st++) p.push([x0 + ((x1 - x0) * st) / steps, z0 + ((z1 - z0) * st) / steps]);
    }
    if (pts.length >= 2) p.push([pts[pts.length - 2], pts[pts.length - 1]]);
    if (p.length < 2) continue;
    const base = pos.length / 3;
    p.forEach(([x, z], k) => {
      const [ax, az] = p[Math.max(0, k - 1)];
      const [bx, bz] = p[Math.min(p.length - 1, k + 1)];
      const dx = bx - ax;
      const dz = bz - az;
      const l = Math.hypot(dx, dz) || 1;
      const nx = (-dz / l) * (w / 2);
      const nz = (dx / l) * (w / 2);
      pos.push(x - nx, ground.at(x - nx, z - nz) + lift, z - nz, x + nx, ground.at(x + nx, z + nz) + lift, z + nz);
      col.push(c.r, c.g, c.b, c.r, c.g, c.b);
      if (k) {
        const a = base + (k - 1) * 2;
        idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
    });
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

type Lines = { roads: [number, number[]][]; water: [number, number[], string][]; rail: number[][] };
export function useLines() {
  const [l, setL] = useState<Lines | null>(null);
  useEffect(() => {
    let live = true;
    fetch('/geo/lines.json')
      .then((r) => r.json())
      .then((d) => live && setL(d));
    return () => {
      live = false;
    };
  }, []);
  return l;
}

const ROAD_W = [22, 16, 13, 10, 6];
const ROAD_C = ['#3a3f48', '#3f444d', '#454a52', '#4b4f56', '#6b6457'];
export function RealLines({ ground, lines, timeline }: { ground: Ground; lines: Lines; timeline: React.RefObject<Timeline> }) {
  const roads = useMemo(
    () =>
      drape(
        lines.roads.flatMap(([k, pts]) => outsideOnly(pts).map((p) => ({ pts: p, w: ROAD_W[k], c: new THREE.Color(ROAD_C[k]), lift: 0.35 + (4 - k) * 0.02 }))),
        ground,
      ),
    [lines, ground],
  );
  const water = useMemo(() => {
    const ws = lines.water
      .filter(([k, , name]) => k !== 2 && !name.includes('Сэлбэ')) // the Selbe is drawn below, on its course through the plan
      .flatMap(([k, pts, name]) => outsideOnly(pts).map((pts) => ({ pts, name, k })))
      .map(({ k, pts, name }) => ({ pts, w: name.includes('Туул') ? 46 : k === 0 ? 16 : 5, c: new THREE.Color(k === 0 ? '#2563a8' : '#2f6ea8'), lift: 0.25 }));
    // the Selbe, north and south of the district, on the same course as through it
    const sel: number[] = [];
    for (const [z] of SELBE) sel.push(riverX(z), z);
    ws.push({ pts: sel, w: RIVER_W, c: new THREE.Color('#2563a8'), lift: 0.25 });
    return drape(ws, ground);
  }, [lines, ground]);
  const rail = useMemo(() => drape(lines.rail.flatMap(outsideOnly).map((pts) => ({ pts, w: 3.4, c: new THREE.Color('#2b2522'), lift: 0.5 })), ground), [lines, ground]);
  const roadMat = useRef<THREE.MeshStandardMaterial>(null);
  const waterMat = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(() => {
    const e = timeline.current?.env;
    if (!e) return;
    if (roadMat.current) roadMat.current.roughness = 0.95 - e.rain * 0.6;
    if (waterMat.current) waterMat.current.color.setRGB(1, 1, 1).lerp(new THREE.Color(2.2, 2.4, 2.6), e.snow * 0.8);
  });
  return (
    <group>
      <mesh geometry={roads}>
        <meshStandardMaterial ref={roadMat} vertexColors roughness={0.95} polygonOffset polygonOffsetFactor={-2} />
      </mesh>
      <mesh geometry={water}>
        <meshStandardMaterial ref={waterMat} vertexColors roughness={0.25} metalness={0.2} polygonOffset polygonOffsetFactor={-1} />
      </mesh>
      <mesh geometry={rail}>
        <meshStandardMaterial vertexColors roughness={0.9} polygonOffset polygonOffsetFactor={-3} />
      </mesh>
    </group>
  );
}

// ---- the existing city: buildings as oriented blocks, gers as gers ----------------------------------------------
type City = { n: number; data: Int16Array };
export function useCity() {
  const [c, setC] = useState<City | null>(null);
  useEffect(() => {
    let live = true;
    fetch('/geo/city.bin')
      .then((r) => r.arrayBuffer())
      .then((buf) => {
        const n = new DataView(buf).getInt32(0, true);
        if (live) setC({ n, data: new Int16Array(buf, 4, n * 6) });
      });
    return () => {
      live = false;
    };
  }, []);
  return c;
}

function cityMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uNight: { value: 0.1 }, uSnow: { value: 0 }, uFog: { value: new THREE.Color() }, uNear: { value: 2600 }, uFar: { value: 9000 } },
    vertexShader: `
      attribute vec3 aWall; attribute vec3 aRoof; attribute float aSeed;
      varying vec3 vPos; varying vec3 vN; varying vec3 vLoc; varying vec3 vNl; varying vec3 vWall; varying vec3 vRoof; varying float vSeed;
      void main(){
        vec3 sc = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
        vLoc = position * sc;
        vNl = normal;
        mat4 m = modelMatrix * instanceMatrix;
        vec4 wp = m * vec4(position, 1.0);
        vPos = wp.xyz;
        vN = normalize(mat3(m) * normal);
        vWall = aWall; vRoof = aRoof; vSeed = aSeed;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: `
      uniform float uNight; uniform float uSnow; uniform vec3 uFog; uniform float uNear; uniform float uFar;
      varying vec3 vPos; varying vec3 vN; varying vec3 vLoc; varying vec3 vNl; varying vec3 vWall; varying vec3 vRoof; varying float vSeed;
      // stable hash (no sin of large numbers, which turns to per-pixel noise on GPUs)
      float h(vec2 p){ vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
      void main(){
        vec3 n = normalize(vN);
        float day = 1.0 - uNight;
        float diff = (max(dot(n, normalize(vec3(0.45, 0.8, 0.3))), 0.0) * 0.55 + 0.45) * mix(0.4, 1.0, day);
        vec3 col;
        if (vNl.y > 0.5) {
          col = mix(vRoof, vec3(0.93, 0.95, 1.0), uSnow) * diff;
        } else {
          float along = abs(vNl.x) > 0.5 ? vLoc.z : vLoc.x;
          float y = vLoc.y;
          float fu = fract(along / 3.4);
          float fv = fract(y / 3.0);
          float win = step(0.25, fu) * step(fu, 0.75) * step(0.35, fv) * step(fv, 0.8);
          float lit = step(h(vec2(floor(along / 3.4) + vSeed * 77.0 + vNl.x * 13.0, floor(y / 3.0))), 0.38) * uNight;
          vec3 glass = mix(vec3(0.05, 0.07, 0.1), vec3(0.2, 0.25, 0.3), day);
          vec3 wc = mix(glass, vec3(1.0, 0.75, 0.45), lit);
          col = mix(vWall * diff, wc, win);
          float blur = smoothstep(0.08, 0.32, max(fwidth(along / 3.4), fwidth(y / 3.0)));
          col = mix(col, mix(vWall * diff, mix(glass, vec3(1.0, 0.75, 0.45), 0.38 * uNight), 0.25), blur);
        }
        float f = smoothstep(uNear, uFar, distance(vPos, cameraPosition));
        gl_FragColor = linearToOutputTexel(vec4(mix(col, uFog, f), 1.0));
      }`,
  });
}

const WALLS = ['#d9d3c7', '#cfc9bd', '#e6dccb', '#bfc5cc', '#d6c7b0', '#c9b9a6', '#e8e4da'];
const TIN = ['#2f7d4a', '#b23b2e', '#2b5d9a', '#3f8f8a', '#8a2f45', '#5b6b2e']; // the coloured tin roofs of the ger districts
export function RealCity({ ground, city, timeline }: { ground: Ground; city: City; timeline: React.RefObject<Timeline> }) {
  const built = useMemo(() => {
    const { n, data } = city;
    const blocks: number[] = [];
    const gers: number[] = [];
    for (let i = 0; i < n; i++) {
      const x = data[i * 6];
      const z = data[i * 6 + 1];
      if (inSite(x, z) || streetOutside(x, z) < Math.max(data[i * 6 + 2], data[i * 6 + 3]) / 2 + 8) continue;
      (data[i * 6 + 5] === 0 ? gers : blocks).push(i);
    }
    // blocks
    const geo = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
    const wall = new Float32Array(blocks.length * 3);
    const roof = new Float32Array(blocks.length * 3);
    const seed = new Float32Array(blocks.length);
    const mesh = new THREE.InstancedMesh(geo, cityMaterial(), blocks.length);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const p = new THREE.Vector3();
    const s = new THREE.Vector3();
    const c = new THREE.Color();
    blocks.forEach((i, k) => {
      const x = data[i * 6];
      const z = data[i * 6 + 1];
      const w = data[i * 6 + 2];
      const d = data[i * 6 + 3];
      const ang = data[i * 6 + 4] / 100;
      const lv = data[i * 6 + 5];
      const h = lv <= 1 ? 3.2 : lv * 3;
      q.setFromAxisAngle(up, -ang);
      mesh.setMatrixAt(k, m.compose(p.set(x, ground.at(x, z) - 0.5, z), q, s.set(w, h + 0.5, d)));
      c.set(WALLS[(i * 7) % WALLS.length]);
      wall.set([c.r, c.g, c.b], k * 3);
      c.set(lv <= 2 ? TIN[(i * 13) % TIN.length] : '#5a5f66');
      roof.set([c.r, c.g, c.b], k * 3);
      seed[k] = ((i * 0.6180339) % 1);
    });
    geo.setAttribute('aWall', new THREE.InstancedBufferAttribute(wall, 3));
    geo.setAttribute('aRoof', new THREE.InstancedBufferAttribute(roof, 3));
    geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 1));
    mesh.frustumCulled = false;
    // gers: a white felt drum and a low roof
    const drum = new THREE.InstancedMesh(new THREE.CylinderGeometry(3, 3, 2.2, 14).translate(0, 1.1, 0), new THREE.MeshStandardMaterial({ color: '#efeae0', roughness: 0.9 }), gers.length);
    const cap = new THREE.InstancedMesh(new THREE.ConeGeometry(3.15, 1.4, 14).translate(0, 2.9, 0), new THREE.MeshStandardMaterial({ color: '#e2ddd2', roughness: 0.9 }), gers.length);
    gers.forEach((i, k) => {
      const x = data[i * 6];
      const z = data[i * 6 + 1];
      const r = Math.max(0.8, Math.min(1.5, Math.max(data[i * 6 + 2], data[i * 6 + 3]) / 6.4));
      m.compose(p.set(x, ground.at(x, z) - 0.1, z), q.identity(), s.set(r, r, r));
      drum.setMatrixAt(k, m);
      cap.setMatrixAt(k, m);
    });
    drum.frustumCulled = false;
    cap.frustumCulled = false;
    return { mesh, drum, cap };
  }, [city, ground]);
  useFrame(() => {
    const e = timeline.current?.env;
    if (!e) return;
    const u = (built.mesh.material as THREE.ShaderMaterial).uniforms;
    u.uNight.value = e.night;
    u.uSnow.value = e.snow;
    u.uNear.value = e.fogNear;
    u.uFar.value = e.fogFar;
    (u.uFog.value as THREE.Color).copy(e.sky);
  });
  return (
    <group>
      <primitive object={built.mesh} />
      <primitive object={built.drum} />
      <primitive object={built.cap} />
    </group>
  );
}

// The Selbe through the district (on the graded pad), with a moving shimmer and ice in winter.
export function SelbeInDistrict({ timeline }: { timeline: React.RefObject<Timeline> }) {
  const geo = useMemo(() => {
    const pos: number[] = [];
    const uv: number[] = [];
    const idx: number[] = [];
    let k = 0;
    for (let z = PROJECT.z0 - 120; z <= PROJECT.z1 + 120; z += 8, k++) {
      const x = riverX(z);
      const dx = (riverX(z + 1) - riverX(z - 1)) / 2;
      const l = Math.hypot(dx, 1);
      const nx = 1 / l;
      const nz = -dx / l;
      const ww = riverWest(z);
      const we = riverEast(z);
      pos.push(x - nx * ww, 0.1, z - nz * ww, x + nx * we, 0.1, z + nz * we);
      uv.push(0, z / 40, 1, z / 40);
      if (k) {
        const a = (k - 1) * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    return g;
  }, []);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uT: { value: 0 }, uIce: { value: 0 } },
        side: THREE.DoubleSide,
        vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `uniform float uT; uniform float uIce; varying vec2 vUv;
          void main(){
            float edge = smoothstep(0.0, 0.18, vUv.x) * smoothstep(1.0, 0.82, vUv.x);
            float w = sin(vUv.y * 9.0 - uT * 1.6 + sin(vUv.x * 6.0) * 1.5) * 0.5 + 0.5;
            vec3 c = mix(vec3(0.02, 0.08, 0.22), vec3(0.10, 0.32, 0.70), edge * (0.35 + 0.3 * w));
            c = mix(c, vec3(0.70, 0.80, 0.90) + 0.05 * sin(vUv.y * 3.0), uIce);
            gl_FragColor = linearToOutputTexel(vec4(c, 1.0));
          }`,
      }),
    [],
  );
  useFrame((_, dt) => {
    mat.uniforms.uT.value += dt * (1 - mat.uniforms.uIce.value);
    mat.uniforms.uIce.value = (timeline.current?.env.snow ?? 0) * 0.9;
  });
  return <mesh geometry={geo} material={mat} />;
}
