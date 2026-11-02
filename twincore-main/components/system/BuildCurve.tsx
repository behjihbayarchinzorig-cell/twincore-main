'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import BimViewer from '@/components/bim/BimViewer';
import { buildPhase, phaseStyler } from '@/components/bim/stages';
import { usePersistentState } from '@/lib/persist';
import { FLOORS, STAGE_WEEKS, TODAY, WEEKS, actual, planned } from '@/lib/twin';

const SPEED = 0.55; // weeks per second while playing: a floor takes a few seconds, so each step can be followed

const VH = 280;
const L = 40;
const R = 16;
const T = 16;
const PB = 230; // plot bottom
const y = (p: number) => PB - (p / 100) * (PB - T);

// The chart is drawn at its real on-screen width, so labels stay a readable size on a phone.
function geometry(vw: number) {
  const x = (w: number) => L + (w / WEEKS) * (vw - L - R);
  const path = (f: (w: number) => number | null, to = WEEKS) =>
    Array.from({ length: to + 1 }, (_, w) => {
      const v = f(w);
      return v == null ? '' : `${w ? 'L' : 'M'}${x(w).toFixed(1)} ${y(v).toFixed(1)}`;
    }).join('');
  const ACTUAL = path(actual, TODAY);
  return { x, PLANNED: path(planned), ACTUAL, ACTUAL_AREA: `${ACTUAL}L${x(TODAY)} ${PB}L${x(0)} ${PB}Z` };
}

// Interactive S-curve linked to the 4D model: drag or use the arrow keys to move through the schedule, or press play,
// and the building beside it goes up phase by phase (see phaseStyler): the foundation, the frame floor by floor,
// the outer walls, the windows. Between weeks the chart glides; the model changes a floor at a time. When the
// building is finished the drawing labels (level tags, grid bubbles) go, leaving the building itself.
export default function BuildCurve({ stages }: { stages: string[] }) {
  const t = useTranslations('system.build');
  const [week, setWeek] = usePersistentState('build.week', TODAY);
  const [pos, setPos] = useState(week); // the week shown, fractional while moving or playing
  const [playing, setPlaying] = useState(false);
  const posRef = useRef(pos);
  posRef.current = pos;

  // glide to a picked week
  useEffect(() => {
    if (playing) return;
    const from = posRef.current;
    const span = Math.abs(week - from);
    if (span < 0.001) return;
    const dur = Math.min(3200, 500 + span * 320);
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / dur);
      const e = 1 - (1 - k) ** 3;
      setPos(from + (week - from) * e);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only a new target starts a glide
  }, [week, playing]);
  // play through the schedule
  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const prev = posRef.current;
      const next = Math.min(WEEKS, prev + ((now - last) / 1000) * SPEED);
      last = now;
      posRef.current = next;
      setPos(next);
      if (Math.floor(next) !== Math.floor(prev)) setWeek(Math.floor(next));
      if (next >= WEEKS) {
        setWeek(WEEKS);
        setPlaying(false);
      } else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, setWeek]);
  const play = () => {
    if (playing) return setPlaying(false);
    if (posRef.current >= WEEKS - 0.01) {
      posRef.current = 0;
      setPos(0);
      setWeek(0);
    }
    setPlaying(true);
  };

  const progress = actual(pos) ?? planned(pos);
  const build = buildPhase(progress);
  const styleKey = `p:${build.key}`;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- the key covers every change that shows
  const styler = useMemo(() => phaseStyler(build), [styleKey]);
  const done = build.phase === 'done';
  const crane = build.phase === 'frame' || build.phase === 'envelope' ? Math.min(FLOORS, Math.max(1, build.frame)) : null;
  const ref = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  const [VW, setVW] = useState(640);
  const { x, PLANNED, ACTUAL, ACTUAL_AREA } = useMemo(() => geometry(VW), [VW]);
  const narrow = VW < 480;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setVW(Math.round(Math.min(900, Math.max(300, e.contentRect.width)))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fromPointer = (e: PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * VW;
    setPlaying(false);
    setWeek(Math.round(Math.min(WEEKS, Math.max(0, ((px - L) / (VW - L - R)) * WEEKS))));
  };
  const onKey = (e: KeyboardEvent) => {
    const d = { ArrowRight: 1, ArrowLeft: -1, PageUp: 5, PageDown: -5 }[e.key];
    if (d) {
      e.preventDefault();
      setPlaying(false);
      setWeek((w) => Math.min(WEEKS, Math.max(0, w + d)));
    } else if (e.key === 'Home') setWeek(0);
    else if (e.key === 'End') setWeek(WEEKS);
  };

  const p = planned(pos);
  const a = actual(pos);
  const diff = a == null ? null : a - p;
  const stageIdx = STAGE_WEEKS.findIndex(([s, e]) => pos >= s && pos < e);
  const stage = stages[stageIdx === -1 ? stages.length - 1 : stageIdx];
  const status = diff == null ? t('future') : Math.abs(diff) < 1 ? t('onTrack') : diff > 0 ? t('ahead') : t('behind');

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <div className="grid gap-6 sm:grid-cols-[1fr_220px] lg:grid-cols-1">
      <svg
        ref={ref}
        viewBox={`0 0 ${VW} ${VH}`}
        className="w-full cursor-ew-resize touch-none select-none"
        role="slider"
        tabIndex={0}
        aria-label={t('hint')}
        aria-valuemin={0}
        aria-valuemax={WEEKS}
        aria-valuenow={week}
        aria-valuetext={`${t('week', { n: week })}: ${t('planned')} ${p.toFixed(0)}%${a != null ? `, ${t('actual')} ${a.toFixed(0)}%` : ''}`}
        onKeyDown={onKey}
        onPointerDown={(e) => {
          dragging.current = true;
          (e.target as Element).setPointerCapture?.(e.pointerId);
          fromPointer(e);
        }}
        onPointerMove={(e) => dragging.current && fromPointer(e)}
        onPointerUp={() => (dragging.current = false)}
      >
        <g fontFamily="var(--font-mono)" fontSize="10" fill="#8ea6cc">
          {[0, 25, 50, 75, 100].map((v) => (
            <g key={v}>
              <line x1={L} x2={VW - R} y1={y(v)} y2={y(v)} stroke="#1e2d4a" strokeDasharray={v ? '2 4' : undefined} />
              <text x={L - 8} y={y(v) + 3} textAnchor="end">{v}%</text>
            </g>
          ))}
        </g>

        {/* Stage bands under the axis */}
        {STAGE_WEEKS.map(([s, e], i) => (
          <g key={i}>
            <rect x={x(s) + 1} y={PB + 10} width={x(e) - x(s) - 2} height="6" rx="1" fill={i === stageIdx ? '#3b82f6' : '#1e2d4a'} className="transition-[fill]" />
            <text
              x={narrow && i === STAGE_WEEKS.length - 1 ? VW - R : narrow && i === 0 ? L : (x(s) + x(e)) / 2}
              y={PB + 32}
              textAnchor={narrow && i === STAGE_WEEKS.length - 1 ? 'end' : narrow && i === 0 ? 'start' : 'middle'}
              fontSize="10" fontFamily="var(--font-mono)" fill={i === stageIdx ? '#eaf1ff' : '#8ea6cc'} display={narrow && i !== stageIdx ? 'none' : undefined}>
              {!narrow && stages[i].length > 14 ? `${stages[i].slice(0, 13)}…` : stages[i]}
            </text>
          </g>
        ))}

        <path d={ACTUAL_AREA} fill="#3b82f6" fillOpacity=".12" />
        <path d={PLANNED} fill="none" stroke="#8ea6cc" strokeWidth="2" strokeDasharray="5 4" />
        <path d={ACTUAL} fill="none" stroke="#3b82f6" strokeWidth="2.5" />

        {/* Today */}
        <line x1={x(TODAY)} x2={x(TODAY)} y1={T} y2={PB} stroke="#93c5fd" strokeOpacity=".5" />
        <text x={x(TODAY) + 4} y={T + 10} fontSize="10" fontFamily="var(--font-mono)" fill="#93c5fd">{t('today')}</text>

        {/* Scrubber */}
        <line x1={x(pos)} x2={x(pos)} y1={T} y2={PB} stroke="#eaf1ff" strokeWidth="1" />
        <circle cx={x(pos)} cy={y(p)} r="4.5" fill="#060b18" stroke="#8ea6cc" strokeWidth="2" />
        {a != null && <circle cx={x(pos)} cy={y(a)} r="5" fill="#3b82f6" />}
      </svg>

      <dl className="self-start border-t border-line font-mono text-sm" aria-live="polite">
        <div className="py-3">
          <dt className="text-lg text-fg">{t('week', { n: Math.floor(pos) })}</dt>
          <dd className="mt-0.5 text-xs text-mute">{t('stage')}: {stage}</dd>
        </div>
        <Row k={t('planned')} v={`${p.toFixed(1)}%`} swatch="border-t-2 border-dashed border-mute" />
        <Row k={t('actual')} v={a == null ? '—' : `${a.toFixed(1)}%`} swatch="border-t-[3px] border-accent" />
        <Row k={t('variance')} v={diff == null ? '—' : `${diff > 0 ? '+' : ''}${diff.toFixed(1)}%`} accent={diff != null && diff < -1} />
        <p className={`border-t border-line/60 py-3 font-sans text-sm ${diff != null && diff < -1 ? 'text-accent' : 'text-mute'}`}>{status}</p>
        <p className="font-sans text-xs text-mute">{t('hint')}</p>
      </dl>
      </div>

      <figure>
        <BimViewer
          className="h-[420px] lg:h-[520px]"
          cameraKey="build.cam"
          styler={styler}
          styleKey={styleKey}
          crane={crane}
          labels={!done}
        >
          {/* what is happening on site right now */}
          <div className="pointer-events-none absolute top-3 left-3 max-w-[calc(100%-1.5rem)] rounded-md bg-ink/80 px-3 py-2 backdrop-blur-sm">
            <p className="font-mono text-[11px] text-accent-hi">
              {t('week', { n: Math.floor(pos) })} · {Math.round(progress)}%
            </p>
            <p key={build.phase} className="animate-fade-in mt-0.5 text-sm text-fg">
              {t(`steps.${build.phase}`, { n: build.floor })}
            </p>
          </div>
        </BimViewer>
        <figcaption className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-mute">
          <button
            type="button"
            onClick={play}
            aria-label={playing ? t('pause') : t('play')}
            className={`inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm transition-colors sm:h-9 ${playing ? 'border-line text-fg' : 'border-accent bg-accent/15 text-accent-hi'}`}
          >
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
              {playing ? <path d="M4 3h3v10H4zM9 3h3v10H9z" /> : <path d="M5 3l8 5-8 5z" />}
            </svg>
            {playing ? t('pause') : t('play')}
          </button>
          {/* the order of the work */}
          <span className="text-mute">{t('order')}</span>
        </figcaption>
      </figure>
    </div>
  );
}

function Row({ k, v, swatch, accent }: { k: string; v: string; swatch?: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-line/60 py-2">
      <dt className="flex items-center gap-2 text-mute">
        {swatch && <span className={`inline-block w-4 ${swatch}`} />}
        {k}
      </dt>
      <dd className={accent ? 'text-accent' : 'text-fg'}>{v}</dd>
    </div>
  );
}
