'use client';

import { useMemo, useState } from 'react';
import { days, overdueIssue, today } from '@/lib/construction/calc';
import { BRIEFINGS, HOURS, type Briefing, type BriefingKind } from '@/lib/construction/extra/safety';
import { useText, useWords } from '@/lib/construction/text';
import type { IssueState, SafetyKind, SafetyRecord, Severity } from '@/lib/construction/types';
import type { Problem } from '@/lib/construction/validate';
import { LineChart } from '../Charts';
import { useExtra } from '../extra';
import { Btn, Drawer, Field, Forbidden, History, inputCls, Kpi, PageHead, Panel, Pill, Problems, Select, Table, toneOf } from '../Kit';
import { nextId, useStore } from '../Store';
import WorkspaceMap, { type Pick } from '../WorkspaceMap';

// Health & safety on its own page: the shared H&S records (observations, incidents, risk assessments, inspections)
// with their filters, map, monthly trend and per-package picture, plus what this page keeps itself — hours worked
// (for the frequency rates) and the briefing / induction log. A lost-time incident is counted as an incident of high
// severity: the shared record has no separate lost-time flag. Who was hurt and how stays restricted to the roles
// allowed to see it ('safety.restricted').

const STATES: IssueState[] = ['open', 'review', 'resolved'];
const SEVERITIES: Severity[] = ['low', 'medium', 'high'];
const KINDS: SafetyKind[] = ['observation', 'incident', 'risk', 'inspection'];
const BKINDS: BriefingKind[] = ['induction', 'toolbox', 'drill', 'training'];
const KIND_COLOR: Record<SafetyKind, string> = { observation: '#60a5fa', incident: '#f87171', risk: '#2dd4bf', inspection: '#34d399' };

const W = {
  mn: {
    lead: 'Хөдөлмөрийн аюулгүй байдал, эрүүл ахуй: ажиглалт, осол, эрсдэлийн үнэлгээ, үзлэг — хариуцагч, хугацаа, засах арга хэмжээтэй. Ажилласан хүн-цаг, сургалт, зааварчилгааны бүртгэлтэй.',
    incidents: 'Осол, тохиолдол (12 сар)',
    noLti: 'Хөдөлмөрийн чадвар алдсан осолгүй',
    noLtiSub: 'хоног дараалан',
    openObs: 'Нээлттэй ажиглалт',
    overdue: 'Хугацаа хэтэрсэн арга хэмжээ',
    inspMonth: 'Энэ сарын үзлэг',
    inspSub: 'хийсэн / төлөвлөсөн',
    ltifr: 'LTIFR (12 сар)',
    ltifrSub: '1 сая хүн-цагт',
    map: 'Нээлттэй асуудлууд газрын зураг дээр',
    records: 'ХАБЭА-ын бүртгэл',
    add: 'Бүртгэл нэмэх',
    kind: 'Төрөл',
    severity: 'Ач холбогдол',
    title: 'Гарчиг',
    action: 'Засах арга хэмжээ',
    detail: 'Тохиолдлын дэлгэрэнгүй (хязгаарлагдсан)',
    detailInput: 'Хохирогч, гэмтлийн мэдээлэл (хязгаарлагдсан)',
    move: 'Төлөв шилжүүлэх',
    update: 'Арга хэмжээ, хугацаа шинэчлэх',
    trend: 'Бүртгэл сараар',
    hours: 'Ажилласан хүн-цаг сараар',
    hoursUnit: 'мян. хүн-цаг',
    count: 'тоо',
    perPkg: 'Багц бүрээр',
    contractor: 'Гүйцэтгэгч',
    manHours: 'Хүн-цаг (12 сар)',
    total: 'Бүгд',
    open: 'Нээлттэй',
    lastInsp: 'Сүүлийн үзлэг',
    thisMonth: 'Энэ сарын үзлэг',
    done: 'Хийсэн',
    due: 'Хийгээгүй',
    notActive: 'Шаардлагагүй',
    briefings: 'Сургалт, зааварчилгаа',
    addBriefing: 'Сургалт бүртгэх',
    topic: 'Сэдэв',
    people: 'Оролцогч',
    by: 'Зохион байгуулсан',
    bkinds: { induction: 'Танилцуулга (анхан шат)', toolbox: 'Ажлын байрны зааварчилгаа', drill: 'Дадлага, сургуулилалт', training: 'Сургалт' } as Record<BriefingKind, string>,
    search: 'Гарчиг, ID-аар хайх…',
    overdueOnly: 'Хугацаа хэтэрсэн',
    noOwner: 'Хариуцагчгүй',
    lti: 'Хөдөлмөрийн чадвар алдсан осол = өндөр ач холбогдолтой осол (бүртгэлд тусдаа тэмдэглэгээ байхгүй).',
    none: 'Байхгүй',
    m: 'м',
  },
  en: {
    lead: 'Occupational health & safety: observations, incidents, risk assessments and inspections — each with a responsible person, a deadline and a corrective action. With hours worked and the briefing log.',
    incidents: 'Incidents (12 months)',
    noLti: 'Without a lost-time incident',
    noLtiSub: 'days in a row',
    openObs: 'Open observations',
    overdue: 'Overdue actions',
    inspMonth: 'Inspections this month',
    inspSub: 'done / planned',
    ltifr: 'LTIFR (12 months)',
    ltifrSub: 'per million hours',
    map: 'Open issues on the map',
    records: 'H&S records',
    add: 'Add a record',
    kind: 'Type',
    severity: 'Severity',
    title: 'Title',
    action: 'Corrective action',
    detail: 'Incident detail (restricted)',
    detailInput: 'Injured person, injury (restricted)',
    move: 'Change state',
    update: 'Update action and deadline',
    trend: 'Records by month',
    hours: 'Hours worked by month',
    hoursUnit: '’000 hours',
    count: 'count',
    perPkg: 'By package',
    contractor: 'Contractor',
    manHours: 'Hours (12 months)',
    total: 'Total',
    open: 'Open',
    lastInsp: 'Last inspection',
    thisMonth: 'This month’s inspection',
    done: 'Done',
    due: 'Not yet',
    notActive: 'Not required',
    briefings: 'Briefings and training',
    addBriefing: 'Log a briefing',
    topic: 'Topic',
    people: 'Attendees',
    by: 'Led by',
    bkinds: { induction: 'Site induction', toolbox: 'Toolbox talk', drill: 'Drill', training: 'Training' },
    search: 'Search title or ID…',
    overdueOnly: 'Overdue',
    noOwner: 'No owner',
    lti: 'Lost-time incident = an incident of high severity (the record has no separate flag).',
    none: 'None',
    m: 'm',
  },
};
type Words = typeof W.mn;

// the last 12 months, oldest first, ending with this one
const lastMonths = (now: string) => {
  const [y, m] = now.split('-').map(Number);
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 12 + i, 1));
    return d.toISOString().slice(0, 7);
  });
};

export default function Safety() {
  const t = useText();
  const w = useWords(W);
  const { data, can, change, log, user } = useStore();
  const [briefings, setBriefings] = useExtra<Briefing[]>('safety.briefings', BRIEFINGS);
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState<'record' | 'briefing' | null>(null);
  const [f, setF] = useState({ kind: 'all' as 'all' | SafetyKind, pkg: 'all', severity: 'all' as 'all' | Severity, state: 'all' as 'all' | IssueState | 'overdue', q: '' });
  const now = today();
  const months = useMemo(() => lastMonths(now), [now]);
  const name = (id: string) => data.users.find((u) => u.id === id)?.name ?? data.orgs.find((o) => o.id === id)?.name ?? id;
  const pkgName = (id: string) => data.packages.find((p) => p.id === id)?.name ?? id;
  const recs = data.safety;

  // ---- figures ----
  const inYear = recs.filter((r) => r.date.slice(0, 7) >= months[0]);
  const lti = recs.filter((r) => r.kind === 'incident' && r.severity === 'high').sort((a, b) => b.date.localeCompare(a.date));
  const sinceLti = lti.length ? days(lti[0].date, now) : null;
  const hoursOf = (pkg: string) => months.reduce((s, m) => s + (HOURS[pkg]?.[m] ?? 0), 0);
  const hoursYear = data.packages.reduce((s, p) => s + hoursOf(p.id), 0);
  const ltiYear = lti.filter((r) => r.date.slice(0, 7) >= months[0]).length;
  const thisMonth = now.slice(0, 7);
  const active = data.packages.filter((p) => p.status === 'active');
  const inspectedNow = (pkg: string) => recs.some((r) => r.kind === 'inspection' && r.pkg === pkg && r.date.startsWith(thisMonth));
  const overdueCount = recs.filter((r) => overdueIssue(r.due, r.state, now)).length;

  const shown = recs
    .filter(
      (r) =>
        (f.kind === 'all' || r.kind === f.kind) &&
        (f.pkg === 'all' || r.pkg === f.pkg) &&
        (f.severity === 'all' || r.severity === f.severity) &&
        (f.state === 'all' ? true : f.state === 'overdue' ? overdueIssue(r.due, r.state, now) : r.state === f.state) &&
        (!f.q.trim() || `${r.id} ${r.title}`.toLowerCase().includes(f.q.trim().toLowerCase())),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  const sel = recs.find((r) => r.id === open);
  const filtered = f.kind !== 'all' || f.pkg !== 'all' || f.severity !== 'all' || f.state !== 'all' || f.q !== '';

  const move = (id: string, to: IssueState, comment: string) =>
    change('safety.edit', id, to, (d) => {
      const r = d.safety.find((x) => x.id === id);
      if (!r) return;
      r.state = to;
      r.history.push({ at: today(), by: user, action: to, comment: comment || undefined });
    });
  const update = (id: string, next: { action: string; due: string; owner: string }) =>
    change('safety.edit', id, `action / due ${next.due}`, (d) => {
      const r = d.safety.find((x) => x.id === id);
      if (!r) return;
      const what = [r.due !== next.due && `due ${r.due} → ${next.due}`, r.owner !== next.owner && `owner → ${next.owner}`, r.action !== next.action && 'action'].filter(Boolean).join('; ');
      Object.assign(r, next);
      r.history.push({ at: today(), by: user, action: what || 'updated' });
    });

  return (
    <div className="space-y-6">
      <PageHead
        title={t.section.safety}
        lead={w.lead}
        action={
          can('safety.edit') ? (
            <Btn kind="primary" onClick={() => setAdding('record')}>
              + {w.add}
            </Btn>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi label={w.incidents} value={inYear.filter((r) => r.kind === 'incident').length} tone={inYear.some((r) => r.kind === 'incident' && r.severity === 'high') ? 'bad' : inYear.some((r) => r.kind === 'incident') ? 'warn' : 'good'} />
        <Kpi label={w.noLti} value={sinceLti ?? '—'} sub={w.noLtiSub} tone={sinceLti == null || sinceLti > 180 ? 'good' : 'warn'} />
        <Kpi label={w.openObs} value={recs.filter((r) => r.kind === 'observation' && r.state !== 'resolved').length} tone={recs.some((r) => r.kind === 'observation' && r.state === 'open' && r.severity === 'high') ? 'warn' : 'neutral'} />
        <Kpi label={w.overdue} value={overdueCount} tone={overdueCount ? 'bad' : 'good'} />
        <Kpi label={w.inspMonth} value={`${active.filter((p) => inspectedNow(p.id)).length} / ${active.length}`} sub={w.inspSub} tone={active.every((p) => inspectedNow(p.id)) ? 'good' : 'warn'} />
        <Kpi label={w.ltifr} value={hoursYear ? ((ltiYear * 1e6) / hoursYear).toFixed(2) : '—'} sub={`${w.ltifrSub} · ${(hoursYear / 1000).toFixed(0)}k`} tone={ltiYear ? 'warn' : 'good'} />
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Panel title={w.map}>
          <WorkspaceMap data={data} layers={['issues', 'packages']} selected={open} onPick={(p: Pick) => p.kind === 'safety' && setOpen(p.id)} height="h-[300px] sm:h-[340px]" />
        </Panel>
        <div className="space-y-6">
          <Panel title={w.trend}>
            <LineChart
              labels={months.map((m) => m.slice(2).replace('-', '/'))}
              unit={w.count}
              height={170}
              max={Math.max(3, ...KINDS.flatMap((k) => months.map((m) => recs.filter((r) => r.kind === k && r.date.startsWith(m)).length)))}
              series={KINDS.map((k) => ({ name: t.safetyKind[k], color: KIND_COLOR[k], values: months.map((m) => recs.filter((r) => r.kind === k && r.date.startsWith(m)).length) }))}
            />
          </Panel>
          <Panel title={w.hours}>
            <LineChart
              labels={months.map((m) => m.slice(2).replace('-', '/'))}
              unit={w.hoursUnit}
              height={150}
              series={[{ name: w.total, color: '#60a5fa', values: months.map((m) => Math.round(data.packages.reduce((s, p) => s + (HOURS[p.id]?.[m] ?? 0), 0) / 100) / 10) }]}
            />
          </Panel>
        </div>
      </div>

      <Panel title={w.records}>
        <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Select label={w.kind} value={f.kind} onChange={(v) => setF((x) => ({ ...x, kind: v }))} options={[['all', t.filter.all], ...KINDS.map((k) => [k, t.safetyKind[k]] as [SafetyKind, string])]} />
          <Select label={t.common.package} value={f.pkg} onChange={(v) => setF((x) => ({ ...x, pkg: v }))} options={[['all', t.filter.all], ...data.packages.map((p) => [p.id, p.id] as [string, string])]} />
          <Select label={w.severity} value={f.severity} onChange={(v) => setF((x) => ({ ...x, severity: v }))} options={[['all', t.filter.all], ...SEVERITIES.map((s) => [s, t.severity[s]] as [Severity, string])]} />
          <Select label={t.filter.status} value={f.state} onChange={(v) => setF((x) => ({ ...x, state: v }))} options={[['all', t.filter.all], ...STATES.map((s) => [s, t.issueState[s]] as [IssueState, string]), ['overdue', w.overdueOnly]]} />
          <label className="col-span-2 flex flex-col gap-1 text-xs text-mute">
            {t.filter.search.replace('…', '')}
            <input className={inputCls} value={f.q} placeholder={w.search} onChange={(e) => setF((x) => ({ ...x, q: e.target.value }))} />
          </label>
        </div>
        {filtered && (
          <button type="button" className="mb-3 min-h-10 cursor-pointer text-xs text-accent-hi hover:underline" onClick={() => setF({ kind: 'all', pkg: 'all', severity: 'all', state: 'all', q: '' })}>
            {t.filter.clear} ({shown.length} / {recs.length})
          </button>
        )}
        <Table head={[t.common.date, 'ID', w.title, w.kind, t.common.package, w.severity, t.common.owner, t.common.due, t.common.status]} empty={!shown.length}>
          {shown.map((r) => {
            const late = overdueIssue(r.due, r.state, now);
            return (
              <tr key={r.id} className={`cursor-pointer align-top hover:bg-surface/60 ${late ? 'bg-red-500/[0.04]' : ''}`} onClick={() => setOpen(r.id)}>
                <td className="px-2 py-2 font-mono text-xs text-mute">{r.date}</td>
                <td className="px-2 py-2 font-mono text-xs">
                  <button type="button" className="min-h-8 cursor-pointer underline-offset-2 hover:underline" onClick={() => setOpen(r.id)}>
                    {r.id}
                  </button>
                </td>
                <td className="px-2 py-2">
                  {r.title}
                  {r.detail !== undefined && <span className="ml-1 text-[11px] text-mute">🔒</span>}
                </td>
                <td className="px-2 py-2 text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: KIND_COLOR[r.kind] }} />
                    {t.safetyKind[r.kind]}
                  </span>
                </td>
                <td className="px-2 py-2 font-mono text-xs">{r.pkg}</td>
                <td className="px-2 py-2">
                  <Pill tone={toneOf(r.severity)}>{t.severity[r.severity]}</Pill>
                </td>
                <td className="px-2 py-2 text-xs">{name(r.owner)}</td>
                <td className={`px-2 py-2 font-mono text-xs ${late ? 'text-red-700' : 'text-mute'}`}>{r.due}</td>
                <td className="px-2 py-2">
                  <span className="flex flex-wrap gap-1">
                    <Pill tone={toneOf(r.state)}>{t.issueState[r.state]}</Pill>
                    {late && <Pill tone="bad">{t.common.overdue}</Pill>}
                  </span>
                </td>
              </tr>
            );
          })}
        </Table>
      </Panel>

      <Panel title={w.perPkg}>
        <Table head={[t.common.package, w.contractor, w.manHours, w.total, w.open, t.common.overdue, t.safetyKind.incident, 'LTIFR', w.lastInsp, w.thisMonth]}>
          {data.packages.map((p) => {
            const rs = recs.filter((r) => r.pkg === p.id);
            const h = hoursOf(p.id);
            const l = lti.filter((r) => r.pkg === p.id && r.date.slice(0, 7) >= months[0]).length;
            const last = rs.filter((r) => r.kind === 'inspection').sort((a, b) => b.date.localeCompare(a.date))[0];
            const od = rs.filter((r) => overdueIssue(r.due, r.state, now)).length;
            return (
              <tr key={p.id} className="cursor-pointer align-top hover:bg-surface/60" onClick={() => setF((x) => ({ ...x, pkg: p.id }))}>
                <td className="px-2 py-2">
                  <span className="font-mono text-xs">{p.id}</span>
                  <span className="block text-xs text-mute">{p.name}</span>
                </td>
                <td className="px-2 py-2 text-xs">{p.contractor ? name(p.contractor) : '—'}</td>
                <td className="px-2 py-2 font-mono text-xs">{h ? h.toLocaleString('en-US') : '—'}</td>
                <td className="px-2 py-2 font-mono text-xs">{rs.length}</td>
                <td className="px-2 py-2 font-mono text-xs">{rs.filter((r) => r.state !== 'resolved').length}</td>
                <td className={`px-2 py-2 font-mono text-xs ${od ? 'text-red-700' : ''}`}>{od}</td>
                <td className="px-2 py-2 font-mono text-xs">{rs.filter((r) => r.kind === 'incident').length}</td>
                <td className="px-2 py-2 font-mono text-xs">{h ? ((l * 1e6) / h).toFixed(2) : '—'}</td>
                <td className="px-2 py-2 font-mono text-xs text-mute">{last?.date ?? '—'}</td>
                <td className="px-2 py-2">{p.status !== 'active' ? <span className="text-xs text-mute">{w.notActive}</span> : inspectedNow(p.id) ? <Pill tone="good">{w.done}</Pill> : <Pill tone="warn">{w.due}</Pill>}</td>
              </tr>
            );
          })}
        </Table>
        <p className="mt-3 text-xs text-mute">{w.lti}</p>
      </Panel>

      <Panel title={w.briefings} action={can('safety.edit') ? <Btn onClick={() => setAdding('briefing')}>+ {w.addBriefing}</Btn> : <Forbidden />}>
        <Table head={[t.common.date, 'ID', w.kind, w.topic, t.common.package, w.people, w.by]} empty={!briefings.length}>
          {[...briefings]
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((b) => (
              <tr key={b.id} className="align-top">
                <td className="px-2 py-2 font-mono text-xs text-mute">{b.date}</td>
                <td className="px-2 py-2 font-mono text-xs">{b.id}</td>
                <td className="px-2 py-2 text-xs">{w.bkinds[b.kind]}</td>
                <td className="px-2 py-2">{b.topic}</td>
                <td className="px-2 py-2 font-mono text-xs">{b.pkg}</td>
                <td className="px-2 py-2 font-mono text-xs">{b.people}</td>
                <td className="px-2 py-2 text-xs">{name(b.by)}</td>
              </tr>
            ))}
        </Table>
      </Panel>

      <Drawer open={!!sel} onClose={() => setOpen(null)} title={sel ? `${sel.id} · ${sel.title}` : ''}>
        {sel && <RecordDetail key={sel.id} r={sel} w={w} name={name} pkgName={pkgName} onMove={(to, c) => move(sel.id, to, c)} onUpdate={(n) => update(sel.id, n)} />}
      </Drawer>
      <Drawer open={adding === 'record'} onClose={() => setAdding(null)} title={w.add}>
        {adding === 'record' && <NewRecord w={w} onDone={() => setAdding(null)} />}
      </Drawer>
      <Drawer open={adding === 'briefing'} onClose={() => setAdding(null)} title={w.addBriefing}>
        {adding === 'briefing' && (
          <NewBriefing
            w={w}
            onSave={(b) => {
              if (!log('safety.edit', 'briefing', `${b.kind}: ${b.topic}`)) return false;
              setBriefings((all) => [...all, { ...b, id: nextId('TB', all.map((x) => x.id)), by: user }]);
              return true;
            }}
            onDone={() => setAdding(null)}
          />
        )}
      </Drawer>
    </div>
  );
}

function RecordDetail({ r, w, name, pkgName, onMove, onUpdate }: { r: SafetyRecord; w: Words; name: (id: string) => string; pkgName: (id: string) => string; onMove: (to: IssueState, comment: string) => boolean; onUpdate: (n: { action: string; due: string; owner: string }) => boolean }) {
  const t = useText();
  const { can, data } = useStore();
  const [comment, setComment] = useState('');
  const [edit, setEdit] = useState({ action: r.action, due: r.due, owner: r.owner });
  const [problems, setProblems] = useState<Problem[]>([]);
  const late = overdueIssue(r.due, r.state, today());
  const allowed = can('safety.edit');
  return (
    <div className="space-y-5 text-sm">
      <div className="flex flex-wrap gap-1.5">
        <Pill>{t.safetyKind[r.kind]}</Pill>
        <Pill tone={toneOf(r.severity)}>{t.severity[r.severity]}</Pill>
        <Pill tone={toneOf(r.state)}>{t.issueState[r.state]}</Pill>
        {late && <Pill tone="bad">{t.common.overdue}</Pill>}
      </div>
      <dl className="space-y-1.5 text-xs">
        {(
          [
            [t.common.package, `${r.pkg} · ${pkgName(r.pkg)}`],
            [t.common.date, r.date],
            [t.common.owner, name(r.owner)],
            [t.common.due, late ? `${r.due} (${days(r.due, today())} ${t.common.days})` : r.due],
            [w.action, r.action || '—'],
            [t.common.onMap, r.at ? `${r.at[0]}, ${r.at[1]} ${w.m}` : t.common.noGeom],
          ] as [string, string][]
        ).map(([k, v]) => (
          <div key={k} className="grid grid-cols-[8rem_1fr] gap-3 border-b border-line/50 pb-1.5">
            <dt className="text-mute">{k}</dt>
            <dd className="text-fg/90">{v}</dd>
          </div>
        ))}
      </dl>
      {r.detail !== undefined && (
        <div className="rounded-lg border border-line p-3 text-xs">
          <p className="text-mute">{w.detail}</p>
          <p className="mt-1">{can('safety.restricted') ? r.detail : `🔒 ${t.common.restricted}`}</p>
        </div>
      )}
      {allowed ? (
        <>
          <div className="space-y-2">
            <p className="text-xs text-mute">{w.move}</p>
            <Field label={t.common.comment}>
              <input className={`${inputCls} h-10`} value={comment} onChange={(e) => setComment(e.target.value)} />
            </Field>
            <div className="flex flex-wrap gap-2">
              {STATES.filter((s) => s !== r.state).map((s) => (
                <Btn
                  key={s}
                  kind={s === 'resolved' ? 'primary' : 'ghost'}
                  onClick={() => {
                    if (onMove(s, comment)) setComment('');
                  }}
                >
                  → {t.issueState[s]}
                </Btn>
              ))}
            </div>
          </div>
          <form
            className="space-y-2 rounded-lg border border-line p-3"
            onSubmit={(e) => {
              e.preventDefault();
              const p: Problem[] = [];
              if (!edit.due) p.push({ field: 'due', code: 'required' });
              else if (edit.due < r.date) p.push({ field: 'due', code: 'dateOrder' });
              setProblems(p);
              if (!p.length && !onUpdate(edit)) setProblems([{ field: 'role', code: 'forbidden' }]);
            }}
          >
            <p className="text-xs text-mute">{w.update}</p>
            <Field label={w.action}>
              <textarea className={`${inputCls} h-16 py-1.5`} value={edit.action} onChange={(e) => setEdit((x) => ({ ...x, action: e.target.value }))} />
            </Field>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Field label={t.common.due}>
                <input type="date" className={`${inputCls} h-10`} value={edit.due} onChange={(e) => setEdit((x) => ({ ...x, due: e.target.value }))} />
              </Field>
              <Select label={t.common.owner} value={edit.owner} onChange={(v) => setEdit((x) => ({ ...x, owner: v }))} options={data.users.map((u) => [u.id, u.name] as [string, string])} />
            </div>
            <Problems list={problems} />
            <Btn type="submit">{t.common.save}</Btn>
          </form>
        </>
      ) : (
        <Forbidden />
      )}
      <div>
        <p className="mb-2 text-xs text-mute">{t.common.history}</p>
        <History items={[...r.history].reverse()} name={name} />
      </div>
    </div>
  );
}

function NewRecord({ w, onDone }: { w: Words; onDone: () => void }) {
  const t = useText();
  const { data, change, user, can } = useStore();
  const [f, setF] = useState({ title: '', kind: 'observation' as SafetyKind, pkg: data.packages.find((p) => p.status === 'active')?.id ?? data.packages[0]?.id ?? '', severity: 'medium' as Severity, owner: user, date: today(), due: '', action: '', detail: '' });
  const [problems, setProblems] = useState<Problem[]>([]);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const save = () => {
    const p: Problem[] = [];
    if (!f.title.trim()) p.push({ field: 'title', code: 'required' });
    if (!f.due) p.push({ field: 'due', code: 'required' });
    else if (f.due < f.date) p.push({ field: 'due', code: 'dateOrder' });
    setProblems(p);
    if (p.length) return;
    const pkg = data.packages.find((x) => x.id === f.pkg)!;
    // placed at the package's centre until a precise point is picked on site
    const at: [number, number] = [pkg.geom.x + pkg.geom.w / 2, pkg.geom.y + pkg.geom.h / 2];
    const ok = change('safety.edit', 'safety', f.title, (d) => {
      d.safety.push({
        id: nextId('HS', d.safety.map((x) => x.id)),
        kind: f.kind,
        pkg: f.pkg,
        title: f.title.trim(),
        severity: f.severity,
        owner: f.owner,
        date: f.date,
        due: f.due,
        action: f.action.trim(),
        state: f.kind === 'inspection' ? 'resolved' : 'open',
        detail: f.kind === 'incident' && f.detail.trim() && can('safety.restricted') ? f.detail.trim() : undefined,
        at,
        history: [{ at: today(), by: user, action: f.kind === 'inspection' ? 'resolved' : 'opened' }],
      });
    });
    if (!ok) setProblems([{ field: 'role', code: 'forbidden' }]);
    else onDone();
  };
  const err = (k: string) => {
    const p = problems.find((x) => x.field === k);
    return p ? t.problem[p.code] : undefined;
  };
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <Field label={w.title} error={err('title')}>
        <input className={`${inputCls} h-10`} value={f.title} onChange={(e) => set('title', e.target.value)} required />
      </Field>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Select label={w.kind} value={f.kind} onChange={(v) => set('kind', v)} options={KINDS.map((k) => [k, t.safetyKind[k]])} />
        <Select label={t.common.package} value={f.pkg} onChange={(v) => set('pkg', v)} options={data.packages.map((p) => [p.id, `${p.id} · ${p.name}`])} />
        <Select label={w.severity} value={f.severity} onChange={(v) => set('severity', v)} options={SEVERITIES.map((s) => [s, t.severity[s]])} />
        <Select label={t.common.owner} value={f.owner} onChange={(v) => set('owner', v)} options={data.users.map((u) => [u.id, u.name] as [string, string])} />
        <Field label={t.common.date}>
          <input type="date" className={`${inputCls} h-10`} value={f.date} max={today()} onChange={(e) => set('date', e.target.value)} />
        </Field>
        <Field label={t.common.due} error={err('due')}>
          <input type="date" className={`${inputCls} h-10`} value={f.due} onChange={(e) => set('due', e.target.value)} required />
        </Field>
      </div>
      <Field label={w.action}>
        <textarea className={`${inputCls} h-20 py-1.5`} value={f.action} onChange={(e) => set('action', e.target.value)} />
      </Field>
      {f.kind === 'incident' &&
        (can('safety.restricted') ? (
          <Field label={w.detailInput}>
            <textarea className={`${inputCls} h-16 py-1.5`} value={f.detail} onChange={(e) => set('detail', e.target.value)} />
          </Field>
        ) : (
          <p className="text-xs text-mute">🔒 {t.common.restricted}</p>
        ))}
      <Problems list={problems.filter((p) => p.code === 'forbidden')} />
      <div className="flex gap-2">
        <Btn kind="primary" type="submit">
          {t.common.save}
        </Btn>
        <Btn onClick={onDone}>{t.common.cancel}</Btn>
      </div>
    </form>
  );
}

function NewBriefing({ w, onSave, onDone }: { w: Words; onSave: (b: Omit<Briefing, 'id' | 'by'>) => boolean; onDone: () => void }) {
  const t = useText();
  const { data } = useStore();
  const [f, setF] = useState({ date: today(), pkg: data.packages[0]?.id ?? '', kind: 'toolbox' as BriefingKind, topic: '', people: '' });
  const [problems, setProblems] = useState<Problem[]>([]);
  const save = () => {
    const p: Problem[] = [];
    if (!f.topic.trim()) p.push({ field: 'topic', code: 'required' });
    const n = Number(f.people);
    if (!Number.isInteger(n) || n < 1 || n > 2000) p.push({ field: 'people', code: 'range' });
    setProblems(p);
    if (p.length) return;
    if (!onSave({ date: f.date, pkg: f.pkg, kind: f.kind, topic: f.topic.trim(), people: n })) setProblems([{ field: 'role', code: 'forbidden' }]);
    else onDone();
  };
  const err = (k: string) => {
    const p = problems.find((x) => x.field === k);
    return p ? t.problem[p.code] : undefined;
  };
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <Field label={w.topic} error={err('topic')}>
        <input className={`${inputCls} h-10`} value={f.topic} onChange={(e) => setF((x) => ({ ...x, topic: e.target.value }))} />
      </Field>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Select label={w.kind} value={f.kind} onChange={(v) => setF((x) => ({ ...x, kind: v }))} options={BKINDS.map((k) => [k, w.bkinds[k]])} />
        <Select label={t.common.package} value={f.pkg} onChange={(v) => setF((x) => ({ ...x, pkg: v }))} options={data.packages.map((p) => [p.id, `${p.id} · ${p.name}`])} />
        <Field label={t.common.date}>
          <input type="date" className={`${inputCls} h-10`} value={f.date} max={today()} onChange={(e) => setF((x) => ({ ...x, date: e.target.value }))} />
        </Field>
        <Field label={w.people} error={err('people')}>
          <input type="number" inputMode="numeric" className={`${inputCls} h-10`} value={f.people} onChange={(e) => setF((x) => ({ ...x, people: e.target.value }))} />
        </Field>
      </div>
      <Problems list={problems.filter((p) => p.code === 'forbidden')} />
      <div className="flex gap-2">
        <Btn kind="primary" type="submit">
          {t.common.save}
        </Btn>
        <Btn onClick={onDone}>{t.common.cancel}</Btn>
      </div>
    </form>
  );
}
