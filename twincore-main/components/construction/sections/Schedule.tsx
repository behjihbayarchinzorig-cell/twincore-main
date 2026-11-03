'use client';

import { useMemo, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { activityProgress, cashflow, days, isOverdue, tug, today, variance } from '@/lib/construction/calc';
import { useEn, useText, useWords } from '@/lib/construction/text';
import type { Activity, Baseline, Data } from '@/lib/construction/types';
import { checkActivity, type Problem } from '@/lib/construction/validate';
import { LineChart } from '../Charts';
import { Btn, Drawer, Field, Forbidden, inputCls, Kpi, Panel, PageHead, Problems, Select } from '../Kit';
import { nextId, useStore } from '../Store';

// Ажлын хуваарь: the activities of every package on one timeline — the current bars, the approved baseline as a
// thin ghost under each, today's line, overdue work in red. Activities are created and edited in a side drawer and
// checked before saving (dates in order, no dependency loops). Approving the schedule adds a new baseline; an
// approved baseline is never overwritten.

const W = {
  mn: {
    lead: 'Багц бүрийн ажлын хугацаа, хамаарал, батлагдсан суурь хуваарьтай харьцуулсан зөрүү.',
    add: 'Ажил нэмэх',
    approve: 'Шинэ суурь хуваарь болгон батлах',
    approveNote: 'Одоогийн хуваарийг шинэ хувилбараар нэмнэ — өмнөх батлагдсан суурь хэвээр үлдэнэ.',
    compare: 'Харьцуулах суурь',
    activities: 'Ажил',
    overdue: 'Хугацаа хэтэрсэн ажил',
    delayed: 'Суурьтай харьцуулахад хоцорсон',
    baselines: 'Батлагдсан суурь хуваарь',
    variance: 'Зөрүү',
    progress: 'Батлагдсан гүйцэтгэл',
    current: 'Одоогийн хуваарь',
    baseline: 'Суурь хуваарь',
    todayLine: 'Өнөөдөр',
    name: 'Ажлын нэр',
    start: 'Эхлэх',
    finish: 'Дуусах',
    deps: 'Өмнө дуусах ёстой ажил',
    weight: 'Жин (багц доторх хувь)',
    cost: 'Төлөвлөсөн зардал (сая ₮)',
    editTitle: 'Ажил засах',
    newTitle: 'Шинэ ажил',
    finTitle: 'Хуваарьт уялдсан санхүүжилтийн төлөвлөгөө',
    finLead: 'Ажил бүрийн төлөвлөсөн зардлыг суурь хуваарийн хугацаанд жигд тараасан хуримтлагдсан дүн, бодит төлөлттэй харьцуулав.',
    planned: 'Төлөвлөсөн санхүүжилт',
    paid: 'Бодит төлөлт',
    toFinance: 'Санхүүжилт рүү',
    noBaseline: 'Суурь хуваарь батлагдаагүй',
    days: 'хоног',
    later: 'хойш',
    earlier: 'урагш',
  },
  en: {
    lead: 'Each package’s activities, their dependencies, and how far they have moved from the approved baseline.',
    add: 'Add activity',
    approve: 'Approve as a new baseline',
    approveNote: 'Adds the current schedule as a new version — earlier approved baselines are kept.',
    compare: 'Compare with baseline',
    activities: 'Activities',
    overdue: 'Overdue activities',
    delayed: 'Later than the baseline',
    baselines: 'Approved baselines',
    variance: 'Variance',
    progress: 'Approved progress',
    current: 'Current schedule',
    baseline: 'Baseline',
    todayLine: 'Today',
    name: 'Activity',
    start: 'Start',
    finish: 'Finish',
    deps: 'Must finish first',
    weight: 'Weight (share within the package)',
    cost: 'Planned cost (₮ mn)',
    editTitle: 'Edit activity',
    newTitle: 'New activity',
    finTitle: 'Financing plan tied to the schedule',
    finLead: 'Each activity’s planned cost spread evenly over its baseline dates, cumulative, against actual payments.',
    planned: 'Planned financing',
    paid: 'Actually paid',
    toFinance: 'Go to financing',
    noBaseline: 'No approved baseline',
    days: 'days',
    later: 'later',
    earlier: 'earlier',
  },
};

const DAYMS = 86400000;
const ms = (d: string) => Date.parse(d + 'T00:00:00Z');

export default function Schedule() {
  const t = useText();
  const w = useWords(W);
  const en = useEn();
  const { data, can, change, user } = useStore();
  const [pkg, setPkg] = useState('all');
  const [status, setStatus] = useState<'all' | 'overdue' | 'delayed' | 'open' | 'done'>('all');
  const [blId, setBlId] = useState<string>('latest');
  const [edit, setEdit] = useState<Activity | null>(null);
  const [problems, setProblems] = useState<Problem[]>([]);
  const now = today();
  const bl: Baseline | null = blId === 'latest' ? (data.baselines[data.baselines.length - 1] ?? null) : (data.baselines.find((b) => b.id === blId) ?? null);
  // variance against the chosen baseline (calc.variance uses the latest one)
  const varOf = (a: Activity) => (blId === 'latest' ? variance(data, a) : bl?.dates[a.id] ? days(bl.dates[a.id].finish, a.finish) : null);

  const acts = data.activities.filter((a) => {
    if (pkg !== 'all' && a.pkg !== pkg) return false;
    const done = activityProgress(data, a.id).approved >= 100;
    if (status === 'overdue') return isOverdue(data, a, now);
    if (status === 'delayed') return (varOf(a) ?? 0) > 0;
    if (status === 'open') return !done;
    if (status === 'done') return done;
    return true;
  });
  const overdue = data.activities.filter((a) => isOverdue(data, a, now)).length;
  const delayed = data.activities.filter((a) => (variance(data, a) ?? 0) > 0).length;

  // the timeline's span: everything shown, current and baseline, plus a margin
  const span = useMemo(() => {
    const ds = acts.flatMap((a) => [a.start, a.finish, ...(bl?.dates[a.id] ? [bl.dates[a.id].start, bl.dates[a.id].finish] : [])]);
    if (!ds.length) return null;
    const lo = ms(ds.reduce((m, d) => (d < m ? d : m))) - 20 * DAYMS;
    const hi = ms(ds.reduce((m, d) => (d > m ? d : m))) + 20 * DAYMS;
    return { lo, hi };
  }, [acts, bl]);
  const xp = (d: string) => (span ? ((ms(d) - span.lo) / (span.hi - span.lo)) * 100 : 0);
  const years = span ? Array.from({ length: new Date(span.hi).getUTCFullYear() - new Date(span.lo).getUTCFullYear() + 1 }, (_, i) => new Date(span.lo).getUTCFullYear() + i) : [];

  const name = (id: string) => data.users.find((u) => u.id === id)?.name ?? id;
  const pkgName = (id: string) => `${id} · ${data.packages.find((p) => p.id === id)?.name ?? ''}`;

  const openNew = () => {
    setProblems([]);
    setEdit({ id: '', pkg: pkg === 'all' ? data.packages[0].id : pkg, name: '', start: now, finish: now, owner: user, deps: [], weight: 10, cost: 0 });
  };
  const save = () => {
    if (!edit) return;
    const isNew = !edit.id;
    const draft: Activity = isNew ? { ...edit, id: nextId(edit.pkg.replace('PKG', 'A'), data.activities.filter((a) => a.pkg === edit.pkg).map((a) => a.id)) } : edit;
    const others = data.activities.filter((a) => a.id !== draft.id);
    const list = checkActivity(draft, [...others, draft]);
    setProblems(list);
    if (list.length) return;
    const ok = change('schedule.edit', draft.id, isNew ? 'create' : 'edit', (d: Data) => {
      const i = d.activities.findIndex((a) => a.id === draft.id);
      if (i >= 0) d.activities[i] = draft;
      else d.activities.push(draft);
    });
    if (!ok) setProblems([{ field: 'role', code: 'forbidden' }]);
    else setEdit(null);
  };
  const approveBaseline = () =>
    change('baseline.approve', `BL-${data.baselines.length + 1}`, 'approve baseline', (d: Data) => {
      d.baselines.push({
        id: `BL-${d.baselines.length + 1}`,
        label: `${en ? 'Baseline' : 'Үндсэн хуваарь'} v${d.baselines.length + 1}`,
        approvedAt: now,
        approvedBy: user,
        dates: Object.fromEntries(d.activities.map((a) => [a.id, { start: a.start, finish: a.finish }])),
      });
    });

  const flow = cashflow(data, pkg === 'all' ? undefined : [pkg]);

  return (
    <div className="space-y-6">
      <PageHead
        title={t.section.schedule}
        lead={w.lead}
        action={
          <div className="flex flex-wrap gap-2">
            {can('schedule.edit') && (
              <Btn kind="primary" onClick={openNew}>
                + {w.add}
              </Btn>
            )}
            {can('baseline.approve') && (
              <span title={w.approveNote}>
                <Btn onClick={approveBaseline}>{w.approve}</Btn>
              </span>
            )}
          </div>
        }
      />
      {!can('schedule.edit') && <Forbidden />}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label={w.activities} value={data.activities.length} />
        <Kpi label={w.overdue} value={overdue} tone={overdue ? 'bad' : 'good'} />
        <Kpi label={w.delayed} value={delayed} tone={delayed ? 'warn' : 'good'} />
        <Kpi label={w.baselines} value={data.baselines.length} sub={bl ? `${bl.label} · ${bl.approvedAt}` : w.noBaseline} />
      </div>

      <Panel
        title={t.section.schedule}
        action={
          <div className="flex flex-wrap items-end gap-3">
            <Select label={t.filter.pkg} value={pkg} onChange={setPkg} options={[['all', t.filter.all], ...data.packages.map((p): [string, string] => [p.id, p.id])]} />
            <Select
              label={t.filter.status}
              value={status}
              onChange={setStatus}
              options={[
                ['all', t.filter.all],
                ['overdue', t.common.overdue],
                ['delayed', w.delayed],
                ['open', t.issueState.open],
                ['done', t.pkgStatus.done],
              ]}
            />
            <Select label={w.compare} value={blId} onChange={setBlId} options={[['latest', data.baselines.length ? `${data.baselines[data.baselines.length - 1].label}` : w.noBaseline], ...data.baselines.slice(0, -1).map((b): [string, string] => [b.id, b.label])]} />
          </div>
        }
      >
        {/* legend */}
        <p className="mb-3 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-mute">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-5 rounded-sm bg-accent/70" />
            {w.current}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1 w-5 rounded-sm bg-fg/40" />
            {w.baseline}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-5 rounded-sm bg-red-500/80" />
            {t.common.overdue}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-0.5 bg-amber-400" />
            {w.todayLine}
          </span>
        </p>
        {!acts.length || !span ? (
          <p className="py-8 text-center text-sm text-mute">{t.common.none}</p>
        ) : (
          <div className="-mx-1 overflow-x-auto">
            <div className="min-w-[760px]">
              {/* the year ruler */}
              <div className="grid grid-cols-[minmax(0,15rem)_1fr_5rem] gap-3 border-b border-line pb-1 text-[10px] text-mute">
                <span>{t.common.package}</span>
                <div className="relative h-4">
                  {years.map((y) => {
                    const x = xp(`${y}-01-01`);
                    return x >= 0 && x <= 100 ? (
                      <span key={y} className="absolute -translate-x-1/2 font-mono" style={{ left: `${x}%` }}>
                        {y}
                      </span>
                    ) : null;
                  })}
                </div>
                <span className="text-right">{w.variance}</span>
              </div>
              {data.packages
                .filter((p) => acts.some((a) => a.pkg === p.id))
                .map((p) => (
                  <div key={p.id} className="border-b border-line/60 py-2">
                    <p className="mb-1 text-xs text-fg/80">{pkgName(p.id)}</p>
                    {acts
                      .filter((a) => a.pkg === p.id)
                      .map((a) => {
                        const late = isOverdue(data, a, now);
                        const v = varOf(a);
                        const b = bl?.dates[a.id];
                        const prog = activityProgress(data, a.id).approved;
                        return (
                          <button
                            key={a.id}
                            type="button"
                            disabled={!can('schedule.edit')}
                            onClick={() => {
                              setProblems([]);
                              setEdit({ ...a, deps: [...a.deps] });
                            }}
                            className="grid w-full grid-cols-[minmax(0,15rem)_1fr_5rem] items-center gap-3 rounded-md py-1 text-left text-xs hover:bg-surface/60 disabled:cursor-default disabled:hover:bg-transparent"
                            title={`${a.name}: ${a.start} → ${a.finish}${b ? ` (${w.baseline}: ${b.start} → ${b.finish})` : ''} · ${w.progress} ${Math.round(prog)}%`}
                          >
                            <span className="flex min-w-0 items-center gap-1.5">
                              <span className="shrink-0 font-mono text-[10px] text-mute">{a.id}</span>
                              <span className="truncate text-fg/90">{a.name}</span>
                            </span>
                            <span className="relative block h-5">
                              {/* today */}
                              <span className="absolute inset-y-0 w-px bg-amber-400/80" style={{ left: `${xp(now)}%` }} />
                              {/* the baseline: a thin ghost bar underneath */}
                              {b && <span className="absolute bottom-0 h-1 rounded-sm bg-fg/35" style={{ left: `${xp(b.start)}%`, width: `${Math.max(0.4, xp(b.finish) - xp(b.start))}%` }} />}
                              {/* the current bar, filled to its approved progress */}
                              <span
                                className={`absolute top-0.5 h-3 overflow-hidden rounded-sm ${late ? 'bg-red-500/30 ring-1 ring-red-400/70' : 'bg-accent/25'}`}
                                style={{ left: `${xp(a.start)}%`, width: `${Math.max(0.4, xp(a.finish) - xp(a.start))}%` }}
                              >
                                <span className={`block h-full ${late ? 'bg-red-500/80' : 'bg-accent/70'}`} style={{ width: `${prog}%` }} />
                              </span>
                            </span>
                            <span className={`text-right font-mono tabular-nums ${v == null ? 'text-mute' : v > 0 ? 'text-amber-700' : v < 0 ? 'text-emerald-700' : 'text-mute'}`}>
                              {v == null ? '—' : v === 0 ? '0' : `${v > 0 ? '+' : ''}${v}`}
                            </span>
                          </button>
                        );
                      })}
                  </div>
                ))}
              <p className="mt-2 text-[11px] text-mute">
                {w.variance}: {en ? 'current finish − baseline finish, in days (+ = later).' : 'одоогийн дуусах огноо − суурь хуваарийн дуусах огноо, хоногоор (+ = хойш).'}
              </p>
            </div>
          </div>
        )}
      </Panel>

      <Panel
        title={w.finTitle}
        action={
          <Link href="/construction/finance" className="text-xs text-accent-hi hover:underline">
            {w.toFinance} →
          </Link>
        }
      >
        <p className="mb-3 text-xs text-mute">{w.finLead}</p>
        {flow.length ? (
          <LineChart
            labels={flow.map((f) => f.month)}
            unit={en ? '₮ mn, cumulative' : 'сая ₮, хуримтлагдсан'}
            series={[
              { name: w.planned, color: '#60a5fa', values: flow.map((f) => Math.round(f.planned)), dashed: true },
              { name: w.paid, color: '#7fa36a', values: flow.map((f) => f.paid) },
            ]}
          />
        ) : (
          <p className="py-6 text-center text-sm text-mute">{t.common.none}</p>
        )}
        {flow.length > 0 && (
          <p className="mt-2 text-xs text-mute">
            {w.planned}: {tug(flow[flow.length - 1].planned, en)}
          </p>
        )}
      </Panel>

      <Drawer open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? `${w.editTitle} · ${edit.id}` : w.newTitle}>
        {edit && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <Field label={w.name}>
              <input className={inputCls} value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} required />
            </Field>
            <Field label={t.common.package}>
              <select className={inputCls} value={edit.pkg} disabled={!!edit.id} onChange={(e) => setEdit({ ...edit, pkg: e.target.value, deps: [] })}>
                {data.packages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {pkgName(p.id)}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={w.start}>
                <input type="date" className={inputCls} value={edit.start} onChange={(e) => setEdit({ ...edit, start: e.target.value })} />
              </Field>
              <Field label={w.finish}>
                <input type="date" className={inputCls} value={edit.finish} onChange={(e) => setEdit({ ...edit, finish: e.target.value })} />
              </Field>
            </div>
            <Field label={t.common.owner}>
              <select className={inputCls} value={edit.owner} onChange={(e) => setEdit({ ...edit, owner: e.target.value })}>
                {data.users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </Field>
            <fieldset className="text-xs text-mute">
              <legend className="mb-1">{w.deps}</legend>
              <div className="max-h-44 space-y-1 overflow-y-auto rounded-lg border border-line p-2" data-lenis-prevent>
                {data.activities
                  .filter((a) => a.id !== edit.id)
                  .map((a) => (
                    <label key={a.id} className="flex cursor-pointer items-center gap-2 text-fg/85">
                      <input
                        type="checkbox"
                        className="accent-accent"
                        checked={edit.deps.includes(a.id)}
                        onChange={(e) => setEdit({ ...edit, deps: e.target.checked ? [...edit.deps, a.id] : edit.deps.filter((x) => x !== a.id) })}
                      />
                      <span className="font-mono text-[10px] text-mute">{a.id}</span> {a.name}
                    </label>
                  ))}
              </div>
            </fieldset>
            <div className="grid grid-cols-2 gap-3">
              <Field label={w.weight}>
                <input type="number" min={1} max={100} className={inputCls} value={edit.weight} onChange={(e) => setEdit({ ...edit, weight: Number(e.target.value) })} />
              </Field>
              <Field label={w.cost}>
                <input type="number" min={0} className={inputCls} value={edit.cost} onChange={(e) => setEdit({ ...edit, cost: Number(e.target.value) })} />
              </Field>
            </div>
            {edit.id && bl?.dates[edit.id] && (
              <p className="text-xs text-mute">
                {w.baseline}: {bl.dates[edit.id].start} → {bl.dates[edit.id].finish}
              </p>
            )}
            <Problems list={problems} />
            <div className="flex gap-2">
              <Btn kind="primary" type="submit">
                {t.common.save}
              </Btn>
              <Btn onClick={() => setEdit(null)}>{t.common.cancel}</Btn>
            </div>
            {edit.id && <p className="text-[11px] text-mute">{t.common.owner}: {name(edit.owner)}</p>}
          </form>
        )}
      </Drawer>
    </div>
  );
}
