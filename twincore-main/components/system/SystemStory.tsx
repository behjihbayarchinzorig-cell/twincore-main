'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { Clouds, HERO, HERO_H, Hero, Park, Parked, Street, Walkers, iso, pts } from './StoryCity';

// The overview as a short animated story, told in the platform's own words: base data is laid down, the digital twin
// rises on it, construction is controlled on the twin, the site is monitored — and every object is one record with
// a unique ID across all four. Each scene has its line, which slides in and stays until the next. The city itself
// (the cut-away building, the street life) is drawn in ./StoryCity.

export type Scene = { name: string; lead: string; points: string[]; href?: string };
const DUR = 8000;
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
  const left = useRef(DUR);
  const started = useRef(0);
  useEffect(() => {
    left.current = DUR;
  }, [i]);
  useEffect(() => {
    if (!seen || paused) return;
    started.current = performance.now();
    const id = setTimeout(() => setI((v) => (v + 1) % scenes.length), Math.max(0, left.current));
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
      setT((v) => Math.min(1, v + dt / DUR));
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [i, seen, paused]);

  const sc = scenes[i];
  const play = { ['--dur' as string]: `${DUR}ms`, animationPlayState: paused || !seen ? 'paused' : 'running' } as React.CSSProperties;
  const layersIn = true;
  const twin = i >= 1;
  const sensors = i >= 3;
  const ids = i === 4;
  // the building goes up at a steady pace (no slow crawl at the end): a short pause for the crane to swing in,
  // the climb, a moment finished. The hook makes one full lift per floor, so it is back at the top when the building is.
  const grow = i < 2 ? 0 : i > 2 ? 1 : Math.min(1, Math.max(0, (t - 0.08) / 0.8));
  const floors = HERO.floors;
  const cycle = (grow * LIFTS) % 1; // each lift: the load is lowered, set down, the hook goes back up
  const ease = (k: number) => k * k * (3 - 2 * k);
  const top = grow * HERO_H + 0.35;
  const hookZ = grow >= 1 ? 6.4 : cycle < 0.55 ? 6.4 - (6.4 - top) * ease(cycle / 0.55) : top + (6.4 - top) * ease((cycle - 0.55) / 0.45);
  const loaded = grow < 1 && cycle < 0.55;
  const trolleyX = HERO.x + HERO.w / 2 + 0.25 * Math.sin(grow * LIFTS * Math.PI);
  const open = grow >= 1; // the building is finished: its rooms fill and the roof comes alive

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
            <Street still={still} />
          </g>

          {/* the digital twin: the buildings rise on the data */}
          {[...BUILDINGS]
            .map((b, k) => ({ b, k }))
            .sort((p, q) => p.b[0] + p.b[1] - (q.b[0] + q.b[1]))
            .map(({ b, k }) => (
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
            ))}

          {/* people on the pavements in front of the buildings */}
          <g style={{ transition: 'opacity 700ms' }} opacity={twin ? 1 : 0}>
            <Walkers still={still} />
          </g>

          {/* construction: the plot marked out, a tower crane swings in and sets the building up floor by floor */}
          {(() => {
            const [x, y, w, d] = BUILDINGS[4];
            return <polygon points={pts([[x, y, 0], [x + w, y, 0], [x + w, y + d, 0], [x, y + d, 0]])} fill="rgb(147 197 253 / 0.08)" stroke="#93c5fd" strokeWidth={0.9} strokeDasharray="3 2" style={{ transition: 'opacity 500ms' }} opacity={i === 1 || (i === 2 && grow < 0.15) ? 1 : 0} />;
          })()}
          <g style={{ transition: 'opacity 500ms, transform 900ms cubic-bezier(.2,.8,.2,1)', transformBox: 'fill-box', transformOrigin: 'bottom', transform: `scaleY(${i === 2 ? 1 : 0.6})` }} opacity={i === 2 ? 1 : 0}>
            {(() => {
              const MX = HERO.x + HERO.w + 0.08, MY = HERO.y + HERO.d / 2, TOP = 7.2;
              const P = (x: number, z: number) => iso(x, MY, z);
              const [a0x, a0y] = P(MX - 0.12, 0);
              const [b0x, b0y] = P(MX + 0.12, 0);
              const [a1x, a1y] = P(MX - 0.12, TOP);
              const [b1x, b1y] = P(MX + 0.12, TOP);
              const [jx, jy] = P(1.5, TOP); // jib tip
              const [cx, cy] = P(4.7, TOP); // counter-jib
              const [px, py] = P(MX, TOP + 0.9); // apex
              const [tx, ty] = P(trolleyX, TOP);
              const [hx, hy] = iso(trolleyX, MY, hookZ);
              return (
                <g>
                  {/* mast: two chords and their bracing */}
                  <line x1={a0x} y1={a0y} x2={a1x} y2={a1y} stroke="#93c5fd" strokeWidth={1.4} />
                  <line x1={b0x} y1={b0y} x2={b1x} y2={b1y} stroke="#93c5fd" strokeWidth={1.4} />
                  {Array.from({ length: 14 }, (_, n) => {
                    const [ux, uy] = P(n % 2 ? MX + 0.12 : MX - 0.12, (n * TOP) / 14);
                    const [vx, vy] = P(n % 2 ? MX - 0.12 : MX + 0.12, ((n + 1) * TOP) / 14);
                    return <line key={n} x1={ux} y1={uy} x2={vx} y2={vy} stroke="#93c5fd" strokeWidth={0.6} opacity={0.8} />;
                  })}
                  {/* jib, counter-jib with its weight, ties to the apex */}
                  <line x1={jx} y1={jy} x2={cx} y2={cy} stroke="#93c5fd" strokeWidth={2} strokeLinecap="round" />
                  <line x1={px} y1={py} x2={jx} y2={jy} stroke="#93c5fd" strokeWidth={0.6} />
                  <line x1={px} y1={py} x2={cx} y2={cy} stroke="#93c5fd" strokeWidth={0.6} />
                  <line x1={(a1x + b1x) / 2} y1={(a1y + b1y) / 2} x2={px} y2={py} stroke="#93c5fd" strokeWidth={1.4} />
                  <rect x={cx - 9} y={cy - 1} width="10" height="7" rx="1" fill="#566173" />
                  <rect x={(a1x + b1x) / 2 - 3} y={(a1y + b1y) / 2 + 1} width="7" height="6" rx="1" fill="#93c5fd" opacity={0.9} />
                  {/* trolley, cable, hook and the load it carries */}
                  <rect x={tx - 3} y={ty - 1.5} width="6" height="3" rx="1" fill="#e5e7eb" />
                  <line x1={tx} y1={ty} x2={hx} y2={hy} stroke="#e5e7eb" strokeWidth={0.7} />
                  <path d={`M${hx - 2},${hy} q2,4 4,0`} fill="none" stroke="#e5e7eb" strokeWidth={0.9} />
                  {loaded && <rect x={hx - 8} y={hy + 2.5} width="16" height="5" rx="1" fill="#9cc3ff" stroke="#3b6fd8" strokeWidth={0.6} />}
                </g>
              );
            })()}
          </g>
          <g style={{ transition: 'opacity 500ms' }} opacity={i === 2 ? 1 : 0}>
            <g transform={small ? 'translate(-55,-112)' : 'translate(70,-130)'}>
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
