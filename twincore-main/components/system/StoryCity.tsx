'use client';

import type { ReactNode } from 'react';

// The front page's little city, drawn in the manner of a cut-away illustration: the building the story is about is
// open at the front, every floor busy (lobby, open office, the control room with the twin on its wall, a lounge),
// a helicopter on the roof, a glass lift running up the side, and the street around it alive with cars, people, a
// park with a fountain and clouds going over. Everything in the site's blues. Movement is SVG animation (cheap, and
// left out entirely when the visitor prefers reduced motion).

// isometric projection (x east, y south, z up; 1 unit ≈ one plot)
export const S = 26;
export const iso = (x: number, y: number, z = 0): [number, number] => [(x - y) * S * 0.866, (x + y) * S * 0.5 - z * S];
export const pts = (p: [number, number, number][]) => p.map(([x, y, z]) => iso(x, y, z).map((v) => v.toFixed(1)).join(',')).join(' ');

export const C = { ink: '#0b1426', night: '#0f1b33', deep: '#1e3a8a', mid: '#24489a', blue: '#3b6fd8', hi: '#60a5fa', soft: '#93c5fd', pale: '#cfe0ff', white: '#eef5ff' };
const HEAD = '#dbeafe';
const BODIES = [C.hi, C.deep, C.soft, C.white, C.blue];

// the building: 4 floors of 1.25 units on a 1.6 × 1.6 plot
export const HERO = { x: 2.25, y: 2.25, w: 1.6, d: 1.6, floors: 4, fh: 1.25 };
export const HERO_H = HERO.floors * HERO.fh;

type V3 = [number, number, number];

// a box: top, the south face (y + d) and the east face (x + w), lit from the south-east
export function Box({ x, y, z, w, d, h, c, op }: { x: number; y: number; z: number; w: number; d: number; h: number; c: [string, string, string]; op?: number }) {
  return (
    <g opacity={op}>
      <polygon points={pts([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]])} fill={c[1]} />
      <polygon points={pts([[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]])} fill={c[2]} />
      <polygon points={pts([[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]])} fill={c[0]} />
    </g>
  );
}

// a person, a few pixels tall, standing or seated; `walk` moves them back and forth along the floor
function Person({ p, body, seated = false, walk, still }: { p: V3; body: string; seated?: boolean; walk?: { to: V3; dur: number; begin?: number }; still: boolean }) {
  const [sx, sy] = iso(...p);
  let anim: ReactNode = null;
  if (walk && !still) {
    const [tx, ty] = iso(...walk.to);
    anim = <animateTransform attributeName="transform" type="translate" values={`0 0;${(tx - sx).toFixed(1)} ${(ty - sy).toFixed(1)};0 0`} dur={`${walk.dur}s`} begin={`${walk.begin ?? 0}s`} repeatCount="indefinite" />;
  }
  return (
    <g>
      {anim}
      <rect x={sx - 1.5} y={sy - (seated ? 4.6 : 6.6)} width="3" height={seated ? 3.4 : 4.6} rx="1.2" fill={body} />
      {!seated && <path d={`M${sx - 0.8} ${sy - 2.1}L${sx - 0.9} ${sy}M${sx + 0.8} ${sy - 2.1}L${sx + 0.9} ${sy}`} stroke={C.ink} strokeWidth="0.9" />}
      <circle cx={sx} cy={sy - (seated ? 5.9 : 7.9)} r="1.45" fill={HEAD} />
    </g>
  );
}

// an ellipse lying on the floor (a table, a pond, a helipad)
function Disc({ p, r, fill, stroke, op }: { p: V3; r: number; fill: string; stroke?: string; op?: number }) {
  const [cx, cy] = iso(...p);
  return <ellipse cx={cx} cy={cy} rx={1.2247 * r * S} ry={0.7071 * r * S} fill={fill} stroke={stroke} strokeWidth={stroke ? 0.6 : undefined} opacity={op} />;
}

function Tree({ p, s = 1 }: { p: V3; s?: number }) {
  const [x, y] = iso(...p);
  return (
    <g>
      <ellipse cx={x + 1.5} cy={y + 0.5} rx={5 * s} ry={2.2 * s} fill="#000" opacity={0.25} />
      <line x1={x} y1={y} x2={x} y2={y - 5 * s} stroke={C.mid} strokeWidth={1.2} />
      <circle cx={x} cy={y - 8 * s} r={5 * s} fill="#2a6f84" />
      <circle cx={x - 1.6 * s} cy={y - 9.6 * s} r={2.6 * s} fill="#3f8fa3" />
    </g>
  );
}

function Lamp({ p, still, k }: { p: V3; still: boolean; k: number }) {
  const [x, y] = iso(...p);
  return (
    <g>
      <line x1={x} y1={y - 7} x2={x} y2={y} stroke={C.soft} strokeWidth={0.5} opacity={0.7} />
      <path d={`M${x - 2.4} ${y + 2}L${x - 1.2} ${y}L${x + 1.2} ${y}L${x + 2.4} ${y + 2}Z`} fill={C.pale} />
      <ellipse cx={x} cy={y + 4} rx="5" ry="3" fill={C.soft} opacity={0.18}>
        {!still && <animate attributeName="opacity" values="0.14;0.24;0.14" dur={`${3 + k * 0.7}s`} repeatCount="indefinite" />}
      </ellipse>
    </g>
  );
}

// a desk with a glowing screen, and someone at it
function Desk({ u, v, z0, k, still }: { u: number; v: number; z0: number; k: number; still: boolean }) {
  const x = HERO.x + u * HERO.w;
  const y = HERO.y + v * HERO.d;
  return (
    <g>
      <Box x={x} y={y} z={z0} w={0.2} d={0.11} h={0.1} c={[C.white, C.pale, C.soft]} />
      <polygon points={pts([[x + 0.04, y + 0.02, z0 + 0.1], [x + 0.16, y + 0.02, z0 + 0.1], [x + 0.16, y + 0.02, z0 + 0.22], [x + 0.04, y + 0.02, z0 + 0.22]])} fill={C.ink} />
      <polygon points={pts([[x + 0.05, y + 0.021, z0 + 0.115], [x + 0.15, y + 0.021, z0 + 0.115], [x + 0.15, y + 0.021, z0 + 0.205], [x + 0.05, y + 0.021, z0 + 0.205]])} fill={C.hi}>
        {!still && <animate attributeName="opacity" values="0.75;1;0.8;1" dur={`${2.4 + (k % 3) * 0.9}s`} repeatCount="indefinite" />}
      </polygon>
      <Person p={[x + 0.1, y + 0.2, z0]} body={BODIES[k % BODIES.length]} seated still={still} />
    </g>
  );
}

// what each floor holds (u, v: 0 … 1 across the plot from its back corner; the front of each floor is the part seen)
function Floor({ f, z0, still }: { f: number; z0: number; still: boolean }) {
  const at = (u: number, v: number, z = 0): V3 => [HERO.x + u * HERO.w, HERO.y + v * HERO.d, z0 + z];
  const { x, y, w } = HERO;
  if (f === 0)
    // the lobby: the company sign, a reception desk, plants, visitors coming in
    return (
      <g>
        <polygon points={pts([[x + 0.62 * w, y, z0 + 0.35], [x + 0.92 * w, y, z0 + 0.35], [x + 0.92 * w, y, z0 + 0.8], [x + 0.62 * w, y, z0 + 0.8]])} fill={C.hi} opacity={0.55} />
        <Person p={at(0.62, 0.45)} body={C.white} still={still} />
        <Box {...xyz(at(0.42, 0.5))} w={0.64} d={0.14} h={0.24} c={[C.white, C.pale, C.soft]} />
        <Person p={at(0.3, 1.0)} body={C.hi} walk={{ to: at(0.55, 0.72), dur: 7 }} still={still} />
        <Person p={at(0.78, 0.8)} body={C.deep} still={still} />
        <Person p={at(0.9, 0.98)} body={C.soft} walk={{ to: at(0.6, 0.98), dur: 9, begin: -3 }} still={still} />
        <Box {...xyz(at(0.12, 0.88))} w={0.1} d={0.1} h={0.1} c={[C.pale, C.soft, C.blue]} />
        <Tree p={at(0.17, 0.93, 0.08)} s={0.55} />
      </g>
    );
  if (f === 1)
    // the open office: two rows of desks under hanging lamps, someone on the move
    return (
      <g>
        {[0.28, 0.55, 0.8].map((u, k) => (
          <Desk key={`a${k}`} u={u} v={0.42} z0={z0} k={k} still={still} />
        ))}
        {[0.2, 0.47, 0.72].map((u, k) => (
          <Desk key={`b${k}`} u={u} v={0.68} z0={z0} k={k + 3} still={still} />
        ))}
        <Person p={at(0.25, 0.97)} body={C.white} walk={{ to: at(0.9, 0.97), dur: 10 }} still={still} />
        <Lamp p={at(0.45, 0.6, HERO.fh - 0.32)} still={still} k={0} />
        <Lamp p={at(0.8, 0.6, HERO.fh - 0.32)} still={still} k={1} />
      </g>
    );
  if (f === 2)
    // the control room: the twin on the big screen, a meeting round the table
    return (
      <g>
        <polygon points={pts([[x, y + 0.5 * HERO.d, z0 + 0.22], [x, y + 0.96 * HERO.d, z0 + 0.22], [x, y + 0.96 * HERO.d, z0 + 0.86], [x, y + 0.5 * HERO.d, z0 + 0.86]])} fill={C.ink} stroke={C.hi} strokeWidth={0.6} />
        {(() => {
          // a little city and a rising line on the screen
          const p = (vv: number, zz: number) => iso(x, y + vv * HERO.d, z0 + zz).map((n) => n.toFixed(1)).join(',');
          return (
            <g>
              <polyline points={[p(0.55, 0.35), p(0.66, 0.42), p(0.74, 0.4), p(0.83, 0.56), p(0.92, 0.7)].join(' ')} fill="none" stroke={C.hi} strokeWidth={1}>
                {!still && <animate attributeName="stroke-dasharray" values="0 60;60 0;60 0" dur="5s" repeatCount="indefinite" />}
              </polyline>
              {[0.58, 0.63, 0.68].map((vv, k) => (
                <polygon key={k} points={[p(vv, 0.3), p(vv + 0.03, 0.3), p(vv + 0.03, 0.3 + 0.08 * (k + 1)), p(vv, 0.3 + 0.08 * (k + 1))].join(' ')} fill={C.soft} opacity={0.8} />
              ))}
            </g>
          );
        })()}
        <Person p={at(0.12, 0.78)} body={C.white} still={still} />
        <Person p={at(0.62, 0.4)} body={C.hi} seated still={still} />
        <Person p={at(0.4, 0.62)} body={C.soft} seated still={still} />
        <Disc p={at(0.62, 0.62, 0.2)} r={0.2} fill={C.pale} stroke={C.soft} />
        <Person p={at(0.84, 0.62)} body={C.deep} seated still={still} />
        <Person p={at(0.62, 0.86)} body={C.white} seated still={still} />
        <Lamp p={at(0.62, 0.62, HERO.fh - 0.3)} still={still} k={2} />
      </g>
    );
  // the lounge: a sofa, a ping-pong game, a big plant, coffee
  return (
    <g>
      <Box {...xyz(at(0.55, 0.42))} w={0.54} d={0.28} h={0.12} c={[C.deep, C.mid, C.ink]} />
      <line x1={iso(...at(0.72, 0.42, 0.13))[0]} y1={iso(...at(0.72, 0.42, 0.13))[1]} x2={iso(...at(0.72, 0.6, 0.13))[0]} y2={iso(...at(0.72, 0.6, 0.13))[1]} stroke={C.white} strokeWidth={0.7} />
      <Person p={at(0.5, 0.52)} body={C.hi} walk={{ to: at(0.5, 0.58), dur: 1.4 }} still={still} />
      <Person p={at(0.95, 0.52)} body={C.white} walk={{ to: at(0.95, 0.46), dur: 1.4, begin: -0.7 }} still={still} />
      <Tree p={at(0.9, 0.9, 0.05)} s={0.7} />
      <Box {...xyz(at(0.14, 0.72))} w={0.48} d={0.14} h={0.14} c={[C.soft, C.blue, C.mid]} />
      <Person p={at(0.3, 0.8)} body={C.pale} seated still={still} />
      <Box {...xyz(at(0.3, 0.92))} w={0.18} d={0.1} h={0.08} c={[C.white, C.pale, C.soft]} />
      <Lamp p={at(0.35, 0.75, HERO.fh - 0.3)} still={still} k={3} />
    </g>
  );
}
const xyz = ([x, y, z]: V3) => ({ x, y, z });

// the roof: a helipad with a helicopter that now and then takes off and comes back, solar panels, an antenna
function Roof({ still }: { still: boolean }) {
  const z = HERO_H;
  const at = (u: number, v: number, zz = 0): V3 => [HERO.x + u * HERO.w, HERO.y + v * HERO.d, z + zz];
  const [hx, hy] = iso(...at(0.62, 0.62));
  const [ax, ay] = iso(...at(0.9, 0.12));
  const pad = (u: number, v: number) => iso(...at(u, v));
  return (
    <g>
      {/* solar panels at the back */}
      {[0.08, 0.24, 0.4].map((u) => (
        <polygon key={u} points={pts([[HERO.x + u * HERO.w, HERO.y + 0.1 * HERO.d, z + 0.12], [HERO.x + (u + 0.13) * HERO.w, HERO.y + 0.1 * HERO.d, z + 0.12], [HERO.x + (u + 0.13) * HERO.w, HERO.y + 0.32 * HERO.d, z + 0.02], [HERO.x + u * HERO.w, HERO.y + 0.32 * HERO.d, z + 0.02]])} fill={C.blue} stroke={C.soft} strokeWidth={0.4} />
      ))}
      {/* antenna with its light */}
      <line x1={ax} y1={ay} x2={ax} y2={ay - 20} stroke={C.soft} strokeWidth={0.8} />
      <circle cx={ax} cy={ay - 20} r="1.6" fill={C.hi}>
        {!still && <animate attributeName="opacity" values="1;0.15;1" dur="1.6s" repeatCount="indefinite" />}
      </circle>
      {/* helipad */}
      <Disc p={at(0.62, 0.62)} r={0.32} fill={C.mid} stroke={C.soft} />
      <path d={(() => {
        const [a1, a2] = [pad(0.55, 0.52), pad(0.55, 0.72)];
        const [b1, b2] = [pad(0.69, 0.52), pad(0.69, 0.72)];
        const [m1, m2] = [pad(0.55, 0.62), pad(0.69, 0.62)];
        return `M${a1[0]} ${a1[1]}L${a2[0]} ${a2[1]}M${b1[0]} ${b1[1]}L${b2[0]} ${b2[1]}M${m1[0]} ${m1[1]}L${m2[0]} ${m2[1]}`;
      })()} stroke={C.white} strokeWidth={1} opacity={0.8} />
      {/* the helicopter */}
      <g transform={`translate(${hx.toFixed(1)} ${hy.toFixed(1)})`}>
        <g>
          {!still && <animateTransform attributeName="transform" type="translate" values="0 0;0 0;0 -14;-26 -36;0 -14;0 0" keyTimes="0;0.45;0.55;0.72;0.9;1" dur="18s" repeatCount="indefinite" />}
          <line x1="-13" y1="-6.5" x2="-4" y2="-4.2" stroke={C.soft} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M-14 -9L-12 -5.5L-15 -5.5Z" fill={C.soft} />
          <ellipse cx="0" cy="-4" rx="6" ry="3.2" fill={C.soft} />
          <ellipse cx="3" cy="-4.4" rx="2.6" ry="2" fill={C.ink} opacity={0.65} />
          <path d="M-4.5 -0.4L4.5 -0.4M-3 -0.4L-2.4 -1.6M2.6 -0.4L2 -1.6" stroke={C.pale} strokeWidth="0.7" />
          <line x1="0" y1="-7" x2="0" y2="-8.6" stroke={C.pale} strokeWidth="0.8" />
          <g transform="translate(0 -8.6) scale(1 0.42)">
            <g>
              {!still && <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="0.45s" repeatCount="indefinite" />}
              <line x1="-12" y1="0" x2="12" y2="0" stroke={C.pale} strokeWidth="1.1" strokeLinecap="round" />
              <line x1="0" y1="-12" x2="0" y2="12" stroke={C.pale} strokeWidth="1.1" strokeLinecap="round" />
            </g>
          </g>
        </g>
      </g>
      {/* a rooftop planter along the front */}
      <Box {...xyz(at(0.1, 0.86))} w={0.4} d={0.1} h={0.08} c={[C.mid, C.blue, C.deep]} />
      <Tree p={at(0.18, 0.92, 0.08)} s={0.45} />
      <Tree p={at(0.36, 0.92, 0.08)} s={0.5} />
    </g>
  );
}

// The building: floors go up as `grow` runs 0 → 1 (the construction scene); once `open` the rooms are furnished
// and peopled, the lift runs and the roof comes alive.
export function Hero({ grow, open, still }: { grow: number; open: boolean; still: boolean }) {
  const { x, y, w, d, floors, fh } = HERO;
  const bf = grow * floors;
  const out: ReactNode[] = [];
  // each floor: its slab fades in over the last stretch of the floor below, then its columns rise through it
  const ramp = (v: number) => Math.min(1, Math.max(0, v));
  for (let f = 0; f < floors && bf > f - 0.3; f++) {
    const z0 = f * fh;
    const slab = f === 0 ? ramp(bf / 0.15) : ramp((bf - f + 0.3) / 0.3);
    const h = ramp((bf - f) / 0.7) * fh;
    out.push(
      <g key={f}>
        {/* the slab, with its cut edge showing white */}
        <Box x={x} y={y} z={z0 - 0.08} w={w} d={d} h={0.08} c={[open ? '#a9c2ec' : '#4f7fd6', C.white, C.pale]} op={slab} />
        {open && (
          <g className="animate-fade-in">
            {/* the back walls, with windows */}
            <polygon points={pts([[x, y, z0], [x + w, y, z0], [x + w, y, z0 + fh], [x, y, z0 + fh]])} fill={C.mid} />
            <polygon points={pts([[x, y, z0], [x, y + d, z0], [x, y + d, z0 + fh], [x, y, z0 + fh]])} fill={C.deep} />
            {[0.08, 0.38, 0.68].map((u) => (
              <polygon key={`w${u}`} points={pts([[x + u * w, y, z0 + 0.3], [x + (u + 0.22) * w, y, z0 + 0.3], [x + (u + 0.22) * w, y, z0 + 0.95], [x + u * w, y, z0 + 0.95]])} fill={C.soft} opacity={0.22} />
            ))}
            <Floor f={f} z0={z0} still={still} />
          </g>
        )}
        {/* the corner columns standing at the cut */}
        {h > 0.01 &&
          (open ? [[x + w - 0.07, y + d - 0.07], [x + w - 0.07, y], [x, y + d - 0.07]] : [[x + w - 0.07, y + d - 0.07], [x + w - 0.07, y], [x, y + d - 0.07], [x + w / 2, y + d - 0.07], [x + w - 0.07, y + d / 2], [x + w / 2, y + d / 2]]).map(([cx, cy], k) => (
            <Box key={`c${k}`} x={cx} y={cy} z={z0} w={0.07} d={0.07} h={h} c={[C.white, C.pale, C.soft]} />
          ))}
      </g>,
    );
  }
  if (bf > floors - 0.3) {
    out.push(
      <g key="roof" opacity={ramp((bf - floors + 0.3) / 0.3)}>
        <Box x={x} y={y} z={HERO_H - 0.1} w={w} d={d} h={0.1} c={[C.blue, C.white, C.pale]} />
        {/* parapet rail */}
        <polyline points={pts([[x, y + d, HERO_H + 0.12], [x + w, y + d, HERO_H + 0.12], [x + w, y, HERO_H + 0.12]])} fill="none" stroke={C.soft} strokeWidth={0.6} />
        {open && (
          <g className="animate-fade-in">
            <Roof still={still} />
          </g>
        )}
      </g>,
    );
  }
  // the glass lift on the front-left corner, its car going between floors
  if (open) {
    const lx = x + 0.06;
    const ly = y + d + 0.02;
    const step = fh * S;
    out.push(
      <g key="lift" className="animate-fade-in">
        <Box x={lx} y={ly} z={0} w={0.22} d={0.16} h={HERO_H + 0.25} c={[C.soft, C.soft, C.soft]} op={0.14} />
        <polyline points={pts([[lx, ly + 0.16, 0], [lx, ly + 0.16, HERO_H + 0.25]])} stroke={C.soft} strokeWidth={0.6} />
        <polyline points={pts([[lx + 0.22, ly + 0.16, 0], [lx + 0.22, ly + 0.16, HERO_H + 0.25]])} stroke={C.soft} strokeWidth={0.6} />
        <g>
          {!still && (
            <animateTransform
              attributeName="transform"
              type="translate"
              values={`0 0;0 0;0 ${-2 * step};0 ${-2 * step};0 ${-3 * step};0 ${-3 * step};0 ${-1 * step};0 ${-1 * step};0 0`}
              keyTimes="0;0.12;0.25;0.37;0.45;0.57;0.72;0.84;1"
              dur="16s"
              repeatCount="indefinite"
            />
          )}
          <Box x={lx + 0.02} y={ly + 0.01} z={0.02} w={0.18} d={0.14} h={0.34} c={[C.white, C.hi, C.blue]} />
        </g>
      </g>,
    );
  }
  return <g>{out}</g>;
}

// Street life: cars both ways on every road, people on the pavements, clouds going over.
type Car = { axis: 'x' | 'y'; lane: number; dir: 1 | -1; dur: number; begin: number; c: number };
const CARS: Car[] = [
  { axis: 'y', lane: 4.0, dir: 1, dur: 13, begin: 0, c: 0 },
  { axis: 'y', lane: 4.12, dir: -1, dur: 16, begin: -5, c: 1 },
  { axis: 'x', lane: 2.0, dir: 1, dur: 15, begin: -3, c: 2 },
  { axis: 'x', lane: 2.12, dir: -1, dur: 12, begin: -8, c: 3 },
  { axis: 'x', lane: 4.0, dir: 1, dur: 14, begin: -10, c: 1 },
  { axis: 'y', lane: 2.0, dir: 1, dur: 17, begin: -2, c: 3 },
  { axis: 'y', lane: 2.12, dir: -1, dur: 11, begin: -6, c: 0 },
];
const PAINT: [string, string, string][] = [
  [C.white, C.pale, C.soft],
  [C.hi, C.blue, C.mid],
  [C.soft, C.hi, C.blue],
  [C.pale, C.soft, C.hi],
];

export function Street({ still }: { still: boolean }) {
  return (
    <g>
      {CARS.map((car, k) => {
        // the ground runs from -0.3 to 6; a car fades in at one end and out at the other (and, held still, waits
        // part-way along its road)
        const a = car.dir === 1 ? -0.25 : 5.95;
        const b = car.dir === 1 ? 5.95 : -0.25;
        const held = a + (b - a) * ((-car.begin / car.dur) % 1 || 0.4);
        // the road a car runs along is y = lane (axis x) or x = lane (axis y)
        const start: V3 = car.axis === 'y' ? [still ? held : a, car.lane, 0] : [car.lane, still ? held : a, 0];
        const end: V3 = car.axis === 'y' ? [b, car.lane, 0] : [car.lane, b, 0];
        const [sx, sy] = iso(...start);
        const [ex, ey] = iso(...end);
        const along = car.axis === 'y';
        return (
          <g key={k}>
            {!still && <animateTransform attributeName="transform" type="translate" from="0 0" to={`${(ex - sx).toFixed(1)} ${(ey - sy).toFixed(1)}`} dur={`${car.dur}s`} begin={`${car.begin}s`} repeatCount="indefinite" />}
            {!still && <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.05;0.95;1" dur={`${car.dur}s`} begin={`${car.begin}s`} repeatCount="indefinite" />}
            <Box x={start[0] - (along ? 0.13 : 0.05)} y={start[1] - (along ? 0.05 : 0.13)} z={0} w={along ? 0.26 : 0.1} d={along ? 0.1 : 0.26} h={0.08} c={PAINT[car.c]} />
            <Box x={start[0] - (along ? 0.05 : 0.04)} y={start[1] - (along ? 0.04 : 0.05)} z={0.08} w={along ? 0.12 : 0.08} d={along ? 0.08 : 0.12} h={0.04} c={[C.ink, C.night, C.night]} />
          </g>
        );
      })}
      {/* street trees */}
      {[[1.9, 0.5], [1.9, 1.5], [2.25, 1.9], [3.6, 1.9], [0.3, 1.9], [5.85, 2.3], [5.85, 3.8], [0.2, 4.25]].map(([tx, ty], k) => (
        <Tree key={k} p={[tx, ty, 0]} s={0.55} />
      ))}
      {/* the grove on the plot behind the site */}
      {[[0.55, 0.6, 0.8], [1.1, 0.42, 0.65], [1.45, 0.95, 0.75], [0.75, 1.35, 0.7], [1.3, 1.55, 0.6], [0.4, 1.05, 0.55]].map(([tx, ty, ts], k) => (
        <Tree key={`g${k}`} p={[tx, ty, 0]} s={ts} />
      ))}
      {/* the plaza in front, on the left: trees, a kiosk, people */}
      <polygon points={pts([[2.3, 4.3, 0], [3.8, 4.3, 0], [3.8, 5.8, 0], [2.3, 5.8, 0]])} fill={C.night} stroke={C.mid} strokeWidth={0.6} />
      <Box x={2.95} y={4.95} z={0} w={0.35} d={0.25} h={0.3} c={[C.soft, C.hi, C.blue]} />
      <Person p={[3.15, 5.35, 0]} body={C.white} still={still} />
      <Person p={[2.5, 5.0, 0]} body={C.hi} walk={{ to: [3.5, 4.55, 0], dur: 9, begin: -2 }} still={still} />
      {[[2.55, 4.55, 0.7], [3.55, 4.6, 0.6], [2.6, 5.5, 0.65], [3.6, 5.5, 0.75]].map(([tx, ty, ts], k) => (
        <Tree key={`p${k}`} p={[tx, ty, 0]} s={ts} />
      ))}
    </g>
  );
}

// People on the pavements. Drawn after the buildings, so only on pavements that run in front of them: past the
// open building, in front of the parking deck and in front of the office — never where a building stands nearer.
export function Walkers({ still }: { still: boolean }) {
  return (
    <g>
      <Person p={[2.65, 3.99, 0]} body={C.white} walk={{ to: [3.75, 3.99, 0], dur: 14 }} still={still} />
      <Person p={[3.7, 3.95, 0]} body={C.hi} walk={{ to: [2.7, 3.95, 0], dur: 12, begin: -4 }} still={still} />
      <Person p={[4.35, 3.93, 0]} body={C.soft} walk={{ to: [5.6, 3.93, 0], dur: 11, begin: -6 }} still={still} />
      <Person p={[1.5, 5.68, 0]} body={C.pale} walk={{ to: [0.4, 5.68, 0], dur: 10, begin: -3 }} still={still} />
    </g>
  );
}

// the park on the corner plot: trees, a fountain, benches, people
export function Park({ still }: { still: boolean }) {
  const [x, y, w, d] = [3.8, 4.4, 1.5, 0.9];
  return (
    <g>
      <polygon points={pts([[x, y, 0], [x + w, y, 0], [x + w, y + d, 0], [x, y + d, 0]])} fill="#123345" stroke={C.mid} strokeWidth={0.6} />
      <polyline points={pts([[x + 0.1, y + 0.75, 0], [x + 0.75, y + 0.45, 0], [x + 1.4, y + 0.2, 0]])} fill="none" stroke={C.mid} strokeWidth={2.2} opacity={0.8} />
      <Tree p={[x + 0.25, y + 0.2, 0]} s={0.8} />
      <Tree p={[x + 0.9, y + 0.12, 0]} s={0.7} />
      <Disc p={[x + 0.75, y + 0.45, 0]} r={0.16} fill={C.blue} stroke={C.soft} />
      <circle cx={iso(x + 0.75, y + 0.45, 0)[0]} cy={iso(x + 0.75, y + 0.45, 0)[1]} r="2" fill="none" stroke={C.pale} strokeWidth={0.6}>
        {!still && <animate attributeName="r" values="1;6;1" dur="2.4s" repeatCount="indefinite" />}
        {!still && <animate attributeName="opacity" values="0.9;0;0.9" dur="2.4s" repeatCount="indefinite" />}
      </circle>
      <line x1={iso(x + 0.75, y + 0.45, 0)[0]} y1={iso(x + 0.75, y + 0.45, 0)[1]} x2={iso(x + 0.75, y + 0.45, 0)[0]} y2={iso(x + 0.75, y + 0.45, 0.3)[1]} stroke={C.pale} strokeWidth={1}>
        {!still && <animate attributeName="opacity" values="0.4;0.9;0.4" dur="1.2s" repeatCount="indefinite" />}
      </line>
      <Box x={x + 1.05} y={y + 0.55} z={0} w={0.3} d={0.07} h={0.06} c={[C.pale, C.soft, C.blue]} />
      <Person p={[x + 1.15, y + 0.62, 0.02]} body={C.hi} seated still={still} />
      <Person p={[x + 1.28, y + 0.62, 0.02]} body={C.white} seated still={still} />
      <Person p={[x + 0.3, y + 0.7, 0]} body={C.soft} walk={{ to: [x + 0.6, y + 0.55, 0], dur: 6 }} still={still} />
      <Tree p={[x + 0.35, y + 0.82, 0]} s={0.6} />
      <Tree p={[x + 1.35, y + 0.8, 0]} s={0.65} />
    </g>
  );
}

// cars parked on the deck (the low building on the plot east of the site)
export function Parked({ x, y, z }: { x: number; y: number; z: number }) {
  return (
    <g>
      {[0, 1, 2, 3].flatMap((r) =>
        [0, 1].map((c) => (r + c) % 3 === 2 ? null : <Box key={`${r}${c}`} x={x + 0.15 + c * 0.55} y={y + 0.12 + r * 0.32} z={z} w={0.26} d={0.12} h={0.08} c={PAINT[(r + c) % PAINT.length]} />),
      )}
    </g>
  );
}

export function Clouds({ still }: { still: boolean }) {
  const cloud = (cx: number, cy: number, s: number) => (
    <g>
      <ellipse cx={cx} cy={cy} rx={18 * s} ry={6 * s} fill={C.pale} />
      <circle cx={cx - 6 * s} cy={cy - 4 * s} r={7 * s} fill={C.pale} />
      <circle cx={cx + 5 * s} cy={cy - 6 * s} r={9 * s} fill={C.pale} />
    </g>
  );
  return (
    <g opacity={0.14}>
      <g>
        {!still && <animateTransform attributeName="transform" type="translate" values="-60 0;80 0;-60 0" dur="70s" repeatCount="indefinite" />}
        {cloud(-120, -118, 1)}
      </g>
      <g>
        {!still && <animateTransform attributeName="transform" type="translate" values="40 0;-90 0;40 0" dur="90s" repeatCount="indefinite" />}
        {cloud(110, -96, 0.8)}
      </g>
    </g>
  );
}
