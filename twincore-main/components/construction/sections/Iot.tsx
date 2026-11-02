'use client';

import { useEffect, useMemo, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { LEVEL_COLOR, SENSORS, level, reading, type Level, type Sensor } from '@/lib/monitor';
import { useText, useWords } from '@/lib/construction/text';
import { LineChart } from '../Charts';
import { Btn, Field, inputCls, Kpi, PageHead, Panel, Pill, Table, type Tone } from '../Kit';
import { useStore } from '../Store';
import WorkspaceMap from '../WorkspaceMap';

// IoT monitoring. There is no real sensor feed in this project: the readings come from the deterministic simulation in
// lib/monitor.ts, and the page says so everywhere. What a real feed would have to provide is written out below as the
// integration boundary — nothing here pretends to be connected.

const W = {
  mn: {
    lead: 'Мэдрэгч бүрийн байршил, сүүлийн заалт, хязгаар, сэрэмжлүүлэг — бүгд симуляц.',
    sim: 'Симуляц — бодит төхөөрөмжид холбогдоогүй',
    simBody: 'Заалтууд нь системийн ажиллагааг харуулах зорилгоор тооцоогоор үүсгэгдэнэ. Цагийн тэмдэг нь таны хөтчийн цаг.',
    boundary: 'Бодит холболтод шаардлагатай',
    boundaryBody: 'Бодит мэдрэгчийн урсгал мэдрэгч бүрийн хувьд дараах талбаруудыг өгөх ёстой: мэдрэгчийн ID, хэмжсэн цаг (ISO 8601), утга, хэмжих нэгж. Эдгээрийг серверийн API-аар хүлээн авч, сүүлийн заалтын шинэлэгийг шалгана.',
    sensors: 'Мэдрэгчүүд',
    id: 'ID',
    type: 'Төрөл',
    link: 'Багц / объект',
    value: 'Сүүлийн заалт',
    time: 'Цаг (симуляц)',
    conn: 'Холболт',
    limits: 'Хязгаар (анхаар / аюул)',
    level: 'Түвшин',
    alerts: 'Хязгаар хэтэрсэн',
    noAlerts: 'Одоогоор хязгаар хэтэрсэн заалт алга.',
    history: 'Сүүлийн 30 минут',
    thresholds: 'Хязгаар тохируулах',
    thresholdsNote: 'Зөвхөн энэ хуудсанд, туршилтын тохиргоо — хадгалагдахгүй.',
    warn: 'Анхааруулга',
    alarm: 'Аюултай',
    badLimits: 'Анхааруулгын хязгаар аюулын хязгаараас бага байх ёстой',
    apply: 'Хэрэглэх',
    restore: 'Анхны утга',
    twin: '3D BIM загвар дээр харах',
    kpiTotal: 'Мэдрэгч',
    kpiWarn: 'Анхааруулга',
    kpiAlarm: 'Аюултай',
    kpiMode: 'Горим',
    lv: { ok: 'Хэвийн', warn: 'Анхааруулга', alarm: 'Аюултай' } as Record<Level, string>,
    kind: { crane: 'Кран ачаалал', concrete: 'Бетоны температур', settlement: 'Суурийн суулт', tilt: 'Хазайлт', dust: 'Тоос (PM10)', noise: 'Дуу чимээ' } as Record<Sensor['kind'], string>,
    minutes: 'минут',
  },
  en: {
    lead: 'Where each sensor is, its latest reading, its limits and its alerts — all simulated.',
    sim: 'Simulation — not connected to real devices',
    simBody: 'Readings are generated to show how the system works. Timestamps are your browser’s clock.',
    boundary: 'What a real connection needs',
    boundaryBody: 'A real sensor feed must provide, for every sensor: the sensor ID, the measurement time (ISO 8601), the value and its unit. These are received through a server API, which also checks how fresh the latest reading is.',
    sensors: 'Sensors',
    id: 'ID',
    type: 'Type',
    link: 'Package / asset',
    value: 'Latest reading',
    time: 'Time (simulated)',
    conn: 'Connection',
    limits: 'Limits (warn / alarm)',
    level: 'Level',
    alerts: 'Over the limit',
    noAlerts: 'No reading is over its limit right now.',
    history: 'Last 30 minutes',
    thresholds: 'Adjust limits',
    thresholdsNote: 'This page only, a trial setting — not saved.',
    warn: 'Warning',
    alarm: 'Alarm',
    badLimits: 'The warning limit must be below the alarm limit',
    apply: 'Apply',
    restore: 'Restore',
    twin: 'View on the 3D BIM model',
    kpiTotal: 'Sensors',
    kpiWarn: 'Warnings',
    kpiAlarm: 'Alarms',
    kpiMode: 'Mode',
    lv: { ok: 'Normal', warn: 'Warning', alarm: 'Alarm' },
    kind: { crane: 'Crane load', concrete: 'Concrete temperature', settlement: 'Settlement', tilt: 'Tilt', dust: 'Dust (PM10)', noise: 'Noise' },
    minutes: 'min',
  },
};

const LV_TONE: Record<Level, Tone> = { ok: 'good', warn: 'warn', alarm: 'bad' };
const fmt = (s: Sensor, v: number) => (s.unit === '‰' ? v.toFixed(2) : Math.round(v).toString());

// simulated seconds since the page opened (frozen for reduced motion)
function useClock() {
  const [t, setT] = useState(600);
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const start = performance.now();
    const id = setInterval(() => setT(600 + (performance.now() - start) / 1000), 2000);
    return () => clearInterval(id);
  }, []);
  return t;
}

export default function Iot() {
  const t = useText();
  const w = useWords(W);
  const { data } = useStore();
  const now = useClock();
  const [sel, setSel] = useState<string>(data.sensors[0]?.sensor ?? 'CR-01');
  // local trial limits per sensor (never saved)
  const [limits, setLimits] = useState<Record<string, { warn: number; alarm: number }>>({});
  const [draft, setDraft] = useState<{ warn: string; alarm: string } | null>(null);
  const clock = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const rows = useMemo(
    () =>
      data.sensors
        .map((link) => {
          const base = SENSORS.find((s) => s.id === link.sensor);
          if (!base) return null;
          const s: Sensor = { ...base, ...(limits[base.id] ?? {}) };
          const v = reading(s, now);
          return { link, s, v, lv: level(s, v) };
        })
        .filter((x): x is NonNullable<typeof x> => x != null),
    [data.sensors, limits, now],
  );
  const cur = rows.find((r) => r.s.id === sel) ?? rows[0];
  const pkgName = (id: string) => data.packages.find((p) => p.id === id)?.name ?? id;

  // the last 30 simulated minutes, a point every 30 s
  const hist = useMemo(() => {
    if (!cur) return { labels: [] as string[], values: [] as number[] };
    const n = 60;
    const values = Array.from({ length: n + 1 }, (_, k) => reading(cur.s, now - (n - k) * 30));
    const labels = Array.from({ length: n + 1 }, (_, k) => `−${((n - k) * 30) / 60}`);
    return { labels, values };
  }, [cur, now]);

  const alerts = rows.filter((r) => r.lv !== 'ok');
  const startEdit = () => cur && setDraft({ warn: String(cur.s.warn), alarm: String(cur.s.alarm) });
  const draftBad = draft != null && !(Number(draft.warn) < Number(draft.alarm));

  return (
    <div className="space-y-6">
      <PageHead title={t.section.iot} lead={w.lead} />

      <div role="note" className="rounded-2xl border border-sky-400/40 bg-sky-400/[0.07] px-4 py-3">
        <p className="font-medium text-sky-200">{w.sim}</p>
        <p className="mt-1 text-sm text-fg/80">{w.simBody}</p>
        <details className="mt-2 text-sm">
          <summary className="cursor-pointer text-xs text-sky-300">{w.boundary}</summary>
          <p className="mt-1 text-xs text-fg/75">{w.boundaryBody}</p>
          <pre className="mt-2 overflow-x-auto rounded-lg border border-line bg-ink p-2 font-mono text-[11px] text-mute">{`{ "sensor": "CR-01", "time": "2026-10-16T09:42:00+08:00", "value": 71.4, "unit": "%" }`}</pre>
        </details>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label={w.kpiTotal} value={rows.length} />
        <Kpi label={w.kpiWarn} value={rows.filter((r) => r.lv === 'warn').length} tone={rows.some((r) => r.lv === 'warn') ? 'warn' : 'neutral'} />
        <Kpi label={w.kpiAlarm} value={rows.filter((r) => r.lv === 'alarm').length} tone={rows.some((r) => r.lv === 'alarm') ? 'bad' : 'neutral'} />
        <Kpi label={w.kpiMode} value="SIM" sub={w.sim} tone="warn" />
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Panel title={w.sensors}>
          <Table head={[w.id, w.type, w.link, w.value, w.time, w.conn, w.limits, w.level]} empty={!rows.length}>
            {rows.map(({ link, s, v, lv }) => (
              <tr key={s.id} onClick={() => setSel(s.id)} className={`cursor-pointer ${s.id === cur?.s.id ? 'bg-accent/[0.07]' : 'hover:bg-surface/60'}`}>
                <td className="px-2 py-2 font-mono text-xs">
                  <button type="button" onClick={() => setSel(s.id)} className="cursor-pointer text-left hover:text-accent-hi" aria-pressed={s.id === cur?.s.id}>
                    {s.id}
                  </button>
                </td>
                <td className="px-2 py-2">{w.kind[s.kind]}</td>
                <td className="px-2 py-2 text-xs text-mute">
                  {link.pkg} · {link.asset}
                </td>
                <td className="px-2 py-2 font-mono tabular-nums" style={{ color: lv === 'ok' ? undefined : LEVEL_COLOR[lv] }}>
                  {fmt(s, v)} <span className="text-xs text-mute">{s.unit}</span>
                </td>
                <td className="px-2 py-2 font-mono text-xs text-mute tabular-nums">{clock}</td>
                <td className="px-2 py-2">
                  <Pill tone="warn">SIM</Pill>
                </td>
                <td className="px-2 py-2 font-mono text-xs text-mute">
                  {s.warn} / {s.alarm} {s.unit}
                  {limits[s.id] && <span className="ml-1 text-sky-300">*</span>}
                </td>
                <td className="px-2 py-2">
                  <Pill tone={LV_TONE[lv]}>{w.lv[lv]}</Pill>
                </td>
              </tr>
            ))}
          </Table>
        </Panel>

        <Panel title={t.common.onMap}>
          <WorkspaceMap data={data} layers={['sensors', 'packages']} selected={cur?.s.id} onPick={(p) => p.kind === 'sensor' && setSel(p.id)} height="h-[340px]" />
        </Panel>
      </div>

      {cur && (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <Panel
            title={
              <span>
                {cur.s.id} · {w.kind[cur.s.kind]} — {w.history}
              </span>
            }
            action={
              <Link href="/system/monitor" className="text-xs text-accent-hi hover:underline">
                {w.twin} →
              </Link>
            }
          >
            <LineChart
              labels={hist.labels}
              unit={`${cur.s.unit} · ${w.minutes}`}
              series={[
                { name: `${cur.s.id} (SIM)`, color: '#22d3ee', values: hist.values },
                { name: w.warn, color: LEVEL_COLOR.warn, values: hist.values.map(() => cur.s.warn), dashed: true },
                { name: w.alarm, color: LEVEL_COLOR.alarm, values: hist.values.map(() => cur.s.alarm), dashed: true },
              ]}
              max={Math.max(cur.s.alarm * 1.15, ...hist.values)}
            />
            <p className="mt-2 text-xs text-mute">
              {pkgName(cur.link.pkg)} · {cur.link.asset}
            </p>
          </Panel>

          <div className="space-y-6">
            <Panel title={w.alerts}>
              {alerts.length ? (
                <ul className="divide-y divide-line/60">
                  {alerts.map(({ s, v, lv }) => (
                    <li key={s.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                      <button type="button" onClick={() => setSel(s.id)} className="cursor-pointer text-left hover:text-accent-hi">
                        <span className="font-mono text-xs text-mute">{s.id}</span> {w.kind[s.kind]}: {fmt(s, v)} {s.unit}
                      </button>
                      <Pill tone={LV_TONE[lv]}>{w.lv[lv]}</Pill>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-mute">{w.noAlerts}</p>
              )}
            </Panel>

            <Panel title={w.thresholds}>
              <p className="mb-3 text-xs text-mute">{w.thresholdsNote}</p>
              {draft ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label={`${w.warn} (${cur.s.unit})`}>
                      <input type="number" step="any" className={inputCls} value={draft.warn} onChange={(e) => setDraft({ ...draft, warn: e.target.value })} />
                    </Field>
                    <Field label={`${w.alarm} (${cur.s.unit})`} error={draftBad ? w.badLimits : undefined}>
                      <input type="number" step="any" className={inputCls} value={draft.alarm} onChange={(e) => setDraft({ ...draft, alarm: e.target.value })} />
                    </Field>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Btn
                      kind="primary"
                      disabled={draftBad || draft.warn === '' || draft.alarm === ''}
                      onClick={() => {
                        setLimits((l) => ({ ...l, [cur.s.id]: { warn: Number(draft.warn), alarm: Number(draft.alarm) } }));
                        setDraft(null);
                      }}
                    >
                      {w.apply}
                    </Btn>
                    <Btn onClick={() => setDraft(null)}>{t.common.cancel}</Btn>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm">
                    {cur.s.id}: {cur.s.warn} / {cur.s.alarm} {cur.s.unit}
                  </span>
                  <Btn onClick={startEdit}>{t.common.edit}</Btn>
                  {limits[cur.s.id] && (
                    <Btn
                      onClick={() =>
                        setLimits((l) => {
                          const n = { ...l };
                          delete n[cur.s.id];
                          return n;
                        })
                      }
                    >
                      {w.restore}
                    </Btn>
                  )}
                </div>
              )}
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}
