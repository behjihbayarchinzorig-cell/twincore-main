'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import BimViewer from '@/components/bim/BimViewer';
import { buildStyler } from '@/components/bim/stages';
import { LEVEL_COLOR, SENSORS, level, reading, type Level, type Sensor } from '@/lib/monitor';
import { usePersistentState } from '@/lib/persist';
import { BUILT } from '@/lib/twin';

// Shared clock for the live readings: ticks once a second (frozen for reduced motion).
function useClock() {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const start = performance.now();
    const id = setInterval(() => setT((performance.now() - start) / 1000), 1000);
    return () => clearInterval(id);
  }, []);
  return t;
}

const fmt = (s: Sensor, v: number) => (s.unit === '‰' ? v.toFixed(2) : Math.round(v).toString());

// Live sensors on the building under construction: pins on the 3D model and a list beside it.
export function LiveSensors() {
  const t = useTranslations('system.monitor');
  const now = useClock();
  const [sel, setSel] = usePersistentState<string | null>('monitor.sel', 'CR-01');
  const styler = useMemo(() => buildStyler(BUILT), []);
  const values = SENSORS.map((s) => {
    const v = reading(s, now);
    return { s, v, lv: level(s, v) };
  });
  const cur = values.find((x) => x.s.id === sel) ?? null;
  const markers = values.map(({ s, lv }) => ({ id: s.id, pos: s.pos, color: LEVEL_COLOR[lv], alert: lv !== 'ok' }));

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.5fr)]">
      <div>
        <ul className="border-t border-line" aria-live="polite">
          {values.map(({ s, v, lv }) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => setSel(s.id)}
                aria-pressed={sel === s.id}
                className={`grid w-full cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-line/60 px-2 py-2.5 text-left text-sm transition-colors ${
                  sel === s.id ? 'bg-surface' : 'hover:bg-surface/50'
                }`}
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: LEVEL_COLOR[lv] }} />
                <span>
                  <span className="font-mono text-xs text-mute">{s.id}</span> {t(`kind.${s.kind}`)}
                  <span className="ml-2 rounded border border-sky-400/40 px-1 font-mono text-[9px] tracking-wider text-sky-300">{t('sim.tag')}</span>
                </span>
                <span className="font-mono tabular-nums" style={{ color: lv === 'ok' ? undefined : LEVEL_COLOR[lv] }}>
                  {fmt(s, v)} <span className="text-xs text-mute">{s.unit}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>

        <p className="mt-3 text-xs text-mute">{t('pickHint')}</p>
      </div>

      <BimViewer
        className="h-[440px] lg:h-[560px]"
        cameraKey="monitor.cam"
        styler={styler}
        styleKey="monitor"
        visible={{ structure: true, facade: true, mep: false }}
        pickable={() => false}
        crane={BUILT}
        markers={markers}
        markerSel={sel}
        onMarker={setSel}
        markerCard={cur && <SensorCard s={cur.s} v={cur.v} lv={cur.lv} onClose={() => setSel(null)} />}
        labels
        plain
      />
    </div>
  );
}

// The callout on the model: what the sensor is, its reading right now, and where that sits against its limits.
function SensorCard({ s, v, lv, onClose }: { s: Sensor; v: number; lv: Level; onClose: () => void }) {
  const t = useTranslations('system.monitor');
  return (
    <div className="w-[160px] rounded-lg border bg-ink/92 p-2.5 text-sm sm:w-[260px] sm:p-4 shadow-2xl backdrop-blur-md" style={{ borderColor: `${LEVEL_COLOR[lv]}99` }}>
      <div className="flex items-start justify-between gap-3">
        <p className="leading-tight">
          <span className="font-mono text-xs text-mute">{s.id}</span>
          <span className="block text-fg">{t(`kind.${s.kind}`)}</span>
        </p>
        <button type="button" onClick={onClose} aria-label={t('close')} className="-mt-1 -mr-1 cursor-pointer rounded px-1.5 text-mute hover:text-fg">
          ×
        </button>
      </div>
      <p className="mt-1.5 flex items-baseline gap-1.5 sm:mt-2 sm:gap-2">
        <span className="font-mono text-xl tabular-nums sm:text-3xl" style={{ color: lv === 'ok' ? undefined : LEVEL_COLOR[lv] }}>
          {fmt(s, v)}
        </span>
        <span className="text-xs text-mute">{s.unit}</span>
        <span className="ml-auto rounded-full px-1.5 py-0.5 text-[10px] sm:px-2 sm:text-[11px]" style={{ background: `${LEVEL_COLOR[lv]}26`, color: LEVEL_COLOR[lv] }}>
          {t(`level.${lv}`)}
        </span>
      </p>
      <div className="hidden sm:block">
        <Gauge s={s} v={v} />
      </div>
      <p className="mt-2 hidden font-mono text-[11px] text-mute sm:block">{t('limits', { w: s.warn, a: s.alarm, u: s.unit })}</p>
      <p className="mt-2 hidden text-xs leading-relaxed text-mute sm:block">{t(`about.${s.kind}`)}</p>
    </div>
  );
}

function Gauge({ s, v }: { s: Sensor; v: number }) {
  const max = s.alarm * 1.25;
  const pct = (x: number) => `${Math.min(100, Math.max(0, (x / max) * 100))}%`;
  return (
    <div className="relative mt-4 h-2.5 rounded-full bg-[linear-gradient(90deg,#7fa36a_0%,#7fa36a_60%,#38bdf8_75%,#3b82f6_90%)] opacity-90">
      <span className="absolute -top-1 h-4.5 w-1 -translate-x-1/2 rounded-full bg-fg shadow transition-[left] duration-700" style={{ left: pct(v) }} />
    </div>
  );
}

// Alert feed: what the system flagged, newest first. Live sensor alarms join the top.
export function AlertFeed() {
  const t = useTranslations('system.monitor');
  const now = useClock();
  const live = SENSORS.map((s) => ({ s, v: reading(s, now) }))
    .map(({ s, v }) => ({ s, v, lv: level(s, v) as Level }))
    .filter((x) => x.lv !== 'ok');
  const log: { time: string; lv: Level; text: string }[] = [
    { time: '09:42', lv: 'warn', text: t('log.a') },
    { time: '08:15', lv: 'ok', text: t('log.b') },
    { time: t('yesterday'), lv: 'alarm', text: t('log.c') },
    { time: t('yesterday'), lv: 'ok', text: t('log.d') },
  ];
  return (
    <ul className="divide-y divide-line/60 rounded-lg border border-line bg-surface" aria-live="polite">
      {live.map(({ s, v, lv }) => (
        <li key={s.id} className="flex gap-4 px-5 py-3 text-sm">
          <span className="w-20 shrink-0 font-mono text-xs text-sky-300">{t('now')}</span>
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: LEVEL_COLOR[lv] }} />
          <span>
            {s.id} · {t(`kind.${s.kind}`)}: {fmt(s, v)} {s.unit} — {t(`level.${lv}`)}
          </span>
        </li>
      ))}
      {log.map((x, i) => (
        <li key={i} className="flex gap-4 px-5 py-3 text-sm">
          <span className="w-20 shrink-0 font-mono text-xs text-mute">{x.time}</span>
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: LEVEL_COLOR[x.lv] }} />
          <span className="text-fg/90">{x.text}</span>
        </li>
      ))}
    </ul>
  );
}
