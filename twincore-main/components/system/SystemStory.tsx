'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { Box, C, Clouds, HERO, HERO_H, Hero, LIFT_RISE, LIFT_SET, Park, Parked, SLAB_DROP, Street, Walkers, iso, pts, slabLift, slabSet } from './StoryCity';

// The overview as a short animated story, told in the platform's own words: base data is laid down, the digital twin
// rises on it, construction is controlled on the twin, the site is monitored — and every object is one record with
// a unique ID across all four. Each scene has its line, which slides in and stays until the next. The city itself
// (the cut-away building, the street life) is drawn in ./StoryCity.

export type Scene = { name: string; lead: string; points: string[]; href?: string };
const DUR = 8000;
const BUILD_DUR = 15000; // the construction scene runs longer, so every lift reads as one calm movement
const durOf = (k: number) => (k === 2 ? BUILD_DUR : DUR);
const LIFT = 16; // how far apart the base layers sit, in scene 1 (the stack is lifted so its bottom stays in the picture)

// the block (x, y, w, d, height), one building to a plot, each set a little differently on it. The plots in front of
// the site stay low — a parking deck, a plaza, the park on the corner — and the plot behind it is trees, so the
// cut-away building can be seen into and no neighbour hides behind it.
const BUILDINGS: [number, number, number, number, number][] = [
  [0.35, 4.45, 1.2, 1.05, 3.0], // office, on the left corner
  [2.45, 0.35, 1.0, 1.0, 5.0], // apartments, behind on the right
  [4.45, 0.4, 1.3, 1.0, 2.2], // retail, on the right corner
  [0.4, 2.45, 1.1, 1.3, 1.6], // school, behind on the left
  [HERO.x, HERO.y, HERO.w, HERO.d, HERO_H], // the one built in scene 3, drawn cut away
  [4.4, 2.45, 1.2, 1.3, 0.35], // parking deck
];
const LIFTS = HERO.floors; // crane lifts in scene 3, one per floor
// The tower crane. The site's plot is all building, so the mast stands on its own footing across the road, in the
// forecourt of the low retail block: on screen it is well clear of the building, its upper half against open sky
// rather than a tall neighbour, and it is drawn after the buildings (it is nearer than all of them). Only the long jib
// reaches over the plot, well above the roof line. The precast slabs wait in a stack in the yard (the plaza in front)
// and are lifted from there.
const CRANE = { x: 5.55, y: 1.62 };
const MAST_TOP = 7.2;
const MAST_HW = 0.09; // half the mast's width
const YARD = { x: HERO.x, y: 4.3 }; // the stack's back corner; the slabs are the plot's size
const polar = (px: number, py: number) => ({ a: Math.atan2(py - CRANE.y, px - CRANE.x), r: Math.hypot(px - CRANE.x, py - CRANE.y) });
const AT_PLOT = polar(HERO.x + HERO.w / 2, HERO.y + HERO.d / 2);
const AT_YARD = polar(YARD.x + HERO.w / 2, YARD.y + HERO.d / 2);
const JIB = Math.max(AT_PLOT.r, AT_YARD.r) + 0.45;
const DUNNAGE = 0.06; // timber the stack sits on
const PLATE = 0.08; // one slab's thickness
const HANG = 0.3; // the hook rides this far above the slab it carries
const smooth = (k: number) => k * k * (3 - 2 * k);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const seg = (u: number, a: number, b: number) => smooth(clamp01((u - a) / (b - a)));

// the mast on its footing: two lattice faces, drawn in the buildings' depth order
function Mast() {
  const { x, y } = CRANE;
  const T = MAST_TOP;
  const n = 14;
  const face = (ax: number, ay: number, bx: number, by: number, op: number) => (
    <g opacity={op}>
      <line x1={iso(ax, ay, 0)[0]} y1={iso(ax, ay, 0)[1]} x2={iso(ax, ay, T)[0]} y2={iso(ax, ay, T)[1]} stroke="#93c5fd" strokeWidth={1.2} />
      <line x1={iso(bx, by, 0)[0]} y1={iso(bx, by, 0)[1]} x2={iso(bx, by, T)[0]} y2={iso(bx, by, T)[1]} stroke="#93c5fd" strokeWidth={1.2} />
      {Array.from({ length: n }, (_, k) => {
        const [p0x, p0y] = k % 2 ? iso(bx, by, (k * T) / n) : iso(ax, ay, (k * T) / n);
        const [p1x, p1y] = k % 2 ? iso(ax, ay, ((k + 1) * T) / n) : iso(bx, by, ((k + 1) * T) / n);
        return <line key={k} x1={p0x} y1={p0y} x2={p1x} y2={p1y} stroke="#93c5fd" strokeWidth={0.55} opacity={0.85} />;
      })}
    </g>
  );
  const h = MAST_HW;
  return (
    <g>
      {/* the footing */}
      <Box x={x - 0.2} y={y - 0.2} z={0} w={0.4} d={0.4} h={0.07} c={['#7c8aa0', '#5d6b80', '#4a576a']} />
      {/* the far faces first, faintly, then the near ones */}
      {face(x - h, y - h, x + h, y - h, 0.45)}
      {face(x - h, y - h, x - h, y + h, 0.45)}
      {face(x - h, y + h, x + h, y + h, 1)}
      {face(x + h, y - h, x + h, y + h, 1)}
    </g>
  );
}
const SENSORS: [number, number, number, boolean][] = [
  [0.35, 4.45, 3.0, false],
  [2.45, 0.35, 5.0, false],
  [4.4, 2.45, 0.35, true], // a warning
  [0.4, 2.45, 1.6, false],
];
// labels with their leader lines, nudged upward wherever two would overlap
function placeLabels(items: { x: number; y: number; w: number }[], gap = 14) {
  const placed: { x: number; y: number; w: number }[] = [];
  for (const it of [...items].map((v, k) => ({ ...v, k })).sort((a, b) => b.y - a.y)) {
    let y = it.y;
    for (let guard = 0; guard < 20; guard++) {
      const hit = placed.find((p) => p && Math.abs(p.x - it.x) < (p.w + it.w) / 2 + 3 && Math.abs(p.y - y) < gap);
      if (!hit) break;
      y = hit.y - gap;
    }
    placed[it.k] = { x: it.x, y, w: it.w };
  }
  return placed;
}

function Prism({ b, k, grow, tone, still }: { b: (typeof BUILDINGS)[number]; k: number; grow: number; tone: 'plain' | 'built'; still: boolean }) {
  const [x, y, w, d, h0] = b;
  const h = h0 * grow;
  const top: [number, number, number][] = [
    [x, y, h],
    [x + w, y, h],
    [x + w, y + d, h],
    [x, y + d, h],
  ];
  const left: [number, number, number][] = [
    [x, y + d, 0],
    [x + w, y + d, 0],
    [x + w, y + d, h],
    [x, y + d, h],
  ];
  const right: [number, number, number][] = [
    [x + w, y, 0],
    [x + w, y + d, 0],
    [x + w, y + d, h],
    [x + w, y, h],
  ];
  const c = tone === 'built' ? ['#9cc3ff', '#3b6fd8', '#24489a'] : ['#c3d0e6', '#7586a3', '#53627d'];
  return (
    <g style={{ transition: `opacity 600ms ${k * 80}ms` }} opacity={grow > 0 ? 1 : 0}>
      <polygon points={pts(left)} fill={c[1]} />
      <polygon points={pts(right)} fill={c[2]} />
      <polygon points={pts(top)} fill={c[0]} />
      {/* windows: thin bands up the lit face, a few of them lit and going on and off */}
      {Array.from({ length: Math.floor(h) }, (_, f) => (
        <polygon key={f} points={pts([[x + 0.12, y + d, f + 0.45], [x + w - 0.12, y + d, f + 0.45], [x + w - 0.12, y + d, f + 0.7], [x + 0.12, y + d, f + 0.7]])} fill="#0b1426" opacity={0.35} />
      ))}
      {Array.from({ length: Math.floor(h) }, (_, f) =>
        (f + k) % 2 ? null : (
          <polygon key={`l${f}`} points={pts([[x + w, y + 0.2, f + 0.4], [x + w, y + 0.45, f + 0.4], [x + w, y + 0.45, f + 0.72], [x + w, y + 0.2, f + 0.72]])} fill="#93c5fd" opacity={0.5}>
            {!still && <animate attributeName="opacity" values="0.5;0.5;0.08;0.08;0.5" dur={`${7 + ((f * 3 + k) % 5)}s`} begin={`${-f - k}s`} repeatCount="indefinite" />}
          </polygon>
        ),
      )}
    </g>
  );
}

// compact: one column for the side of the front page's headline — the scene on top, a short caption under it
export default function SystemStory({ scenes, more, compact = false }: { scenes: Scene[]; more: string; compact?: boolean }) {
  const ts = useTranslations('home.story');
  const objects = ts.raw('objects') as string[]; // what each building is, shown on its record in the last scene
  const [i, setI] = useState(0);
  const paused = false;
  const [t, setT] = useState(0); // how far scene 3 has run, 0..1 — held with the story when it pauses
  const box = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const [seen, setSeen] = useState(false);
  const [still, setStill] = useState(false);
  useEffect(() => setStill(matchMedia('(prefers-reduced-motion: reduce)').matches), []);
  // on a phone the picture is cropped to the city (no empty margins) and its labels are drawn larger
  const [small, setSmall] = useState(false);
  useEffect(() => {
    const mq = matchMedia('(max-width: 639px)');
    const on = () => setSmall(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  const see = ts.raw('see') as string[]; // what the picture shows in each scene, in plain words
  const layers = ts.raw('layers') as string[]; // the base layers, bottom to top
  // the street life runs only while the picture is on screen
  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? el.unpauseAnimations() : el.pauseAnimations()));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // starts when it scrolls into view
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setSeen(true), { threshold: 0.3 });
    if (box.current) io.observe(box.current);
    return () => io.disconnect();
  }, []);
  // the step's timer: paused while held (or off screen), resumed with the time it had left
  const left = useRef(durOf(0));
  const started = useRef(0);
  useEffect(() => {
    left.current = durOf(i);
  }, [i]);
  useEffect(() => {
    if (!seen || paused) return;
    started.current = performance.now();
    const id = setTimeout(() => !location.search.includes('scene') && setI((v) => (v + 1) % scenes.length), Math.max(0, left.current));
    return () => {
      clearTimeout(id);
      left.current -= performance.now() - started.current;
    };
  }, [i, seen, paused, scenes.length]);
  useEffect(() => {
    setT(0);
  }, [i]);
  useEffect(() => {
    if (i !== 2 || !seen || paused) return;
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = now - last;
      last = now;
      if (!location.search.includes('t=')) setT((v) => Math.min(1, v + dt / BUILD_DUR));
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [i, seen, paused]);

  // DEBUG-PIN (temporary)
  const pin = typeof location !== 'undefined' ? new URLSearchParams(location.search) : null;
  if (pin?.get('scene')) { const ps = +pin.get('scene')!; if (ps !== i) setTimeout(() => setI(ps)); }
  if (pin?.get('t') && i === 2) { const pt = +pin.get('t')!; if (pt !== t) setTimeout(() => setT(pt)); }
  const sc = scenes[i];
  const play = { ['--dur' as string]: `${durOf(i)}ms`, animationPlayState: paused || !seen ? 'paused' : 'running' } as React.CSSProperties;
  const layersIn = true;
  const twin = i >= 1;
  const sensors = i >= 3;
  const ids = i === 4;
  // The building goes up at a steady pace with a moment finished at the end (the crane then leaves). One lift per
  // floor, in step with the building (see StoryCity's LIFT_RISE / LIFT_SET): while that floor's columns rise the hook
  // drops to the yard, takes the top slab off the stack, hoists it clear, and the crane slews and runs its trolley in
  // over the plot; the slab is lowered onto the columns; the empty hook goes up and swings back to the yard.
  const grow = i < 2 ? 0 : i > 2 ? 1 : clamp01((t - 0.05) / 0.85);
  const floors = HERO.floors;
  const bf = grow * LIFTS;
  const lift = Math.min(LIFTS - 1, Math.floor(bf));
  const cycle = grow >= 1 ? 1 : bf - lift;
  const land = (lift + 1) * HERO.fh + HANG; // the hook once the slab is in place
  const travel = Math.min(MAST_TOP - 0.55, Math.max(3.2, land + SLAB_DROP + 0.8)); // clear of the building and the stack
  const pick = DUNNAGE + (LIFTS - lift) * PLATE + HANG; // the hook at the top slab of the stack
  const setP = slabSet(bf, lift + 1);
  let hookZ = travel;
  let swing = 0; // 0 = over the yard, 1 = over the plot
  let loaded = false;
  if (grow < 1 && cycle < LIFT_RISE) {
    const u = cycle / LIFT_RISE;
    loaded = u >= 0.22;
    swing = seg(u, 0.5, 0.84);
    hookZ = u < 0.22 ? travel + (pick - travel) * seg(u, 0, 0.18) : u < 0.5 ? pick + (travel - pick) * seg(u, 0.26, 0.5) : travel + (land + slabLift(0) - travel) * seg(u, 0.84, 1);
  } else if (grow < 1 && cycle < LIFT_RISE + LIFT_SET) {
    swing = 1;
    hookZ = land + slabLift(setP);
  } else if (grow < 1) {
    const r = (cycle - LIFT_RISE - LIFT_SET) / (1 - LIFT_RISE - LIFT_SET);
    hookZ = land + (travel - land) * seg(r, 0, 0.35);
    swing = 1 - seg(r, 0.35, 1);
  }
  const angle = AT_YARD.a + (AT_PLOT.a - AT_YARD.a) * swing;
  const trolley = AT_YARD.r + (AT_PLOT.r - AT_YARD.r) * swing;
  // the slabs still waiting in the yard (the one on the hook has left the stack)
  const waiting = grow >= 1 ? 0 : LIFTS - lift - (loaded || cycle >= LIFT_RISE ? 1 : 0);
  const open = grow >= 1; // the building is finished: its rooms fill, the roof comes alive and the crane leaves
  const crane = i === 2 && !open;
  const yard = i === 2;

  return (
    <div ref={box} className={compact ? 'flex flex-col gap-4' : 'grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-14'}>
      {/* the narration (it keeps playing; a scene can be picked from the bars) */}
      <div className={compact ? 'order-2' : 'order-2 lg:order-1'}>
        <ol className="flex gap-1.5" aria-label="scenes">
          {scenes.map((s, k) => (
            <li key={s.name} className="flex-1">
              <button type="button" onClick={() => setI(k)} aria-label={s.name} aria-current={k === i} className="block h-10 w-full cursor-pointer py-[18px] sm:h-6 sm:py-2.5">
                <span className="block h-1 overflow-hidden rounded-full bg-line">
                  {k < i && <span className="block h-full bg-accent" />}
                  {k === i && <span key={i} className="animate-fill block h-full bg-grad" style={play} />}
                </span>
              </button>
            </li>
          ))}
        </ol>
        <div key={i} className={`animate-swap ${compact ? 'mt-3 min-h-[52px]' : 'mt-6 min-h-[190px]'}`}>
          <p className="font-mono text-xs text-accent-hi">
            0{i + 1} / 0{scenes.length}
          </p>
          {compact ? <h2 className="mt-2 text-xl font-medium">{sc.name}</h2> : <h2 className="mt-3 text-3xl tracking-[-0.02em] sm:text-4xl">{sc.name}</h2>}
          {!compact && <p className="mt-4 text-lg leading-relaxed text-fg/80">{sc.lead}</p>}
          <ul className={compact ? 'hidden' : 'mt-5 flex flex-wrap gap-2'}>
            {sc.points.map((p) => (
              <li key={p} className="rounded-full border border-line px-3 py-1 text-sm text-mute">
                {p}
              </li>
            ))}
          </ul>
          {sc.href && !compact && (
            <Link href={sc.href} className="mt-6 inline-flex items-center gap-1.5 text-sm text-accent-hi hover:underline">
              {more} →
            </Link>
          )}
        </div>
      </div>

      {/* the scene */}
      <div className={`relative order-1 rounded-3xl border border-line bg-[radial-gradient(70%_60%_at_50%_40%,rgb(37_99_235/0.18),transparent_70%)] p-2 sm:p-4 ${compact ? '' : 'lg:order-2'}`}>
        {/* what you are looking at, in plain words — above the picture, never over it, so the whole line shows on every screen */}
        <p key={`see${i}`} className="animate-fade-in pointer-events-none mb-2 min-h-11 rounded-lg bg-ink/80 px-2.5 py-1.5 text-xs leading-snug text-pretty text-fg backdrop-blur-sm">
          <span className="font-mono text-[10px] text-accent-hi">
            {i + 1}/{scenes.length}
          </span>{' '}
          {see[i]}
        </p>
        <svg ref={svg} viewBox={small ? '-142 -150 284 300' : '-190 -150 380 300'} className="w-full" role="img" aria-label={`${sc.name}: ${see[i]}`}>
          {/* the base data as 2D layers, stacking down into place: the drone survey first — the terrain model (DTM),
              the surface model (DSM), the orthophoto — then the streets and the parcels drawn on it */}
          {[
            { fill: '#1a2e1f', stroke: '#2f6b4b', dtm: true },
            { fill: '#111c33', stroke: '#2f4f8a', dsm: true },
            { fill: '#2f3a2a', stroke: '#6b7a5a', ortho: true },
            { fill: 'transparent', stroke: '#64748b', roads: true },
            { fill: '#0f1b33', stroke: '#3b82f6', parcels: true },
          ].map((L, k, all) => (
            <g key={k} style={{ transition: `transform 900ms ${k * 200}ms ease-out, opacity 700ms ${k * 200}ms`, transform: `translateY(${i === 0 ? (all.length - 1 - k) * LIFT - 70 : 0}px)` }} opacity={layersIn ? (i === 0 || k === all.length - 1 ? 1 : 0.35) : 0}>
              <polygon points={pts([[-0.3, -0.3, 0], [6, -0.3, 0], [6, 6, 0], [-0.3, 6, 0]])} fill={L.fill} stroke={L.stroke} strokeWidth={1} />
              {L.dtm && (
                // contour lines around a low hill
                <g fill="none" stroke="#8fbf6a" strokeWidth={0.7} opacity={0.7}>
                  {[0.5, 1.0, 1.5, 1.9].map((r) => (
                    <polygon key={r} points={pts(Array.from({ length: 28 }, (_, n) => [4.0 - r * 0.12 + r * Math.cos((n / 28) * Math.PI * 2), 3.9 + r * 0.1 + r * 0.8 * Math.sin((n / 28) * Math.PI * 2), 0]))} />
                  ))}
                  <polyline points={pts([[-0.3, 1.6, 0], [0.9, 1.3, 0], [2.1, 1.7, 0], [3.3, 1.2, 0], [4.6, 1.5, 0], [6, 1.1, 0]])} />
                  <polyline points={pts([[-0.3, 0.6, 0], [1.2, 0.4, 0], [2.6, 0.8, 0], [4.1, 0.3, 0], [6, 0.5, 0]])} />
                </g>
              )}
              {L.dsm && (
                // the surface: every building and tree as a height, the higher the lighter
                <g>
                  {BUILDINGS.map(([x, y, w, d, h], n) => (
                    <polygon key={n} points={pts([[x, y, 0], [x + w, y, 0], [x + w, y + d, 0], [x, y + d, 0]])} fill="#93c5fd" opacity={0.2 + (0.7 * h) / 5} />
                  ))}
                  {[[2.3, 4.8], [2.9, 5.2], [3.5, 4.6], [1.1, 4.0], [5.1, 1.9], [5.4, 5.0]].map(([x, y], n) => {
                    const [cx, cy] = iso(x, y, 0);
                    return <ellipse key={n} cx={cx} cy={cy} rx={4} ry={2.2} fill="#93c5fd" opacity={0.3} />;
                  })}
                </g>
              )}
              {L.ortho && (
                // the orthophoto: the ground as it looks from the air — vegetation, lighter plots, pale roads — in image tiles
                <g>
                  {[0.2, 2.25, 4.25].flatMap((px) =>
                    [0.2, 2.25, 4.25].map((py) => <polygon key={`${px}-${py}`} points={pts([[px, py, 0], [px + 1.6, py, 0], [px + 1.6, py + 1.6, 0], [px, py + 1.6, 0]])} fill="#5b5a44" opacity={(px + py) % 2 < 1 ? 0.45 : 0.3} />),
                  )}
                  {[2.05, 4.05].map((r) => (
                    <g key={r} stroke="#b5b5a6" strokeWidth={5} opacity={0.3}>
                      <polyline points={pts([[r, -0.3, 0], [r, 6, 0]])} />
                      <polyline points={pts([[-0.3, r, 0], [6, r, 0]])} />
                    </g>
                  ))}
                  <g stroke="#fff" strokeWidth={0.5} opacity={0.12}>
                    {[1.275, 2.85, 4.425].map((g) => (
                      <g key={g}>
                        <polyline points={pts([[g, -0.3, 0], [g, 6, 0]])} />
                        <polyline points={pts([[-0.3, g, 0], [6, g, 0]])} />
                      </g>
                    ))}
                  </g>
                </g>
              )}
              {/* the layer's name, off its lower-right edge (the layers above sit higher, so only the lower edges of a layer stay in view), while the stack is apart */}
              {(() => {
                const [lx, ly] = iso(6, 3.2, 0);
                return (
                  <g style={{ transition: 'opacity 500ms' }} opacity={i === 0 ? 1 : 0}>
                    <line x1={lx + 2} y1={ly} x2={lx + 9} y2={ly} stroke={L.stroke} strokeWidth={0.8} />
                    <text x={lx + 11} y={ly + 2.5} fontSize={7} fill="#cbd5e1">
                      {layers[k]}
                    </text>
                  </g>
                );
              })()}
              {L.roads &&
                [2.05, 4.05].map((r) => (
                  <g key={r}>
                    <polyline points={pts([[r, -0.3, 0], [r, 6, 0]])} stroke="#94a3b8" strokeWidth={5} opacity={0.5} />
                    <polyline points={pts([[-0.3, r, 0], [6, r, 0]])} stroke="#94a3b8" strokeWidth={5} opacity={0.5} />
                  </g>
                ))}
              {L.parcels &&
                [0.2, 2.25, 4.25].flatMap((px) =>
                  [0.2, 2.25, 4.25].map((py) => <polygon key={`${px}-${py}`} points={pts([[px, py, 0], [px + 1.6, py, 0], [px + 1.6, py + 1.6, 0], [px, py + 1.6, 0]])} fill="none" stroke="#3b82f6" strokeWidth={0.8} strokeDasharray="3 2" opacity={0.8} />),
                )}
            </g>
          ))}

          {/* the city comes to life with the twin: clouds, the park on the corner, cars and people in the streets */}
          <g style={{ transition: 'opacity 700ms' }} opacity={twin ? 1 : 0}>
            <Clouds still={still} />
            <Park still={still} />
            <Street still={still} yard={yard} />
          </g>

          {/* the digital twin: the buildings rise on the data */}
          {[...BUILDINGS]
            .map((b, k) => ({ b, k }))
            .sort((p, q) => p.b[0] + p.b[1] - (q.b[0] + q.b[1]))
            .concat([{ b: BUILDINGS[0], k: -1 }]) // the mast, nearer than every building
            .map(({ b, k }) =>
              k === -1 ? (
                <g key="mast" style={{ transition: 'opacity 700ms' }} opacity={crane ? 1 : 0}>
                  <Mast />
                </g>
              ) : (
              <g
                key={k}
                style={
                  k === 4
                    ? undefined
                    : { transition: `transform 800ms ${twin ? k * 70 : 0}ms cubic-bezier(.2,.8,.2,1)`, transformBox: 'fill-box', transformOrigin: 'bottom', transform: `scaleY(${twin ? 1 : 0.001})` }
                }
              >
                {k === 4 ? (
                  <Hero grow={grow} open={open} still={still} />
                ) : (
                  <>
                    <Prism b={b} k={k} grow={twin ? 1 : 0} tone="plain" still={still} />
                    {k === 5 && twin && <Parked x={b[0]} y={b[1]} z={b[4]} />}
                  </>
                )}
              </g>
              ),
            )}

          {/* people on the pavements in front of the buildings */}
          <g style={{ transition: 'opacity 700ms' }} opacity={twin ? 1 : 0}>
            <Walkers still={still} />
          </g>

          {/* construction: the plot marked out, a tower crane swings in and sets the building up floor by floor */}
          {(() => {
            const [x, y, w, d] = BUILDINGS[4];
            return <polygon points={pts([[x, y, 0], [x + w, y, 0], [x + w, y + d, 0], [x, y + d, 0]])} fill="rgb(147 197 253 / 0.08)" stroke="#93c5fd" strokeWidth={0.9} strokeDasharray="3 2" style={{ transition: 'opacity 500ms' }} opacity={i === 1 || (i === 2 && grow < 0.15) ? 1 : 0} />;
          })()}
          {/* the yard: the precast slabs still to go up, stacked on timber in front of the site */}
          <g style={{ transition: 'opacity 600ms' }} opacity={yard && !open ? 1 : 0}>
            <Box x={YARD.x + 0.15} y={YARD.y + 0.2} z={0} w={HERO.w - 0.3} d={0.08} h={DUNNAGE} c={['#8a7356', '#6f5b43', '#5a4a37']} />
            <Box x={YARD.x + 0.15} y={YARD.y + HERO.d - 0.28} z={0} w={HERO.w - 0.3} d={0.08} h={DUNNAGE} c={['#8a7356', '#6f5b43', '#5a4a37']} />
            {Array.from({ length: waiting }, (_, n) => (
              <Box key={n} x={YARD.x} y={YARD.y} z={DUNNAGE + n * PLATE} w={HERO.w} d={HERO.d} h={PLATE} c={['#4f7fd6', C.white, C.pale]} />
            ))}
          </g>
          {/* the crane's moving parts, above everything (the mast itself is drawn with the buildings) */}
          <g style={{ transition: 'opacity 700ms' }} opacity={crane ? 1 : 0}>
            {(() => {
              const ux = Math.cos(angle);
              const uy = Math.sin(angle);
              const along = (d: number, z: number) => iso(CRANE.x + ux * d, CRANE.y + uy * d, z);
              const [jx, jy] = along(JIB, MAST_TOP); // jib tip
              const [cx, cy] = along(-1.0, MAST_TOP); // counter-jib
              const [px, py] = along(0, MAST_TOP + 0.9); // apex
              const [mx, my] = along(0, MAST_TOP); // slewing ring
              const [tx, ty] = along(trolley, MAST_TOP);
              const [hx, hy] = along(trolley, hookZ);
              // the slab on the hook: the same plate the building gets, hanging level under the hook on four slings
              const { w, d } = HERO;
              const sx0 = CRANE.x + ux * trolley - w / 2;
              const sy0 = CRANE.y + uy * trolley - d / 2;
              const slabTop = hookZ - HANG;
              const corners = [iso(sx0, sy0, slabTop), iso(sx0 + w, sy0, slabTop), iso(sx0 + w, sy0 + d, slabTop), iso(sx0, sy0 + d, slabTop)];
              return (
                <g>
                  {/* jib, counter-jib with its weight, ties to the apex, the cab */}
                  <line x1={jx} y1={jy} x2={cx} y2={cy} stroke="#93c5fd" strokeWidth={2} strokeLinecap="round" />
                  <line x1={px} y1={py} x2={jx} y2={jy} stroke="#93c5fd" strokeWidth={0.6} />
                  <line x1={px} y1={py} x2={cx} y2={cy} stroke="#93c5fd" strokeWidth={0.6} />
                  <line x1={mx} y1={my} x2={px} y2={py} stroke="#93c5fd" strokeWidth={1.4} />
                  <rect x={cx - 5} y={cy - 1} width="10" height="7" rx="1" fill="#566173" />
                  <rect x={mx - 3.5} y={my + 1} width="7" height="6" rx="1" fill="#93c5fd" opacity={0.9} />
                  {/* trolley, cable, hook, and the slab it carries */}
                  <rect x={tx - 3} y={ty - 1.5} width="6" height="3" rx="1" fill="#e5e7eb" />
                  <line x1={tx} y1={ty} x2={hx} y2={hy} stroke="#e5e7eb" strokeWidth={0.7} />
                  <path d={`M${hx - 2},${hy} q2,4 4,0`} fill="none" stroke="#e5e7eb" strokeWidth={0.9} />
                  {loaded && <Box x={sx0} y={sy0} z={slabTop - PLATE} w={w} d={d} h={PLATE} c={['#4f7fd6', C.white, C.pale]} />}
                  {grow < 1 && (loaded || (cycle >= LIFT_RISE && cycle < LIFT_RISE + LIFT_SET)) && corners.map(([qx, qy], n) => <line key={n} x1={hx} y1={hy + 2} x2={qx} y2={qy} stroke="#e5e7eb" strokeWidth={0.45} opacity={0.7} />)}
                </g>
              );
            })()}
          </g>
          <g style={{ transition: 'opacity 500ms' }} opacity={i === 2 ? 1 : 0}>
            {/* in the corner the crane's jib doesn't reach: top-left on a wide picture, top-right on the narrow phone one */}
            <g transform={small ? 'translate(30,-146)' : 'translate(-182,-140)'}>
              <rect width="110" height="34" rx="8" fill="#0b1426" stroke="#1e3a6b" />
              <rect x="10" y="20" width="90" height="5" rx="2.5" fill="#1e293b" />
              <rect x="10" y="20" width={90 * grow} height="5" rx="2.5" fill="#3b82f6" />
              <text x="10" y="14" fontSize="9" fill="#94a3b8">
                {Math.round(grow * 100)}%
              </text>
              <text x="100" y="14" fontSize="8" textAnchor="end" fill="#64748b" fontFamily="ui-monospace,monospace">
                {Math.min(Math.ceil(floors), Math.floor(grow * floors) + 1)}/{Math.ceil(floors)}F
              </text>
            </g>
          </g>

          {/* monitoring: sensors report from the buildings; one raises a warning */}
          {SENSORS.map(([x, y, h, warn], k) => {
            const [sx, sy] = iso(x + 0.3, y + 0.3, h + 0.6);
            return (
              <g key={k} style={{ transition: `opacity 500ms ${k * 150}ms` }} opacity={sensors ? 1 : 0}>
                <circle cx={sx} cy={sy} r="4" fill={warn ? '#38bdf8' : '#7fa36a'} />
                <circle cx={sx} cy={sy} r="4" fill="none" stroke={warn ? '#38bdf8' : '#7fa36a'}>
                  <animate attributeName="r" values="4;14" dur="1.6s" repeatCount="indefinite" begin={`${k * 0.3}s`} />
                  <animate attributeName="opacity" values="0.9;0" dur="1.6s" repeatCount="indefinite" begin={`${k * 0.3}s`} />
                </circle>
                {warn && i === 3 && (
                  <g transform={`translate(${sx + 10},${sy - 26})`}>
                    <rect width="66" height="18" rx="9" fill="#082f49" stroke="#38bdf8" />
                    <text x="33" y="12.5" fontSize="9" textAnchor="middle" fill="#7dd3fc">
                      ⚠ 7.2 mm
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* one record, one ID: every object linked to the platform */}
          <g style={{ transition: 'opacity 600ms' }} opacity={ids ? 1 : 0}>
            {(() => {
              const anchors = BUILDINGS.slice(0, 6).map(([x, y, w, d, h], k) => iso(x + w / 2, y + d / 2, h + (k === 4 ? 1.1 : 0)));
              const fs = small ? 9 : 7; // label text size
              const lh = fs * 1.7;
              const spots = placeLabels(anchors.map(([ax, ay], k) => ({ x: ax, y: ay - 10, w: objects[k].length * fs * 0.59 + 12 })), lh + 2);
              return anchors.map(([ax, ay], k) => {
                const { x: lx, y: ly, w: lw } = spots[k];
                return (
                  <g key={k}>
                    <line x1={lx} y1={ly - lh / 2} x2={0} y2={-128} stroke="#3b82f6" strokeWidth={0.8} strokeDasharray="2 3" opacity={0.7} />
                    {ly < ay - 12 && <line x1={ax} y1={ay} x2={lx} y2={ly + lh / 2} stroke="#3b82f6" strokeWidth={0.6} opacity={0.6} />}
                    <rect x={lx - lw / 2} y={ly - lh / 2} width={lw} height={lh} rx={lh / 2} fill="#0b1426" stroke={k === 4 ? '#9cc3ff' : '#3b82f6'} strokeWidth={0.6} />
                    <text x={lx} y={ly + fs * 0.36} fontSize={fs} textAnchor="middle" fill={k === 4 ? '#e0edff' : '#93c5fd'}>
                      {objects[k]}
                    </text>
                  </g>
                );
              });
            })()}
            <rect x="-42" y="-142" width="84" height="24" rx="12" fill="url(#tc)" />
            <text x="0" y="-126" fontSize="11" textAnchor="middle" fill="#fff" fontWeight={600}>
              TwinCore
            </text>
          </g>
          <defs>
            <linearGradient id="tc" x1="0" x2="1">
              <stop offset="0" stopColor="#2563eb" />
              <stop offset="1" stopColor="#60a5fa" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}
