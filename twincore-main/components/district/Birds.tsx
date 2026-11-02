'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { CENTRE, T } from '@/lib/district';
import type { Timeline } from './DistrictCanvas';

// A few flocks of birds wheeling over the district in V formation, wings beating. They keep away in rain and snow
// and after dark.

const FLOCKS = [
  { r: 260, h: 78, speed: 10, dir: 1, ox: -120, oz: -80, n: 9 },
  { r: 190, h: 62, speed: 8.5, dir: -1, ox: 60, oz: 140, n: 7 },
  { r: 330, h: 95, speed: 11, dir: 1, ox: 20, oz: -260, n: 11 },
  { r: 150, h: 54, speed: 7.5, dir: -1, ox: -240, oz: 220, n: 6 },
];
const N = FLOCKS.reduce((a, f) => a + f.n, 0);

export default function Birds({ timeline }: { timeline: React.RefObject<Timeline> }) {
  const body = useRef<THREE.InstancedMesh>(null);
  const wingL = useRef<THREE.InstancedMesh>(null);
  const wingR = useRef<THREE.InstancedMesh>(null);
  const show = useRef(0);
  const geo = useMemo(() => {
    const wing = (side: number) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute([0.25, 0, 0, -0.35, 0, 0, -0.15, 0, side * 1.15], 3));
      g.setIndex(side > 0 ? [0, 1, 2] : [0, 2, 1]);
      g.computeVertexNormals();
      return g;
    };
    return { l: wing(-1), r: wing(1), body: new THREE.BoxGeometry(0.75, 0.16, 0.18) };
  }, []);
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), w: new THREE.Matrix4(), r: new THREE.Matrix4(), q: new THREE.Quaternion(), e: new THREE.Euler(), p: new THREE.Vector3(), s: new THREE.Vector3() }), []);

  useFrame(({ clock }, dtRaw) => {
    const tl = timeline.current;
    if (!tl) return;
    const env = tl.env;
    const dt = Math.min(dtRaw, 0.1);
    // out in fair weather and daylight, once the district is alive
    const fair = env.rain < 0.15 && env.snowing < 0.3 && env.night < 0.6 && tl.t > T.live;
    show.current += ((fair ? 1 : 0) - show.current) * Math.min(1, dt * 0.8);
    const vis = show.current > 0.02;
    for (const o of [body, wingL, wingR]) if (o.current) o.current.visible = vis;
    if (!vis) return;
    const now = clock.elapsedTime;
    const { m, w, r, q, e, p, s } = tmp;
    let k = 0;
    FLOCKS.forEach((f, fi) => {
      const a = (now * f.speed * f.dir) / f.r + fi * 1.7;
      const cx = CENTRE[0] + f.ox + Math.cos(a) * f.r;
      const cz = CENTRE[1] + f.oz + Math.sin(a) * f.r;
      // heading along the circle
      const hx = -Math.sin(a) * f.dir;
      const hz = Math.cos(a) * f.dir;
      const yaw = Math.atan2(-hz, hx);
      const bank = 0.25 * f.dir;
      for (let b = 0; b < f.n; b++) {
        // V formation: the leader in front, the others staggered back on either side
        const slot = b === 0 ? 0 : Math.ceil(b / 2) * (b % 2 ? 1 : -1);
        const back = Math.abs(slot) * 3.2 + Math.sin(now * 0.7 + b) * 0.6;
        const side = slot * 2.6 + Math.cos(now * 0.9 + b * 2) * 0.5;
        // into world space: back is against the heading, side to its right
        const x = cx - hx * back - hz * side;
        const z = cz - hz * back + hx * side;
        const y = f.h + Math.sin(now * 0.6 + fi + b * 0.4) * 2.5 + Math.abs(slot) * 0.4;
        const sc = 1.3 * show.current;
        q.setFromEuler(e.set(bank, yaw, 0, 'YXZ'));
        m.compose(p.set(x, y, z), q, s.set(sc, sc, sc));
        body.current?.setMatrixAt(k, m);
        // wings beat (and now and then glide)
        const beat = Math.sin(now * 9 + b * 1.3 + fi) * (0.5 + 0.5 * Math.max(0, Math.sin(now * 0.4 + b)));
        wingR.current?.setMatrixAt(k, w.copy(m).multiply(r.makeRotationX(0.35 + beat * 0.7)));
        wingL.current?.setMatrixAt(k, w.copy(m).multiply(r.makeRotationX(-0.35 - beat * 0.7)));
        k++;
      }
    });
    for (const o of [body, wingL, wingR]) if (o.current) o.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={body} args={[geo.body, undefined, N]} frustumCulled={false} visible={false}>
        <meshStandardMaterial color="#2b2b30" roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={wingL} args={[geo.l, undefined, N]} frustumCulled={false} visible={false}>
        <meshStandardMaterial color="#34343a" roughness={0.9} side={THREE.DoubleSide} />
      </instancedMesh>
      <instancedMesh ref={wingR} args={[geo.r, undefined, N]} frustumCulled={false} visible={false}>
        <meshStandardMaterial color="#34343a" roughness={0.9} side={THREE.DoubleSide} />
      </instancedMesh>
    </group>
  );
}
