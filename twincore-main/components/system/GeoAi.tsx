'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

// GeoAI: object detection on an aerial tile. A stylised city block — streets, roofs, a park — is scanned top to
// bottom; detections appear as the scan passes. Two views: boxes (with confidence) and segmentation. Trees and
// cars can be taken out of the photo and put back, and the counts follow. On a phone the photo sits right under the
// description, and only the picked type carries its confidence tags so the small picture stays readable.

type Cls = 'building' | 'car' | 'tree' | 'pool';
type Det = { c: Cls; x: number; y: number; w: number; h: number; conf: number; r: number }; // r: removal order
type Adjustable = 'tree' | 'car';
const CLASSES: Cls[] = ['building', 'car', 'tree', 'pool'];
const COLOR: Record<Cls, string> = { building: '#60a5fa', car: '#c4b5fd', tree: '#9fbf8a', pool: '#6ba7c9' };
const W = 600;
const H = 380;
const ROAD = 22;
const ROADS_H = [130, 270]; // centre lines
const ROADS_V = [210, 420];

// deterministic "noise" so the scene is the same on every render
let seed = 11;
const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
const conf = (lo: number) => Math.round((lo + rnd() * (0.99 - lo)) * 100) / 100;
// the park's pond (with its stone rim) and the path that leads to it; trees keep clear of both
const POND = { x: 344, y: 208, w: 52, h: 34 };
const nearPond = (x: number, y: number, w: number, h: number) => x < POND.x + POND.w + 7 && x + w > POND.x - 7 && y < POND.y + POND.h + 7 && y + h > POND.y - 7;

const BUILDINGS: [number, number, number, number][] = [
  [18, 16, 110, 72], [140, 22, 50, 88],
  [234, 14, 72, 96], [318, 30, 78, 64],
  [446, 18, 136, 54], [452, 84, 60, 30],
  [16, 156, 70, 88], [98, 166, 92, 60],
  [446, 154, 58, 96], [516, 160, 70, 52],
  [20, 296, 120, 64], [150, 290, 44, 76],
  [234, 296, 160, 48],
  [446, 300, 64, 64],
];
const DETS: Det[] = (() => {
  const out: Omit<Det, 'r'>[] = BUILDINGS.map(([x, y, w, h]) => ({ c: 'building' as const, x, y, w, h, conf: conf(0.9) }));
  // cars in lanes: horizontal roads (two lanes each), vertical roads
  for (const cy of ROADS_H)
    for (const [lane, n] of [[-5, 5], [5, 4]] as const)
      for (let i = 0; i < n; i++) {
        const x = 20 + ((i * 131 + cy * 3 + (lane > 0 ? 60 : 0)) % 560);
        if (ROADS_V.some((v) => Math.abs(x + 8 - v) < 20)) continue; // keep junctions clear
        out.push({ c: 'car', x, y: cy + lane - 4, w: 16, h: 8, conf: conf(0.78) });
      }
  for (const cx of ROADS_V)
    for (const [lane, n] of [[-5, 3], [5, 3]] as const)
      for (let i = 0; i < n; i++) {
        const y = 12 + ((i * 113 + cx + (lane > 0 ? 50 : 0)) % 350);
        if (ROADS_H.some((h) => Math.abs(y + 8 - h) < 20)) continue;
        out.push({ c: 'car', x: cx + lane - 4, y, w: 8, h: 16, conf: conf(0.78) });
      }
  // a park in the middle block, and street trees along the kerbs
  for (let i = 0; i < 14; i++) {
    const x = 234 + (i % 5) * 34 + rnd() * 10;
    const y = 152 + Math.floor(i / 5) * 34 + rnd() * 8;
    if (nearPond(x, y, 18, 18)) continue; // the pond corner
    out.push({ c: 'tree', x, y, w: 18, h: 18, conf: conf(0.82) });
  }
  for (let i = 0; i < 5; i++) out.push({ c: 'tree', x: 18 + i * 24, y: 97, w: 12, h: 12, conf: conf(0.8) });
  for (let i = 0; i < 6; i++) out.push({ c: 'tree', x: 520 + (i % 3) * 24, y: 222 + Math.floor(i / 3) * 18, w: 12, h: 12, conf: conf(0.8) });
  out.push({ c: 'pool', ...POND, conf: 0.97 });
  out.push({ c: 'pool', x: 524, y: 316, w: 40, h: 22, conf: 0.94 });
  // a fixed, scattered order for taking trees and cars away, so removing some thins the whole photo evenly
  return out.map((d) => ({ ...d, r: rnd() }));
})();
const RANK = new Map<Det, number>();
for (const c of ['tree', 'car'] as const) DETS.filter((d) => d.c === c).sort((a, b) => a.r - b.r).forEach((d, k) => RANK.set(d, k));
const TOTAL = { tree: DETS.filter((d) => d.c === 'tree').length, car: DETS.filter((d) => d.c === 'car').length };
const CAR_PAINT = ['#e9e2dc', '#2f2826', '#9fbcc8', '#c4473a', '#d6cfc9'];

export default function GeoAi() {
  const t = useTranslations('system.twin.geoai');
  const box = useRef<HTMLDivElement>(null);
  const [scan, setScan] = useState(1);
  const [mode, setMode] = useState<'boxes' | 'segment'>('boxes');
  const [focus, setFocus] = useState<Cls | null>(null);
  const [off, setOff] = useState<Cls[]>([]);
  const [keep, setKeep] = useState<Record<Adjustable, number>>(TOTAL); // how many trees and cars are in the photo
  const [small, setSmall] = useState(false);
  useEffect(() => {
    const mq = matchMedia('(max-width: 639px)');
    const on = () => setSmall(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  // run once on first view (results straight away for reduced motion)
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setScan(0);
        io.disconnect();
      }
    }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (scan >= 1) return;
    const id = requestAnimationFrame(() => setScan((v) => Math.min(1, v + 0.008)));
    return () => cancelAnimationFrame(id);
  }, [scan]);

  const present = DETS.filter((d) => (d.c === 'tree' || d.c === 'car' ? RANK.get(d)! < keep[d.c] : true));
  const found = present.filter((d) => (d.y + d.h) / H <= scan);
  const shown = found.filter((d) => !off.includes(d.c));
  const count = (c: Cls) => found.filter((d) => d.c === c).length;
  const total = (c: Cls) => present.filter((d) => d.c === c).length;
  const avg = found.length ? found.reduce((a, d) => a + d.conf, 0) / found.length : 0;
  const toggle = (c: Cls) => setOff((o) => (o.includes(c) ? o.filter((x) => x !== c) : [...o, c]));
  const scanning = scan < 1;

  return (
    <div ref={box} className="grid items-start gap-x-8 gap-y-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)] lg:grid-rows-[auto_1fr]">
      <p className="text-mute lg:col-start-1 lg:row-start-1">{t('desc')}</p>
      <div className="lg:col-start-1 lg:row-start-2">
        <ul className="grid grid-cols-2 gap-2 lg:grid-cols-1">
          {CLASSES.map((c) => {
            const hidden = off.includes(c);
            return (
              <li key={c}>
                <button
                  type="button"
                  onClick={() => toggle(c)}
                  onMouseEnter={() => setFocus(c)}
                  onMouseLeave={() => setFocus(null)}
                  onFocus={() => setFocus(c)}
                  onBlur={() => setFocus(null)}
                  aria-pressed={!hidden}
                  className={`w-full cursor-pointer rounded-md border px-3 py-2.5 text-left max-lg:min-h-12 transition-[border-color,opacity] ${
                    hidden ? 'border-line/50 opacity-45' : focus === c ? 'border-mute' : 'border-line'
                  }`}
                >
                  <span className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex items-center gap-2.5">
                      <span className="h-3 w-3 rounded-sm" style={{ background: COLOR[c] }} />
                      {t(c)}
                    </span>
                    <span className="font-mono text-lg tabular-nums">{count(c)}</span>
                  </span>
                  <span className="mt-2 block h-1 overflow-hidden rounded-full bg-line">
                    <span className="block h-full rounded-full transition-[width] duration-200" style={{ width: `${total(c) ? (count(c) / total(c)) * 100 : 0}%`, background: COLOR[c] }} />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {/* take trees and cars out of the photo, or put them back */}
        <div className="mt-5 grid gap-4 rounded-md border border-line p-3 text-sm sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          {(['tree', 'car'] as const).map((c) => (
            <label key={c} className="block">
              <span className="flex justify-between text-mute">
                {t(`inPhoto.${c}`)}
                <span className="text-fg tabular-nums">
                  {keep[c]} / {TOTAL[c]}
                </span>
              </span>
              <input
                type="range"
                min={0}
                max={TOTAL[c]}
                step={1}
                value={keep[c]}
                onChange={(e) => setKeep((k) => ({ ...k, [c]: Number(e.target.value) }))}
                className="mt-2 w-full accent-accent"
              />
            </label>
          ))}
        </div>

        <dl className="mt-5 grid grid-cols-3 gap-2 text-center sm:gap-3">
          {[
            [t('stat.objects'), String(found.length)],
            [t('stat.conf'), found.length ? `${Math.round(avg * 100)}%` : '—'],
            [t('stat.time'), `${(scan * 1.6).toFixed(1)} ${t('sec')}`],
          ].map(([k, v]) => (
            <div key={k} className="rounded-md bg-surface px-2 py-3">
              <dd className="font-mono text-lg tabular-nums">{v}</dd>
              <dt className="mt-0.5 text-[11px] text-mute">{k}</dt>
            </div>
          ))}
        </dl>

        <button
          type="button"
          onClick={() => setScan(0)}
          disabled={scanning}
          className="mt-5 cursor-pointer rounded-md bg-grad px-5 py-2.5 font-medium text-white transition-colors hover:brightness-110 disabled:cursor-default disabled:opacity-60"
        >
          {scanning ? t('running') : t('run')}
        </button>
      </div>

      <figure className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div role="radiogroup" className="flex gap-1 rounded-full border border-line p-1">
            {(['boxes', 'segment'] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={mode === m}
                onClick={() => setMode(m)}
                className={`cursor-pointer rounded-full px-3.5 py-1.5 text-sm transition-colors ${mode === m ? 'bg-grad text-white' : 'text-mute hover:text-fg'}`}
              >
                {t(`mode.${m}`)}
              </button>
            ))}
          </div>
          <span className="font-mono text-[11px] text-mute">{t('tile')}</span>
        </div>

        <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-hidden rounded-lg border border-line" role="img" aria-label={t('desc')}>
          <defs>
            <linearGradient id="geo-scan" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#3b82f6" stopOpacity="0" />
              <stop offset="1" stopColor="#3b82f6" stopOpacity=".28" />
            </linearGradient>
            <pattern id="geo-grass" width="6" height="6" patternUnits="userSpaceOnUse">
              <rect width="6" height="6" fill="#47513a" />
              <circle cx="2" cy="2" r=".8" fill="#525d42" />
            </pattern>
            <clipPath id="geo-done">
              <rect width={W} height={scan * H} />
            </clipPath>
          </defs>

          {/* ground: lots and pavements */}
          <rect width={W} height={H} fill="#4a4740" />
          <rect x="222" y="142" width="186" height="116" fill="url(#geo-grass)" />
          {/* the path ends at the pond's rim instead of running into the water */}
          <path d={`M226 252 C 260 232 300 246 ${POND.x - 4} ${POND.y + POND.h / 2}`} stroke="#6b6458" strokeWidth="4" fill="none" />
          {/* streets with kerbs and dashed centre lines */}
          {ROADS_H.map((y) => (
            <g key={`h${y}`}>
              <rect x="0" y={y - ROAD / 2 - 3} width={W} height={ROAD + 6} fill="#5d5850" />
              <rect x="0" y={y - ROAD / 2} width={W} height={ROAD} fill="#34312e" />
              <line x1="0" x2={W} y1={y} y2={y} stroke="#d8cfa0" strokeOpacity=".55" strokeWidth="1" strokeDasharray="8 8" />
            </g>
          ))}
          {ROADS_V.map((x) => (
            <g key={`v${x}`}>
              <rect x={x - ROAD / 2 - 3} y="0" width={ROAD + 6} height={H} fill="#5d5850" />
              <rect x={x - ROAD / 2} y="0" width={ROAD} height={H} fill="#34312e" />
              <line x1={x} x2={x} y1="0" y2={H} stroke="#d8cfa0" strokeOpacity=".55" strokeWidth="1" strokeDasharray="8 8" />
            </g>
          ))}
          {ROADS_H.flatMap((y) => ROADS_V.map((x) => <rect key={`j${x}${y}`} x={x - ROAD / 2} y={y - ROAD / 2} width={ROAD} height={ROAD} fill="#34312e" />))}

          {/* objects, drawn as seen from above with a soft shadow to the south-east */}
          {present.map((d) =>
            d.c === 'building' ? (
              <g key={DETS.indexOf(d)}>
                <rect x={d.x + 5} y={d.y + 5} width={d.w} height={d.h} fill="#000" opacity=".28" />
                <rect x={d.x} y={d.y} width={d.w} height={d.h} fill={['#8a7f77', '#9a8f86', '#776c66'][DETS.indexOf(d) % 3]} />
                <rect x={d.x + 4} y={d.y + 4} width={d.w - 8} height={d.h - 8} fill="none" stroke="#fff" strokeOpacity=".1" />
                <rect x={d.x + d.w * 0.6} y={d.y + 6} width={Math.min(14, d.w * 0.2)} height="8" fill="#5e5550" />
              </g>
            ) : d.c === 'tree' ? (
              <g key={DETS.indexOf(d)}>
                <circle cx={d.x + d.w / 2 + 2} cy={d.y + d.h / 2 + 2} r={d.w / 2} fill="#000" opacity=".25" />
                <circle cx={d.x + d.w / 2} cy={d.y + d.h / 2} r={d.w / 2} fill="#56713f" />
                <circle cx={d.x + d.w / 2 - d.w * 0.12} cy={d.y + d.h / 2 - d.w * 0.12} r={d.w / 4} fill="#6b8a4f" />
              </g>
            ) : d.c === 'car' ? (
              <g key={DETS.indexOf(d)}>
                <rect x={d.x} y={d.y} width={d.w} height={d.h} rx="2" fill={CAR_PAINT[DETS.indexOf(d) % CAR_PAINT.length]} />
                <rect x={d.x + (d.w > d.h ? 4 : 1.5)} y={d.y + (d.w > d.h ? 1.5 : 4)} width={d.w > d.h ? 6 : d.w - 3} height={d.w > d.h ? d.h - 3 : 6} rx="1" fill="#000" opacity=".35" />
              </g>
            ) : (
              <g key={DETS.indexOf(d)}>
                <rect x={d.x - 3} y={d.y - 3} width={d.w + 6} height={d.h + 6} rx="7" fill="#a69a8e" />
                <rect x={d.x} y={d.y} width={d.w} height={d.h} rx="5" fill="#5fa6cc" />
                <path d={`M${d.x + 6} ${d.y + d.h * 0.4} q 8 -4 16 0 t 16 0`} stroke="#fff" strokeOpacity=".35" fill="none" />
              </g>
            ),
          )}

          {/* model output, only where the scan has passed */}
          <g clipPath="url(#geo-done)">
            {mode === 'segment' ? (
              <g>
                {!off.includes('building') && (
                  <g opacity=".14">
                    {ROADS_H.map((y) => <rect key={y} x="0" y={y - ROAD / 2} width={W} height={ROAD} fill="#9fbcc8" />)}
                    {ROADS_V.map((x) => <rect key={x} x={x - ROAD / 2} y="0" width={ROAD} height={H} fill="#9fbcc8" />)}
                  </g>
                )}
                {shown.map((d, i) =>
                  d.c === 'tree' ? (
                    <circle key={i} cx={d.x + d.w / 2} cy={d.y + d.h / 2} r={d.w / 2 + 1} fill={COLOR.tree} opacity={focus && focus !== d.c ? 0.2 : 0.6} />
                  ) : (
                    <rect key={i} x={d.x} y={d.y} width={d.w} height={d.h} rx={d.c === 'building' ? 0 : 3} fill={COLOR[d.c]} opacity={focus && focus !== d.c ? 0.2 : 0.55} />
                  ),
                )}
              </g>
            ) : (
              shown.map((d, i) => {
                const pad = d.c === 'car' ? 2 : 3;
                const x = d.x - pad;
                const y = d.y - pad;
                const w = d.w + pad * 2;
                const h = d.h + pad * 2;
                const k = Math.min(10, w / 3, h / 3);
                const dim = focus && focus !== d.c;
                // on a phone only the picked type (or, with none picked, the pools) carries confidence tags
                const label = focus === d.c || (small ? !focus && d.c === 'pool' : d.c === 'building' || d.c === 'pool');
                return (
                  <g key={i} opacity={dim ? 0.2 : 1} className="transition-opacity">
                    <rect x={x} y={y} width={w} height={h} fill={COLOR[d.c]} opacity=".08" />
                    <path
                      d={`M${x} ${y + k}V${y}H${x + k}M${x + w - k} ${y}H${x + w}V${y + k}M${x + w} ${y + h - k}V${y + h}H${x + w - k}M${x + k} ${y + h}H${x}V${y + h - k}`}
                      stroke={COLOR[d.c]}
                      strokeWidth="1.8"
                      fill="none"
                    />
                    {label && (
                      <g>
                        <rect x={x} y={y - 12} width="30" height="11" rx="2" fill={COLOR[d.c]} />
                        <text x={x + 3} y={y - 3.5} fontSize="8.5" fontFamily="ui-monospace, monospace" fill="#060b18">
                          {d.conf.toFixed(2)}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })
            )}
          </g>

          {/* the scan */}
          {scanning && (
            <g>
              <rect x="0" y={Math.max(0, scan * H - 60)} width={W} height={Math.min(60, scan * H)} fill="url(#geo-scan)" />
              <line x1="0" x2={W} y1={scan * H} y2={scan * H} stroke="#3b82f6" strokeWidth="2" />
            </g>
          )}
        </svg>
        <figcaption className="mt-2 text-xs text-mute">{small ? t('captionTouch') : t('caption')}</figcaption>
      </figure>
    </div>
  );
}
