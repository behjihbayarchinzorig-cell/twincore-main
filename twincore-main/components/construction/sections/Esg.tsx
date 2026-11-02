'use client';

import { useState } from 'react';
import { useText, useWords } from '@/lib/construction/text';
import type { IssueState, Method } from '@/lib/construction/types';
import { Bars } from '../Charts';
import { Btn, Forbidden, Kpi, PageHead, Panel, Pill, Select, Table, toneOf, type Tone } from '../Kit';
import { useStore } from '../Store';

// Environment and social outcomes: the risk register with its mitigations, and the indicators with what they mean,
// their unit, period, source and — kept visibly apart — whether each value is measured, calculated or only an
// estimate. A change is shown only where both values exist; nothing is claimed beyond the numbers on the page.

const W = {
  mn: {
    lead: 'Байгаль орчны эрсдэл, хяналтын үр дүн, үйлчилгээний хүртээмж, амьдрах орчны өөрчлөлтийн үзүүлэлтүүд.',
    risks: 'Байгаль орчны эрсдэл',
    risk: 'Эрсдэл',
    levelH: 'Түвшин',
    mitigation: 'Бууруулах арга хэмжээ',
    indicators: 'Үзүүлэлтүүд',
    group: { env: 'Байгаль орчин', social: 'Нийгэм' },
    all: 'Бүгд',
    groupLabel: 'Бүлэг',
    name: 'Үзүүлэлт',
    unit: 'Нэгж',
    period: 'Хугацаа',
    source: 'Эх сурвалж',
    method: 'Арга',
    baseline: 'Суурь',
    current: 'Одоогийн / төлөвлөсөн',
    change: 'Өөрчлөлт',
    better: 'Сайн чиглэл',
    lower: 'бага нь сайн',
    higher: 'их нь сайн',
    methods: { measured: 'Хэмжсэн', calculated: 'Тооцоолсон', estimated: 'Таамаг' } as Record<Method, string>,
    methodNote: 'Хэмжсэн — багаж, шинжилгээнээс; Тооцоолсон — загвар, GIS шинжилгээнээс; Таамаг — мэдүүлэг, төлөвлөгөөнд үндэслэсэн, баталгаажаагүй.',
    simNote: 'Мэдрэгч дээр үндэслэсэн утгууд симуляц — бодит хэмжилт биш.',
    estNote: 'таамаг',
    compare: 'Суурь ба одоогийн утга (хоёулаа байгаа үзүүлэлтүүд)',
    move: 'Төлөв солих',
    kpiOpen: 'Нээлттэй эрсдэл',
    kpiHigh: 'Өндөр түвшний',
    kpiInd: 'Үзүүлэлт',
    kpiMissing: 'Өгөгдөлгүй',
    definition: 'Тодорхойлолт',
  },
  en: {
    lead: 'Environmental risks, monitoring results, access to services and changes in the living environment.',
    risks: 'Environmental risks',
    risk: 'Risk',
    levelH: 'Level',
    mitigation: 'Mitigation',
    indicators: 'Indicators',
    group: { env: 'Environment', social: 'Social' },
    all: 'All',
    groupLabel: 'Group',
    name: 'Indicator',
    unit: 'Unit',
    period: 'Period',
    source: 'Source',
    method: 'Method',
    baseline: 'Baseline',
    current: 'Current / planned',
    change: 'Change',
    better: 'Better when',
    lower: 'lower',
    higher: 'higher',
    methods: { measured: 'Measured', calculated: 'Calculated', estimated: 'Estimate' },
    methodNote: 'Measured — from instruments or lab tests; Calculated — from models or GIS analysis; Estimate — based on declarations or plans, not verified.',
    simNote: 'Values based on sensors are simulated — not real measurements.',
    estNote: 'estimate',
    compare: 'Baseline and current (indicators with both values)',
    move: 'Change status',
    kpiOpen: 'Open risks',
    kpiHigh: 'High level',
    kpiInd: 'Indicators',
    kpiMissing: 'No data',
    definition: 'Definition',
  },
};

const METHOD_TONE: Record<Method, Tone> = { measured: 'good', calculated: 'info', estimated: 'warn' };
const NEXT: Record<IssueState, IssueState[]> = { open: ['review', 'resolved'], review: ['open', 'resolved'], resolved: ['open'] };

export default function Esg() {
  const t = useText();
  const w = useWords(W);
  const { data, can, change } = useStore();
  const [group, setGroup] = useState<'all' | 'env' | 'social'>('all');
  const name = (id: string) => data.users.find((u) => u.id === id)?.name ?? data.orgs.find((o) => o.id === id)?.name ?? id;

  const inds = data.indicators.filter((i) => group === 'all' || i.group === group);
  const both = inds.filter((i) => i.baseline != null && i.current != null);
  const open = data.risks.filter((r) => r.state !== 'resolved');
  const fmtNum = (v: number | null) => (v == null ? '—' : v.toLocaleString('en-US'));

  return (
    <div className="space-y-6">
      <PageHead title={t.section.esg} lead={w.lead} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label={w.kpiOpen} value={open.length} tone={open.length ? 'warn' : 'good'} />
        <Kpi label={w.kpiHigh} value={open.filter((r) => r.level === 'high').length} tone={open.some((r) => r.level === 'high') ? 'bad' : 'neutral'} />
        <Kpi label={w.kpiInd} value={data.indicators.length} />
        <Kpi label={w.kpiMissing} value={data.indicators.filter((i) => i.current == null).length} sub={t.common.unavailable} />
      </div>

      <Panel title={w.risks} action={!can('quality.edit') ? <Forbidden /> : undefined}>
        <Table head={['ID', w.risk, t.common.package, w.levelH, w.mitigation, t.common.owner, t.common.status, '']} empty={!data.risks.length}>
          {data.risks.map((r) => (
            <tr key={r.id}>
              <td className="px-2 py-2 font-mono text-xs text-mute">{r.id}</td>
              <td className="px-2 py-2">{r.title}</td>
              <td className="px-2 py-2 font-mono text-xs">{r.pkg}</td>
              <td className="px-2 py-2">
                <Pill tone={toneOf(r.level)}>{t.severity[r.level]}</Pill>
              </td>
              <td className="px-2 py-2 text-xs text-fg/80">{r.mitigation}</td>
              <td className="px-2 py-2 text-xs text-mute">{name(r.owner)}</td>
              <td className="px-2 py-2">
                <Pill tone={toneOf(r.state)}>{t.issueState[r.state]}</Pill>
              </td>
              <td className="px-2 py-2">
                {can('quality.edit') && (
                  <div className="flex flex-wrap gap-1">
                    {NEXT[r.state].map((s) => (
                      <Btn
                        key={s}
                        onClick={() =>
                          change('quality.edit', r.id, `${r.state} → ${s}`, (d) => {
                            const x = d.risks.find((y) => y.id === r.id);
                            if (x) x.state = s;
                          })
                        }
                      >
                        {t.issueState[s]}
                      </Btn>
                    ))}
                  </div>
                )}
              </td>
            </tr>
          ))}
        </Table>
      </Panel>

      <Panel
        title={w.indicators}
        action={
          <Select
            label={w.groupLabel}
            value={group}
            onChange={setGroup}
            options={[
              ['all', w.all],
              ['env', w.group.env],
              ['social', w.group.social],
            ]}
          />
        }
      >
        <p className="mb-3 text-xs text-mute">{w.methodNote}</p>
        <p className="mb-3 text-xs text-sky-300">{w.simNote}</p>
        <Table head={[w.name, w.unit, w.period, w.source, w.method, w.baseline, w.current, w.change, w.better]} empty={!inds.length}>
          {inds.map((i) => {
            const delta = i.baseline != null && i.current != null ? i.current - i.baseline : null;
            const good = delta == null ? null : i.better === 'lower' ? delta < 0 : delta > 0;
            return (
              <tr key={i.id}>
                <td className="px-2 py-2">
                  <p>{i.name}</p>
                  <p className="text-xs text-mute">
                    {w.definition}: {i.definition}
                  </p>
                </td>
                <td className="px-2 py-2 text-xs">{i.unit}</td>
                <td className="px-2 py-2 text-xs text-mute">{i.period}</td>
                <td className="px-2 py-2 text-xs text-mute">{i.source}</td>
                <td className="px-2 py-2">
                  <Pill tone={METHOD_TONE[i.method]}>{w.methods[i.method]}</Pill>
                </td>
                <td className="px-2 py-2 font-mono tabular-nums">{fmtNum(i.baseline)}</td>
                <td className="px-2 py-2 font-mono tabular-nums">
                  {fmtNum(i.current)}
                  {i.method === 'estimated' && i.current != null && <span className="ml-1 text-xs text-sky-300">({w.estNote})</span>}
                </td>
                <td className="px-2 py-2 font-mono text-xs tabular-nums">
                  {delta == null ? (
                    <span className="text-mute">—</span>
                  ) : (
                    <span className={good ? 'text-emerald-300' : 'text-red-300'}>
                      {delta > 0 ? '+' : ''}
                      {Number(delta.toFixed(2)).toLocaleString('en-US')}
                    </span>
                  )}
                </td>
                <td className="px-2 py-2 text-xs text-mute">{i.better === 'lower' ? w.lower : w.higher}</td>
              </tr>
            );
          })}
        </Table>
      </Panel>

      {both.length > 0 && (
        <Panel title={w.compare}>
          <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-2">
            {both.map((i) => (
              <Bars
                key={i.id}
                unit={`${i.unit} · ${w.methods[i.method]}`}
                rows={[{ label: i.name, values: [i.baseline, i.current] }]}
                measures={[
                  { name: w.baseline, color: '#8ea6cc' },
                  { name: w.current, color: '#60a5fa' },
                ]}
                fmt={(v) => v.toLocaleString('en-US')}
              />
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}
