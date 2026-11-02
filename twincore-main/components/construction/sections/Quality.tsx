'use client';

import { useMemo, useState } from 'react';
import { overdueIssue, today } from '@/lib/construction/calc';
import { useText, useWords } from '@/lib/construction/text';
import type { Defect, IssueState, SafetyKind, SafetyRecord, Severity } from '@/lib/construction/types';
import type { Problem } from '@/lib/construction/validate';
import { Btn, Drawer, Field, Forbidden, History, inputCls, Kpi, PageHead, Panel, Pill, Problems, Select, Table, toneOf } from '../Kit';
import { useStore, nextId } from '../Store';
import WorkspaceMap, { type Pick } from '../WorkspaceMap';

// QA/QC and health & safety: two workflows side by side, sharing the map. Quality follows inspections (materials and
// work, checklists, pass / fail) and the nonconformities they raise; safety follows observations, incidents, risk
// assessments and inspections. Both carry a corrective action, a responsible person, a deadline and a state
// (open → under review → resolved). What happened to the people in an incident is restricted to roles allowed to see it.

const STATES: IssueState[] = ['open', 'review', 'resolved'];
const SEVERITIES: Severity[] = ['low', 'medium', 'high'];
const KINDS: SafetyKind[] = ['observation', 'incident', 'risk', 'inspection'];

export default function Quality() {
  const t = useText();
  const w = useWords({
    mn: {
      lead: 'Материал, ажлын чанарын шалгалт ба үл тохирол; аюулгүй ажиллагааны ажиглалт, осол, эрсдэл, үзлэг — хариуцагч, хугацаа, засах арга хэмжээтэй.',
      quality: 'Чанар (QA/QC)',
      safety: 'ХАБЭА',
      inspections: 'Шалгалт',
      defects: 'Үл тохирол, гэмтэл',
      records: 'ХАБЭА-ын бүртгэл',
      material: 'Материал',
      work: 'Ажил',
      pass: 'Тэнцсэн',
      fail: 'Тэнцээгүй',
      checklist: 'Шалгах хуудас',
      open: 'Нээлттэй',
      review: 'Хянагдаж буй',
      overdue: 'Хугацаа хэтэрсэн',
      severity: 'Ач холбогдол',
      action: 'Засах арга хэмжээ',
      inspection: 'Шалгалт',
      kind: 'Төрөл',
      newDefect: 'Үл тохирол бүртгэх',
      newSafety: 'ХАБЭА бүртгэл нэмэх',
      title: 'Гарчиг',
      move: 'Төлөв шилжүүлэх',
      detail: 'Тохиолдлын дэлгэрэнгүй (хязгаарлагдсан)',
      map: 'Нээлттэй асуудлууд газрын зураг дээр',
      none: 'Холбоогүй',
    },
    en: {
      lead: 'Material and work inspections and nonconformities; safety observations, incidents, risks and inspections — each with a responsible person, a deadline and a corrective action.',
      quality: 'Quality (QA/QC)',
      safety: 'Health & safety',
      inspections: 'Inspections',
      defects: 'Nonconformities and defects',
      records: 'H&S records',
      material: 'Material',
      work: 'Work',
      pass: 'Pass',
      fail: 'Fail',
      checklist: 'Checklist',
      open: 'Open',
      review: 'Under review',
      overdue: 'Overdue',
      severity: 'Severity',
      action: 'Corrective action',
      inspection: 'Inspection',
      kind: 'Type',
      newDefect: 'Record a nonconformity',
      newSafety: 'Add an H&S record',
      title: 'Title',
      move: 'Change state',
      detail: 'Incident detail (restricted)',
      map: 'Open issues on the map',
      none: 'None',
    },
  });
  const { data, can, change, user } = useStore();
  const [tab, setTab] = useState<'quality' | 'safety'>('quality');
  const [open, setOpen] = useState<Pick | null>(null);
  const [adding, setAdding] = useState(false);
  const name = (id: string) => data.users.find((u) => u.id === id)?.name ?? data.orgs.find((o) => o.id === id)?.name ?? id;
  const now = today();

  const count = (xs: { state: IssueState; due: string }[]) => ({
    open: xs.filter((x) => x.state === 'open').length,
    review: xs.filter((x) => x.state === 'review').length,
    overdue: xs.filter((x) => overdueIssue(x.due, x.state, now)).length,
  });
  const qc = count(data.defects);
  const sc = count(data.safety);

  const defect = open?.kind === 'defect' ? data.defects.find((d) => d.id === open.id) : undefined;
  const safety = open?.kind === 'safety' ? data.safety.find((s) => s.id === open.id) : undefined;
  const pkgName = (id: string) => data.packages.find((p) => p.id === id)?.name ?? id;

  const onPick = (p: Pick) => {
    if (p.kind === 'defect') setTab('quality');
    if (p.kind === 'safety') setTab('safety');
    if (p.kind === 'defect' || p.kind === 'safety') setOpen(p);
  };

  const move = (kind: 'defect' | 'safety', id: string, to: IssueState, comment: string) =>
    change(kind === 'defect' ? 'quality.edit' : 'safety.edit', id, `${to}`, (d) => {
      const rec = (kind === 'defect' ? d.defects : d.safety).find((x) => x.id === id);
      if (!rec) return;
      rec.state = to;
      rec.history.push({ at: today(), by: user, action: to, comment: comment || undefined });
    });

  return (
    <div className="space-y-6">
      <PageHead title={t.section.quality} lead={w.lead} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi label={`${w.quality} · ${w.open}`} value={qc.open} />
        <Kpi label={`${w.quality} · ${w.review}`} value={qc.review} tone={qc.review ? 'info' : 'neutral'} />
        <Kpi label={`${w.quality} · ${w.overdue}`} value={qc.overdue} tone={qc.overdue ? 'bad' : 'good'} />
        <Kpi label={`${w.safety} · ${w.open}`} value={sc.open} />
        <Kpi label={`${w.safety} · ${w.review}`} value={sc.review} tone={sc.review ? 'info' : 'neutral'} />
        <Kpi label={`${w.safety} · ${w.overdue}`} value={sc.overdue} tone={sc.overdue ? 'bad' : 'good'} />
      </div>

      <Panel title={w.map}>
        <WorkspaceMap data={data} layers={['issues', 'packages']} selected={open?.id ?? null} onPick={onPick} height="h-[340px]" />
      </Panel>

      <div role="tablist" className="flex gap-1.5">
        {(['quality', 'safety'] as const).map((k) => (
          <button
            key={k}
            role="tab"
            type="button"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={`cursor-pointer rounded-full border px-4 py-1.5 text-sm transition-colors ${tab === k ? 'border-accent/50 bg-accent/10 text-fg' : 'border-line text-mute hover:text-fg'}`}
          >
            {w[k]}
          </button>
        ))}
      </div>

      {tab === 'quality' ? (
        <>
          <Panel title={w.inspections}>
            <Table head={[t.common.date, 'ID', w.title, w.kind, t.common.package, w.checklist, t.common.status]} empty={!data.inspections.length}>
              {[...data.inspections]
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((i) => (
                  <tr key={i.id} className="align-top">
                    <td className="px-2 py-2 font-mono text-xs text-mute">{i.date}</td>
                    <td className="px-2 py-2 font-mono text-xs">{i.id}</td>
                    <td className="px-2 py-2">{i.title}</td>
                    <td className="px-2 py-2 text-xs text-mute">{w[i.kind]}</td>
                    <td className="px-2 py-2 font-mono text-xs">{i.pkg}</td>
                    <td className="px-2 py-2 text-xs">
                      <ul className="space-y-0.5">
                        {i.checklist.map((c) => (
                          <li key={c.item} className={c.ok ? 'text-fg/80' : 'text-red-300'}>
                            {c.ok ? '✓' : '✕'} {c.item}
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="px-2 py-2">
                      <Pill tone={toneOf(i.result)}>{w[i.result]}</Pill>
                    </td>
                  </tr>
                ))}
            </Table>
          </Panel>
          <Panel title={w.defects} action={can('quality.edit') ? <Btn onClick={() => setAdding(true)}>+ {w.newDefect}</Btn> : <Forbidden />}>
            <IssueTable
              rows={data.defects}
              now={now}
              head={[t.common.due, 'ID', w.title, w.severity, t.common.owner, w.inspection, t.common.status]}
              cells={(d: Defect) => [d.title, t.severity[d.severity], name(d.owner), d.inspection ?? w.none]}
              severity={(d: Defect) => d.severity}
              onOpen={(id) => setOpen({ kind: 'defect', id })}
            />
          </Panel>
        </>
      ) : (
        <Panel title={w.records} action={can('safety.edit') ? <Btn onClick={() => setAdding(true)}>+ {w.newSafety}</Btn> : <Forbidden />}>
          <IssueTable
            rows={data.safety}
            now={now}
            head={[t.common.due, 'ID', w.title, w.kind, t.common.owner, w.severity, t.common.status]}
            cells={(s: SafetyRecord) => [s.title, t.safetyKind[s.kind], name(s.owner), t.severity[s.severity]]}
            severity={(s: SafetyRecord) => s.severity}
            onOpen={(id) => setOpen({ kind: 'safety', id })}
          />
        </Panel>
      )}

      {/* a record's detail */}
      <Drawer open={!!(defect || safety)} onClose={() => setOpen(null)} title={defect ? `${defect.id} · ${defect.title}` : safety ? `${safety.id} · ${safety.title}` : ''}>
        {defect && (
          <RecordDetail
            kind="defect"
            rows={[
              [t.common.package, `${defect.pkg} · ${pkgName(defect.pkg)}`],
              [w.inspection, defect.inspection ? `${defect.inspection} · ${data.inspections.find((i) => i.id === defect.inspection)?.title ?? ''}` : w.none],
              [w.severity, t.severity[defect.severity]],
              [t.common.owner, name(defect.owner)],
              [t.common.due, defect.due],
              [w.action, defect.action],
            ]}
            state={defect.state}
            overdue={overdueIssue(defect.due, defect.state, now)}
            history={defect.history}
            name={name}
            allowed={can('quality.edit')}
            onMove={(to, c) => move('defect', defect.id, to, c)}
          />
        )}
        {safety && (
          <RecordDetail
            kind="safety"
            rows={[
              [w.kind, t.safetyKind[safety.kind]],
              [t.common.package, `${safety.pkg} · ${pkgName(safety.pkg)}`],
              [t.common.date, safety.date],
              [w.severity, t.severity[safety.severity]],
              [t.common.owner, name(safety.owner)],
              [t.common.due, safety.due],
              [w.action, safety.action],
            ]}
            restricted={safety.detail !== undefined ? { label: w.detail, text: can('safety.restricted') ? safety.detail : null } : undefined}
            state={safety.state}
            overdue={overdueIssue(safety.due, safety.state, now)}
            history={safety.history}
            name={name}
            allowed={can('safety.edit')}
            onMove={(to, c) => move('safety', safety.id, to, c)}
          />
        )}
      </Drawer>

      <Drawer open={adding} onClose={() => setAdding(false)} title={tab === 'quality' ? w.newDefect : w.newSafety}>
        <NewIssue kind={tab === 'quality' ? 'defect' : 'safety'} onDone={() => setAdding(false)} words={w} />
      </Drawer>
    </div>
  );
}

// the issues table, shared by nonconformities and H&S records: overdue rows marked, newest deadline first
function IssueTable<R extends { id: string; due: string; state: IssueState }>({
  rows,
  now,
  head,
  cells,
  severity,
  onOpen,
}: {
  rows: R[];
  now: string;
  head: string[];
  cells: (r: R) => [string, string, string, string];
  severity: (r: R) => Severity;
  onOpen: (id: string) => void;
}) {
  const t = useText();
  const [state, setState] = useState<'all' | IssueState | 'overdue'>('all');
  const shown = rows
    .filter((r) => (state === 'all' ? true : state === 'overdue' ? overdueIssue(r.due, r.state, now) : r.state === state))
    .sort((a, b) => a.due.localeCompare(b.due));
  return (
    <>
      <div className="mb-3 max-w-[220px]">
        <Select
          label={t.filter.status}
          value={state}
          onChange={setState}
          options={[['all', t.filter.all], ...STATES.map((s) => [s, t.issueState[s]] as [IssueState, string]), ['overdue', t.common.overdue]]}
        />
      </div>
      <Table head={head} empty={!shown.length}>
        {shown.map((r) => {
          const late = overdueIssue(r.due, r.state, now);
          const [title, a, b, c] = cells(r);
          return (
            <tr key={r.id} className={`cursor-pointer hover:bg-surface/60 ${late ? 'bg-red-400/[0.04]' : ''}`} onClick={() => onOpen(r.id)}>
              <td className={`px-2 py-2 font-mono text-xs ${late ? 'text-red-300' : 'text-mute'}`}>{r.due}</td>
              <td className="px-2 py-2 font-mono text-xs">
                <button type="button" className="cursor-pointer underline-offset-2 hover:underline" onClick={() => onOpen(r.id)}>
                  {r.id}
                </button>
              </td>
              <td className="px-2 py-2">{title}</td>
              <td className="px-2 py-2 text-xs text-mute">{a}</td>
              <td className="px-2 py-2 text-xs">{b}</td>
              <td className="px-2 py-2">{c === '' ? null : <Pill tone={toneOf(severity(r))}>{c}</Pill>}</td>
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
    </>
  );
}

function RecordDetail({
  kind,
  rows,
  restricted,
  state,
  overdue,
  history,
  name,
  allowed,
  onMove,
}: {
  kind: 'defect' | 'safety';
  rows: [string, string][];
  restricted?: { label: string; text: string | null };
  state: IssueState;
  overdue: boolean;
  history: { at: string; by: string; action: string; comment?: string }[];
  name: (id: string) => string;
  allowed: boolean;
  onMove: (to: IssueState, comment: string) => boolean;
}) {
  const t = useText();
  const [comment, setComment] = useState('');
  const next = STATES.filter((s) => s !== state);
  return (
    <div className="space-y-5 text-sm" data-kind={kind}>
      <div className="flex flex-wrap gap-1.5">
        <Pill tone={toneOf(state)}>{t.issueState[state]}</Pill>
        {overdue && <Pill tone="bad">{t.common.overdue}</Pill>}
      </div>
      <dl className="space-y-1.5 text-xs">
        {rows.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[8rem_1fr] gap-3 border-b border-line/50 pb-1.5">
            <dt className="text-mute">{k}</dt>
            <dd className="text-fg/90">{v}</dd>
          </div>
        ))}
      </dl>
      {restricted && (
        <div className="rounded-lg border border-line p-3 text-xs">
          <p className="text-mute">{restricted.label}</p>
          <p className="mt-1">{restricted.text ?? `🔒 ${t.common.restricted}`}</p>
        </div>
      )}
      {allowed ? (
        <div className="space-y-2">
          <Field label={t.common.comment}>
            <input className={inputCls} value={comment} onChange={(e) => setComment(e.target.value)} />
          </Field>
          <div className="flex flex-wrap gap-2">
            {next.map((s) => (
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
      ) : (
        <Forbidden />
      )}
      <div>
        <p className="mb-2 text-xs text-mute">{t.common.history}</p>
        <History items={history} name={name} />
      </div>
    </div>
  );
}

function NewIssue({ kind, onDone, words: w }: { kind: 'defect' | 'safety'; onDone: () => void; words: { title: string; severity: string; action: string; kind: string; inspection: string; none: string } }) {
  const t = useText();
  const { data, change, user, can } = useStore();
  const [f, setF] = useState({ title: '', pkg: data.packages[0]?.id ?? '', severity: 'medium' as Severity, owner: user, due: '', action: '', inspection: '', skind: 'observation' as SafetyKind, detail: '' });
  const [problems, setProblems] = useState<Problem[]>([]);
  const owners = useMemo(() => data.users.map((u) => [u.id, u.name] as [string, string]), [data.users]);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));

  const save = () => {
    const p: Problem[] = [];
    if (!f.title.trim()) p.push({ field: 'title', code: 'required' });
    if (!f.due) p.push({ field: 'due', code: 'required' });
    setProblems(p);
    if (p.length) return;
    const pkg = data.packages.find((x) => x.id === f.pkg)!;
    const at: [number, number] = [pkg.geom.x + pkg.geom.w / 2, pkg.geom.y + pkg.geom.h / 2];
    const ok =
      kind === 'defect'
        ? change('quality.edit', 'defect', f.title, (d) => {
            d.defects.push({ id: nextId('NC', d.defects.map((x) => x.id)), pkg: f.pkg, inspection: f.inspection || null, title: f.title.trim(), severity: f.severity, owner: f.owner, due: f.due, action: f.action.trim(), state: 'open', at, history: [{ at: today(), by: user, action: 'opened' }] });
          })
        : change('safety.edit', 'safety', f.title, (d) => {
            d.safety.push({ id: nextId('HS', d.safety.map((x) => x.id)), kind: f.skind, pkg: f.pkg, title: f.title.trim(), severity: f.severity, owner: f.owner, date: today(), due: f.due, action: f.action.trim(), state: 'open', detail: f.skind === 'incident' && f.detail.trim() ? f.detail.trim() : undefined, at, history: [{ at: today(), by: user, action: 'opened' }] });
          });
    if (!ok) setProblems([{ field: 'role', code: 'forbidden' }]);
    else onDone();
  };

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <Field label={w.title} error={problems.some((p) => p.field === 'title') ? t.problem.required : undefined}>
        <input className={inputCls} value={f.title} onChange={(e) => set('title', e.target.value)} required />
      </Field>
      {kind === 'safety' && <Select label={w.kind} value={f.skind} onChange={(v) => set('skind', v)} options={KINDS.map((k) => [k, t.safetyKind[k]])} />}
      <Select label={t.common.package} value={f.pkg} onChange={(v) => set('pkg', v)} options={data.packages.map((p) => [p.id, `${p.id} · ${p.name}`])} />
      {kind === 'defect' && (
        <Select label={w.inspection} value={f.inspection} onChange={(v) => set('inspection', v)} options={[['', w.none], ...data.inspections.filter((i) => i.pkg === f.pkg).map((i) => [i.id, `${i.id} · ${i.title}`] as [string, string])]} />
      )}
      <Select label={w.severity} value={f.severity} onChange={(v) => set('severity', v)} options={SEVERITIES.map((s) => [s, t.severity[s]])} />
      <Select label={t.common.owner} value={f.owner} onChange={(v) => set('owner', v)} options={owners} />
      <Field label={t.common.due} error={problems.some((p) => p.field === 'due') ? t.problem.required : undefined}>
        <input type="date" className={inputCls} value={f.due} onChange={(e) => set('due', e.target.value)} required />
      </Field>
      <Field label={w.action}>
        <textarea className={`${inputCls} h-20 py-1.5`} value={f.action} onChange={(e) => set('action', e.target.value)} />
      </Field>
      {kind === 'safety' && f.skind === 'incident' && can('safety.restricted') && (
        <Field label={t.common.restricted.split('—')[0].trim()}>
          <textarea className={`${inputCls} h-16 py-1.5`} value={f.detail} onChange={(e) => set('detail', e.target.value)} />
        </Field>
      )}
      <Problems list={problems} />
      <div className="flex gap-2">
        <Btn kind="primary" type="submit">
          {t.common.save}
        </Btn>
        <Btn onClick={onDone}>{t.common.cancel}</Btn>
      </div>
    </form>
  );
}
