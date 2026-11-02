'use client';

import { useMemo, useState } from 'react';
import { BLOCKS, PLOTS, VERDICT_COLOR, atLeast, atMost, checkPlot, worst, zoneOf, type Plot, type Verdict } from '@/lib/construction/extra/detailplan';
import { ROADS, ZONES, centre, rectToLine, type Zone } from '@/lib/construction/extra/masterplan';
import { CRITERIA, DETOUR, POINTS, type Criterion, type CriterionKey } from '@/lib/construction/extra/suitability';
import { useEn, useText, useWords } from '@/lib/construction/text';
import type { Rect } from '@/lib/construction/types';
import { useExtra } from '../extra';
import { Drawer, Kpi, PageHead, Panel, Pill, Select, Table, type Tone } from '../Kit';
import { useStore } from '../Store';
import { Dl, hit, LegendRow, PlanSvg, Row } from './MasterPlan';

// Suitability: every plot of the detailed plan checked against the building codes and planning rules — density and
// height against the master-plan zone, setbacks, green space and parking, walking distance to school, kindergarten,
// clinic and park, fire-engine access and winter sunlight. Each check is pass / warning / fail with the measured and
// required values; the plot's score is the average of its checks (pass 100, warning 60, fail 0). Distances are
// measured on the plan, so a planner's change to the master or detailed plan shows here straight away.

const VTONE: Record<Verdict, Tone> = { pass: 'good', warn: 'warn', fail: 'bad', na: 'neutral' };
const SCORE_COLOR = (s: number | null) => (s == null ? VERDICT_COLOR.na : s >= 85 ? VERDICT_COLOR.pass : s >= 60 ? VERDICT_COLOR.warn : VERDICT_COLOR.fail);
const scoreTone = (s: number | null): Tone => (s == null ? 'neutral' : s >= 85 ? 'good' : s >= 60 ? 'warn' : 'bad');

// units are kept in Mongolian in the criteria; English pages translate them here
const UNIT_EN: Record<string, string> = { м: 'm', зогсоол: 'spaces', ц: 'h' };
const useUnit = () => {
  const en = useEn();
  return (u: string) => (en ? (UNIT_EN[u] ?? u) : u);
};

type Result = { plot: Plot; c: Criterion; value: number | null; limit: number; verdict: Verdict };

const W = {
  mn: {
    lead: 'Төлөвлөгөөг барилгын норм, дүрэмтэй тулгасан үнэлгээ: нягтрал, өндөр, ухрах зай, ногоон байгууламж, зогсоол, сургууль, цэцэрлэг, эмнэлэг хүртэлх зай, галын машин нэвтрэх, нарны гэрэл. Шалгуур бүрийг энгийн үгээр тайлбарласан.',
    overall: 'Нийт үнэлгээ',
    outOf: '100 онооноос',
    plotsPass: 'Бүрэн тэнцсэн талбар',
    warnings: 'Анхааруулга',
    fails: 'Зөрчил',
    weakest: 'Хамгийн сул шалгуур',
    plan: 'Тохиромжтой байдлын зураг',
    byScore: 'Нэгж талбарын оноогоор',
    byCriterion: 'Шалгуураар',
    criteria: 'Шалгуурууд',
    criterion: 'Шалгуур',
    result: 'Дүн',
    block: 'Хэсэг',
    zone: 'Бүс (ЕТ)',
    plot: 'Нэгж талбар',
    measured: 'Хэмжсэн',
    required: 'Шаардлага',
    source: 'Эх сурвалж (норм)',
    rule: 'Дүрэм',
    plain: 'Энгийнээр',
    score: 'Оноо',
    results: 'Шалгалтын дүн',
    pkgs: 'Багцаар',
    plots: 'Нэгж талбар',
    noPlots: 'Холбогдох нэгж талбар алга',
    na: 'Тооцоо хийгдээгүй',
    notApplies: 'Энэ зориулалтад хамаарахгүй',
    howScored: 'Тэнцсэн = 100, анхааруулга = 60, зөрчил = 0; нэгж талбарын оноо нь шалгуурын онооны дундаж. Анхааруулга: хязгаараас 5% хүртэл хэтэрсэн, эсвэл шаардлагын 90%-иас дээш.',
    pick: 'Шалгуур, нэгж талбар дээр дарж дэлгэрэнгүйг харна.',
    verdict: { pass: 'Тэнцсэн', warn: 'Анхааруулга', fail: 'Зөрчилтэй', na: 'Тооцоогүй' } as Record<Verdict, string>,
    groups: { density: 'Нягтрал', site: 'Талбайн зохион байгуулалт', access: 'Үйлчилгээний хүртээмж', health: 'Аюулгүй байдал, эрүүл ахуй' } as Record<Criterion['group'], string>,
  },
  en: {
    lead: 'The plan checked against building codes and planning rules: density, height, setbacks, green space, parking, walking distance to school, kindergarten, clinic and park, fire access and sunlight. Each criterion explained in plain words.',
    overall: 'Overall score',
    outOf: 'out of 100',
    plotsPass: 'Plots fully compliant',
    warnings: 'Warnings',
    fails: 'Failures',
    weakest: 'Weakest criterion',
    plan: 'Suitability plan',
    byScore: 'By plot score',
    byCriterion: 'By criterion',
    criteria: 'Criteria',
    criterion: 'Criterion',
    result: 'Result',
    block: 'Block',
    zone: 'Zone (master plan)',
    plot: 'Plot',
    measured: 'Measured',
    required: 'Required',
    source: 'Source (norm)',
    rule: 'Rule',
    plain: 'In plain words',
    score: 'Score',
    results: 'Check results',
    pkgs: 'By package',
    plots: 'Plots',
    noPlots: 'No plots linked',
    na: 'Not yet calculated',
    notApplies: 'Doesn’t apply to this use',
    howScored: 'Pass = 100, warning = 60, fail = 0; a plot’s score is the average of its checks. Warning: up to 5% over a limit, or at least 90% of a requirement.',
    pick: 'Tap a criterion or a plot for details.',
    verdict: { pass: 'Pass', warn: 'Warning', fail: 'Fail', na: 'Not calculated' },
    groups: { density: 'Density', site: 'Site layout', access: 'Access to services', health: 'Safety and health' },
  },
};
type Words = typeof W.mn;

// gap between two rectangles (0 if they touch)
const gap = (a: Rect, b: Rect) => Math.hypot(Math.max(0, a.x - b.x - b.w, b.x - a.x - a.w), Math.max(0, a.y - b.y - b.h, b.y - a.y - a.h));
// the building's footprint as a square in the middle of its plot (the plan doesn't carry building outlines)
const building = (p: Plot): Rect => {
  const s = Math.sqrt(p.footprint);
  const [cx, cy] = centre(p.r);
  return { x: cx - s / 2, y: cy - s / 2, w: s, h: s };
};

function assess(plots: Plot[], zones: Zone[]): Result[] {
  const out: Result[] = [];
  const near = (p: Plot, targets: Rect[]) => (targets.length ? Math.round(Math.min(...targets.map((r) => gap(p.r, r))) * DETOUR) : null);
  const of = (u: Plot['use']) => plots.filter((x) => x.use === u).map((x) => x.r);
  const parks = zones.filter((z) => z.kind === 'green').map((z) => z.r);
  for (const p of plots) {
    const base = checkPlot(p, zoneOf(zones, p));
    for (const c of CRITERIA) {
      if (c.applies !== 'all' && !c.applies.includes(p.use)) continue;
      const b = base.find((x) => x.key === c.key);
      if (b) {
        out.push({ plot: p, c, value: b.value, limit: b.limit, verdict: b.verdict });
        continue;
      }
      let value: number | null = null;
      let limit = 0;
      if (c.key === 'school') [value, limit] = [near(p, of('school')), 500];
      if (c.key === 'kindergarten') [value, limit] = [near(p, of('kindergarten')), 300];
      if (c.key === 'clinic') [value, limit] = [near(p, of('clinic')), 1000];
      if (c.key === 'park') [value, limit] = [near(p, parks), 500];
      if (c.key === 'fire') {
        const bld = building(p);
        value = Math.round(Math.max(0, Math.min(...ROADS.filter((r) => r.cls !== 'ped').map((r) => rectToLine(bld, r.line) - r.width / 2))));
        limit = 50;
      }
      if (c.key === 'sun') [value, limit] = [p.sun, p.use === 'housing' ? 2 : 2.5];
      out.push({ plot: p, c, value, limit, verdict: value == null ? 'na' : c.kind === 'max' ? atMost(value, limit) : atLeast(value, limit) });
    }
  }
  return out;
}
const scoreOf = (rs: Result[]) => {
  const xs = rs.filter((r) => r.verdict !== 'na').map((r): number => POINTS[r.verdict as keyof typeof POINTS]);
  return xs.length ? Math.round(xs.reduce((s, x) => s + x, 0) / xs.length) : null;
};
const fmt = (v: number | null, unit = '') => (v == null ? '—' : `${Number.isInteger(v) ? v.toLocaleString('en-US') : v.toFixed(v < 10 ? 2 : 1)}${unit ? ` ${unit}` : ''}`);

export default function Suitability() {
  const t = useText();
  const en = useEn();
  const w = useWords(W);
  const { data } = useStore();
  const [zones] = useExtra<Zone[]>('masterplan.zones', ZONES);
  const [plots] = useExtra<Plot[]>('detailplan.plots', PLOTS);
  const [crit, setCrit] = useState<'all' | CriterionKey>('all');
  const [verdict, setVerdict] = useState<'all' | Verdict>('all');
  const [block, setBlock] = useState('all');
  const [open, setOpen] = useState<{ kind: 'plot' | 'crit'; id: string } | null>(null);
  const L = (x: { mn: string; en: string }) => (en ? x.en : x.mn);
  const U = useUnit();

  const results = useMemo(() => assess(plots, zones), [plots, zones]);
  const ofPlot = (id: string) => results.filter((r) => r.plot.id === id);
  const ofCrit = (k: CriterionKey) => results.filter((r) => r.c.key === k);
  const plotScore = (id: string) => scoreOf(ofPlot(id));
  const scores = plots.map((p) => plotScore(p.id)).filter((s): s is number => s != null);
  const overall = scores.length ? Math.round(scores.reduce((s, x) => s + x, 0) / scores.length) : null;
  const passRate = (k: CriterionKey) => {
    const rs = ofCrit(k).filter((r) => r.verdict !== 'na');
    return rs.length ? rs.filter((r) => r.verdict === 'pass').length / rs.length : 1;
  };
  const weakest = [...CRITERIA].sort((a, b) => passRate(a.key) - passRate(b.key))[0];

  const shown = results
    .filter((r) => (crit === 'all' || r.c.key === crit) && (verdict === 'all' || r.verdict === verdict) && (block === 'all' || r.plot.block === block))
    .sort((a, b) => ({ fail: 0, warn: 1, na: 2, pass: 3 })[a.verdict] - ({ fail: 0, warn: 1, na: 2, pass: 3 })[b.verdict] || a.plot.id.localeCompare(b.plot.id));

  // the plan: by score, or by the chosen criterion's result
  const colourOf = (p: Plot) => {
    if (crit === 'all') return SCORE_COLOR(plotScore(p.id));
    const r = results.find((x) => x.plot.id === p.id && x.c.key === crit);
    return r ? VERDICT_COLOR[r.verdict] : 'transparent';
  };
  const selPlot = open?.kind === 'plot' ? plots.find((p) => p.id === open.id) : undefined;
  const selCrit = open?.kind === 'crit' ? CRITERIA.find((c) => c.key === open.id) : undefined;

  return (
    <div className="space-y-6">
      <PageHead title={t.section.suitability} lead={w.lead} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label={w.overall} value={overall ?? '—'} sub={w.outOf} tone={scoreTone(overall)} />
        <Kpi label={w.plotsPass} value={`${plots.filter((p) => worst(ofPlot(p.id).map((r) => r.verdict)) === 'pass').length} / ${plots.length}`} tone="good" />
        <Kpi label={`${w.warnings} / ${w.fails}`} value={`${results.filter((r) => r.verdict === 'warn').length} / ${results.filter((r) => r.verdict === 'fail').length}`} tone={results.some((r) => r.verdict === 'fail') ? 'bad' : 'warn'} />
        <Kpi label={w.weakest} value={`${Math.round(passRate(weakest.key) * 100)}%`} sub={L(weakest.name)} tone={passRate(weakest.key) < 0.5 ? 'bad' : 'warn'} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Select label={w.criterion} value={crit} onChange={setCrit} options={[['all', `${t.filter.all} — ${w.byScore.toLowerCase()}`], ...CRITERIA.map((c) => [c.key, L(c.name)] as [CriterionKey, string])]} />
        <Select label={w.result} value={verdict} onChange={setVerdict} options={[['all', t.filter.all], ...(['fail', 'warn', 'pass', 'na'] as Verdict[]).map((v) => [v, w.verdict[v]] as [Verdict, string])]} />
        <Select label={w.block} value={block} onChange={setBlock} options={[['all', t.filter.all], ...BLOCKS.map((b) => [b.id, `${b.id} · ${L(b.name)}`] as [string, string])]} />
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel title={`${w.plan} · ${crit === 'all' ? w.byScore : L(CRITERIA.find((c) => c.key === crit)!.name)}`}>
          <PlanSvg label={w.plan}>
            {zones.map((z) => (
              <rect key={z.id} x={z.r.x} y={z.r.y} width={z.r.w} height={z.r.h} fill={z.kind === 'green' ? '#7fa36a' : 'none'} fillOpacity={0.12} stroke="var(--color-mute)" strokeOpacity={0.35} strokeDasharray="2 4" className="pointer-events-none" />
            ))}
            {plots.map((p) => {
              const s = plotScore(p.id);
              const dim = block !== 'all' && p.block !== block;
              const on = selPlot?.id === p.id;
              return (
                <g key={p.id} {...hit(() => setOpen({ kind: 'plot', id: p.id }), `${p.id} ${L(p.name)} ${s ?? ''}`)} opacity={dim ? 0.25 : 1}>
                  <rect x={p.r.x} y={p.r.y} width={p.r.w} height={p.r.h} fill={colourOf(p)} fillOpacity={0.5} stroke={on ? 'var(--color-accent-hi)' : 'var(--color-fg)'} strokeOpacity={on ? 1 : 0.55} strokeWidth={on ? 4 : 1.2} />
                  <text x={p.r.x + 5} y={p.r.y + 16} fontSize="13" fill="var(--color-fg)" className="pointer-events-none font-mono">
                    {p.id}
                  </text>
                  {crit === 'all' && s != null && (
                    <text x={p.r.x + p.r.w / 2} y={p.r.y + p.r.h / 2 + 8} textAnchor="middle" fontSize="22" fontWeight="600" fill="var(--color-fg)" className="pointer-events-none font-mono">
                      {s}
                    </text>
                  )}
                </g>
              );
            })}
          </PlanSvg>
          <LegendRow
            items={
              crit === 'all'
                ? [
                    ['≥ 85', VERDICT_COLOR.pass],
                    ['60–84', VERDICT_COLOR.warn],
                    ['< 60', VERDICT_COLOR.fail],
                  ]
                : (['pass', 'warn', 'fail', 'na'] as Verdict[]).map((v) => [w.verdict[v], VERDICT_COLOR[v]])
            }
          />
          <p className="mt-3 text-xs text-mute">{w.howScored}</p>
        </Panel>

        <Panel title={w.criteria}>
          <ul className="space-y-1">
            {CRITERIA.map((c) => {
              const rs = ofCrit(c.key);
              const n = (v: Verdict) => rs.filter((r) => r.verdict === v).length;
              return (
                <li key={c.key}>
                  <button
                    type="button"
                    onClick={() => setOpen({ kind: 'crit', id: c.key })}
                    className={`w-full cursor-pointer rounded-lg border px-3 py-2 text-left transition-colors hover:border-mute ${crit === c.key ? 'border-accent/50 bg-accent/10' : 'border-line'}`}
                  >
                    <span className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate text-fg/90">{L(c.name)}</span>
                      <span className="shrink-0 font-mono text-[11px] text-mute">
                        <span className="text-emerald-300">{n('pass')}</span> · <span className="text-sky-300">{n('warn')}</span> · <span className="text-red-300">{n('fail')}</span>
                      </span>
                    </span>
                    <span className="mt-1.5 flex h-1.5 overflow-hidden rounded-full bg-line" aria-hidden>
                      {(['pass', 'warn', 'fail', 'na'] as Verdict[]).map((v) => (
                        <span key={v} style={{ width: `${rs.length ? (n(v) / rs.length) * 100 : 0}%`, background: VERDICT_COLOR[v] }} />
                      ))}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>

      <Panel title={`${w.results} (${shown.length})`}>
        <Table head={[w.plot, w.block, w.criterion, w.measured, w.required, w.result, w.source]} empty={!shown.length}>
          {shown.map((r) => (
            <Row key={`${r.plot.id}-${r.c.key}`} on={false} onClick={() => setOpen({ kind: 'crit', id: r.c.key })}>
              <td className="px-2 py-2">
                <button
                  type="button"
                  className="min-h-8 cursor-pointer text-left font-mono text-xs underline-offset-2 hover:underline"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpen({ kind: 'plot', id: r.plot.id });
                  }}
                >
                  {r.plot.id}
                </button>
                <span className="block text-[11px] text-mute">{L(r.plot.name)}</span>
              </td>
              <td className="px-2 py-2 font-mono text-xs">
                {r.plot.block}
                {r.plot.pkg && <span className="block text-mute">{r.plot.pkg}</span>}
              </td>
              <td className="px-2 py-2 text-xs">{L(r.c.name)}</td>
              <td className={`px-2 py-2 font-mono text-xs ${r.verdict === 'fail' ? 'text-red-300' : r.verdict === 'warn' ? 'text-sky-300' : ''}`}>{r.verdict === 'na' ? w.na : fmt(r.value, U(r.c.unit))}</td>
              <td className="px-2 py-2 font-mono text-xs text-mute">
                {r.c.kind === 'max' ? '≤' : '≥'} {fmt(r.limit, U(r.c.unit))}
              </td>
              <td className="px-2 py-2">
                <Pill tone={VTONE[r.verdict]}>{w.verdict[r.verdict]}</Pill>
              </td>
              <td className="max-w-[240px] px-2 py-2 text-[11px] text-mute">{r.c.source}</td>
            </Row>
          ))}
        </Table>
      </Panel>

      <Panel title={w.pkgs}>
        <Table head={[t.common.package, w.plots, w.score, w.warnings, w.fails]}>
          {data.packages.map((p) => {
            const ps = plots.filter((x) => x.pkg === p.id);
            const rs = results.filter((r) => r.plot.pkg === p.id);
            const s = scoreOf(rs);
            return (
              <tr key={p.id} className="align-top">
                <td className="px-2 py-2">
                  <span className="font-mono text-xs">{p.id}</span>
                  <span className="block text-xs text-mute">{p.name}</span>
                </td>
                <td className="px-2 py-2 text-xs">
                  {ps.length ? (
                    <span className="flex flex-wrap gap-1">
                      {ps.map((x) => (
                        <button key={x.id} type="button" className="min-h-8 cursor-pointer rounded-full border border-line px-2 font-mono text-[11px] hover:border-mute" onClick={() => setOpen({ kind: 'plot', id: x.id })}>
                          {x.id}
                        </button>
                      ))}
                    </span>
                  ) : (
                    <span className="text-mute">{w.noPlots}</span>
                  )}
                </td>
                <td className="px-2 py-2">{s != null ? <Pill tone={scoreTone(s)}>{s}</Pill> : '—'}</td>
                <td className="px-2 py-2 font-mono text-xs">{rs.filter((r) => r.verdict === 'warn').length}</td>
                <td className="px-2 py-2 font-mono text-xs">{rs.filter((r) => r.verdict === 'fail').length}</td>
              </tr>
            );
          })}
        </Table>
      </Panel>

      <Drawer open={!!(selPlot || selCrit)} onClose={() => setOpen(null)} title={selPlot ? `${selPlot.id} · ${L(selPlot.name)}` : selCrit ? L(selCrit.name) : ''}>
        {selPlot && <PlotView plot={selPlot} rs={ofPlot(selPlot.id)} score={plotScore(selPlot.id)} w={w} L={L} zone={zoneOf(zones, selPlot)} onCrit={(k) => setOpen({ kind: 'crit', id: k })} />}
        {selCrit && (
          <CritView
            c={selCrit}
            rs={ofCrit(selCrit.key)}
            w={w}
            L={L}
            onPlot={(id) => setOpen({ kind: 'plot', id })}
            onShow={() => {
              setCrit(selCrit.key);
              setOpen(null);
            }}
          />
        )}
      </Drawer>
    </div>
  );
}

function PlotView({ plot: p, rs, score, w, L, zone, onCrit }: { plot: Plot; rs: Result[]; score: number | null; w: Words; L: (x: { mn: string; en: string }) => string; zone?: Zone; onCrit: (k: CriterionKey) => void }) {
  const t = useText();
  const U = useUnit();
  return (
    <div className="space-y-5 text-sm">
      <div className="flex items-center gap-3">
        <span className={`font-mono text-3xl ${score == null ? 'text-mute' : score >= 85 ? 'text-emerald-300' : score >= 60 ? 'text-sky-300' : 'text-red-300'}`}>{score ?? '—'}</span>
        <span className="text-xs text-mute">
          {w.score} · {w.outOf}
        </span>
      </div>
      <Dl
        rows={[
          [w.block, p.block],
          [w.zone, zone ? `${zone.id} · ${L(zone.name)}` : '—'],
          [t.common.package, p.pkg ?? '—'],
        ]}
      />
      <ul className="space-y-1.5">
        {rs.map((r) => (
          <li key={r.c.key}>
            <button type="button" onClick={() => onCrit(r.c.key)} className="flex min-h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-line px-3 py-1.5 text-left text-xs hover:border-mute">
              <span>
                <span className="block text-fg/90">{L(r.c.name)}</span>
                <span className="font-mono text-mute">
                  {r.verdict === 'na' ? w.na : fmt(r.value, U(r.c.unit))} · {r.c.kind === 'max' ? '≤' : '≥'} {fmt(r.limit, U(r.c.unit))}
                </span>
              </span>
              <Pill tone={VTONE[r.verdict]}>{w.verdict[r.verdict]}</Pill>
            </button>
          </li>
        ))}
      </ul>
      {CRITERIA.filter((c) => !rs.some((r) => r.c.key === c.key)).length > 0 && (
        <p className="text-xs text-mute">
          {w.notApplies}:{' '}
          {CRITERIA.filter((c) => !rs.some((r) => r.c.key === c.key))
            .map((c) => L(c.name))
            .join(', ')}
        </p>
      )}
    </div>
  );
}

function CritView({ c, rs, w, L, onPlot, onShow }: { c: Criterion; rs: Result[]; w: Words; L: (x: { mn: string; en: string }) => string; onPlot: (id: string) => void; onShow: () => void }) {
  const U = useUnit();
  return (
    <div className="space-y-5 text-sm">
      <Pill>{w.groups[c.group]}</Pill>
      <div className="rounded-lg border border-accent/30 bg-accent/[0.05] p-3">
        <p className="mb-1 text-xs text-mute">{w.plain}</p>
        <p className="leading-relaxed">{L(c.plain)}</p>
      </div>
      <Dl
        rows={[
          [w.rule, L(c.rule)],
          [w.source, c.source],
        ]}
      />
      <button type="button" onClick={onShow} className="min-h-10 cursor-pointer text-xs text-accent-hi hover:underline">
        {w.plan} →
      </button>
      <ul className="space-y-1.5">
        {rs.map((r) => (
          <li key={r.plot.id}>
            <button type="button" onClick={() => onPlot(r.plot.id)} className="flex min-h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-line px-3 py-1.5 text-left text-xs hover:border-mute">
              <span>
                <span className="font-mono">{r.plot.id}</span> <span className="text-mute">· {L(r.plot.name)}</span>
                <span className="block font-mono text-mute">
                  {r.verdict === 'na' ? w.na : fmt(r.value, U(r.c.unit))} · {c.kind === 'max' ? '≤' : '≥'} {fmt(r.limit, U(c.unit))}
                </span>
              </span>
              <Pill tone={VTONE[r.verdict]}>{w.verdict[r.verdict]}</Pill>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
