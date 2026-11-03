'use client';

import { useState } from 'react';
import { DAY, today } from '@/lib/construction/calc';
import { INSPECTION_REVIEWS, QUALITY_RECORDS, type InspectionReview, type QDocKind, type QDocState, type QualityRecord } from '@/lib/construction/extra/qualityDocs';
import { useText, useWords } from '@/lib/construction/text';
import type { Event, Id } from '@/lib/construction/types';
import { checkFile, type Problem } from '@/lib/construction/validate';
import { useExtra } from '../extra';
import { Bar, Btn, Drawer, Field, Forbidden, History, inputCls, Kpi, PageHead, Panel, Pill, Problems, Select, Table, type Tone } from '../Kit';
import { nextId, useStore } from '../Store';

// Чанарын баримт: the register of quality records — the inspection records (from the shared inspections, with their
// checklists), test certificates, method statements and inspection & test plans (ITP). Each record moves
// required → (draft) → under review → approved / returned. "Required" means the ITP expects it but nobody has
// submitted it yet (missing); anything not approved by its due date is overdue. An inspection record is due a week
// after the inspection.

const KINDS: QDocKind[] = ['inspection', 'test', 'method', 'itp'];
const STATES: QDocState[] = ['required', 'draft', 'review', 'approved', 'rejected'];
const INSPECTION_DUE_DAYS = 7;

type Row = { id: Id; kind: QDocKind; pkg: Id; title: string; ref: string; by: Id; date: string | null; due: string; state: QDocState; inspection: Id | null; activity: Id | null; file: string | null; history: Event[] };

const W = {
  mn: {
    lead: 'Шалгалтын акт, туршилтын гэрчилгээ, ажлын аргачлал, шалгалт туршилтын төлөвлөгөө (ITP) — багц бүрээр, дутуу болон хугацаа хэтэрсэн баримттай.',
    add: 'Баримт бүртгэх',
    total: 'Нийт баримт',
    waiting: 'Хянах хүлээгдэж буй',
    missing: 'Дутуу (ирүүлээгүй)',
    overdue: 'Хугацаа хэтэрсэн',
    approvedShare: 'Батлагдсан',
    byPkg: 'Багцаар — дутуу, хугацаа хэтэрсэн баримт',
    register: 'Чанарын баримтын бүртгэл',
    kindL: 'Төрөл',
    kind: { inspection: 'Шалгалтын акт', test: 'Туршилтын гэрчилгээ', method: 'Ажлын аргачлал', itp: 'ITP (шалгалт, туршилтын төлөвлөгөө)' } as Record<QDocKind, string>,
    kindShort: { inspection: 'Шалгалтын акт', test: 'Туршилт', method: 'Аргачлал', itp: 'ITP' } as Record<QDocKind, string>,
    state: { required: 'Дутуу', draft: 'Ноорог', review: 'Хянагдаж буй', approved: 'Батлагдсан', rejected: 'Буцаагдсан' } as Record<QDocState, string>,
    id: 'Дугаар',
    title: 'Баримт',
    ref: 'Баримтын дугаар',
    by: 'Ирүүлэгч',
    date: 'Ирүүлсэн',
    file: 'Файл',
    noFile: 'Файл ирүүлээгүй',
    inspection: 'Холбогдох шалгалт',
    activity: 'Холбогдох ажил',
    none: 'Холбоогүй',
    checklist: 'Шалгах хуудас',
    result: { pass: 'Тэнцсэн', fail: 'Тэнцээгүй' },
    defects: 'Холбогдох үл тохирол',
    sharedDocs: 'Баримтын санд',
    submit: 'Ирүүлэх',
    resubmit: 'Засаж дахин ирүүлэх',
    approve: 'Батлах',
    reject: 'Буцаах',
    commentRequired: 'Буцаах бол тайлбар заавал бичнэ',
    fileRequired: 'Файл хавсаргана уу',
    pkgTotal: 'Нийт',
    allStates: 'Бүх төлөв',
    newNote: 'Файл хавсаргавал шууд хянуулахаар илгээгдэнэ; хавсаргаагүй бол “дутуу” баримтаар бүртгэгдэнэ.',
  },
  en: {
    lead: 'Inspection records, test certificates, method statements and inspection & test plans (ITP) — by package, with what is missing or overdue.',
    add: 'Register a record',
    total: 'Records',
    waiting: 'Waiting for review',
    missing: 'Missing (not submitted)',
    overdue: 'Overdue',
    approvedShare: 'Approved',
    byPkg: 'By package — missing and overdue records',
    register: 'Quality record register',
    kindL: 'Type',
    kind: { inspection: 'Inspection record', test: 'Test certificate', method: 'Method statement', itp: 'ITP (inspection & test plan)' } as Record<QDocKind, string>,
    kindShort: { inspection: 'Inspection', test: 'Test', method: 'Method', itp: 'ITP' } as Record<QDocKind, string>,
    state: { required: 'Missing', draft: 'Draft', review: 'Under review', approved: 'Approved', rejected: 'Returned' } as Record<QDocState, string>,
    id: 'No.',
    title: 'Record',
    ref: 'Reference',
    by: 'Submitted by',
    date: 'Submitted',
    file: 'File',
    noFile: 'No file submitted',
    inspection: 'Related inspection',
    activity: 'Related activity',
    none: 'None',
    checklist: 'Checklist',
    result: { pass: 'Pass', fail: 'Fail' },
    defects: 'Related nonconformities',
    sharedDocs: 'In the document archive',
    submit: 'Submit',
    resubmit: 'Correct and resubmit',
    approve: 'Approve',
    reject: 'Return',
    commentRequired: 'A comment is required to return a record',
    fileRequired: 'Attach a file',
    pkgTotal: 'Total',
    allStates: 'All states',
    newNote: 'With a file attached the record goes straight to review; without one it is registered as missing.',
  },
};
type Words = typeof W.mn;

const stateTone = (s: QDocState): Tone => ({ required: 'bad', draft: 'neutral', review: 'info', approved: 'good', rejected: 'bad' })[s] as Tone;
const plusDays = (d: string, n: number) => new Date(Date.parse(d + 'T00:00:00Z') + n * DAY).toISOString().slice(0, 10);

export default function QualityDocs() {
  const t = useText();
  const w = useWords(W);
  const { data, can, log, user } = useStore();
  const [recs, setRecs] = useExtra<QualityRecord[]>('qualityDocs.records', QUALITY_RECORDS);
  const [reviews, setReviews] = useExtra<Record<Id, InspectionReview>>('qualityDocs.inspections', INSPECTION_REVIEWS);
  const [pkg, setPkg] = useState('all');
  const [kind, setKind] = useState<'all' | QDocKind>('all');
  const [state, setState] = useState<'all' | 'missing' | 'overdue' | QDocState>('all');
  const [open, setOpen] = useState<Id | null>(null);
  const [adding, setAdding] = useState(false);
  const now = today();
  const name = (id: string) => data.users.find((u) => u.id === id)?.name ?? data.orgs.find((o) => o.id === id)?.name ?? id;

  // inspection records: review state kept by this page, else an approved archive document (type inspection, ref = id)
  const inspRows: Row[] = data.inspections.map((i) => {
    const doc = data.docs.find((d) => d.type === 'inspection' && d.ref === i.id);
    const r = reviews[i.id];
    const st: QDocState = r?.state ?? (doc?.state === 'approved' ? 'approved' : 'review');
    return { id: i.id, kind: 'inspection', pkg: i.pkg, title: i.title, ref: doc ? `${doc.id} · ${doc.ref}` : '—', by: i.by, date: i.date, due: plusDays(i.date, INSPECTION_DUE_DAYS), state: st, inspection: i.id, activity: null, file: doc?.title ?? null, history: r?.history ?? doc?.history ?? [] };
  });
  const rows: Row[] = [...inspRows, ...recs];
  const isOverdue = (r: Row) => r.state !== 'approved' && r.due < now;

  const shown = rows
    .filter((r) => (pkg === 'all' || r.pkg === pkg) && (kind === 'all' || r.kind === kind))
    .filter((r) => (state === 'all' ? true : state === 'missing' ? r.state === 'required' : state === 'overdue' ? isOverdue(r) : r.state === state))
    .sort((a, b) => Number(isOverdue(b)) - Number(isOverdue(a)) || a.due.localeCompare(b.due));
  const cur = rows.find((r) => r.id === open) ?? null;

  const count = (xs: Row[]) => ({
    total: xs.length,
    approved: xs.filter((r) => r.state === 'approved').length,
    review: xs.filter((r) => r.state === 'review').length,
    missing: xs.filter((r) => r.state === 'required').length,
    overdue: xs.filter(isOverdue).length,
  });
  const all = count(rows);

  // one step of the workflow: submitting needs doc.upload, deciding needs doc.review
  const step = (r: Row, to: QDocState, extra: { comment?: string; file?: string } = {}) => {
    const action = to === 'approved' || to === 'rejected' ? 'doc.review' : 'doc.upload';
    if (!log(action, r.id, `${r.state} → ${to}`)) return false;
    const h: Event = { at: now, by: user, action: to === 'review' ? (r.state === 'rejected' ? 'resubmitted' : 'submitted') : to, comment: extra.comment || undefined };
    if (r.kind === 'inspection') setReviews((m) => ({ ...m, [r.id]: { state: to, history: [...r.history, h] } }));
    else setRecs((xs) => xs.map((x) => (x.id === r.id ? { ...x, state: to, file: extra.file ?? x.file, date: to === 'review' ? now : x.date, history: [...x.history, h] } : x)));
    return true;
  };

  return (
    <div className="space-y-6">
      <PageHead
        title={t.section.qualityDocs}
        lead={w.lead}
        action={
          can('doc.upload') ? (
            <Btn kind="primary" onClick={() => setAdding(true)}>
              + {w.add}
            </Btn>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Kpi label={w.total} value={all.total} />
        <Kpi label={w.waiting} value={all.review} tone={all.review ? 'info' : 'neutral'} />
        <Kpi label={w.missing} value={all.missing} tone={all.missing ? 'bad' : 'good'} />
        <Kpi label={w.overdue} value={all.overdue} tone={all.overdue ? 'bad' : 'good'} />
        <Kpi label={w.approvedShare} value={all.total ? `${Math.round((all.approved / all.total) * 100)}%` : '—'} sub={`${all.approved} / ${all.total}`} />
      </div>

      <Panel title={w.byPkg}>
        <Table head={[t.common.package, w.pkgTotal, w.state.approved, w.state.review, w.missing, w.overdue, '']}>
          {data.packages.map((p) => {
            const c = count(rows.filter((r) => r.pkg === p.id));
            return (
              <tr key={p.id} className="cursor-pointer hover:bg-surface/60" onClick={() => setPkg(p.id)}>
                <td className="px-2 py-2.5">
                  <span className="font-mono text-xs text-mute">{p.id}</span> {p.name}
                </td>
                <td className="px-2 py-2.5 font-mono text-xs">{c.total}</td>
                <td className="px-2 py-2.5 font-mono text-xs text-emerald-700">{c.approved}</td>
                <td className="px-2 py-2.5 font-mono text-xs">{c.review}</td>
                <td className={`px-2 py-2.5 font-mono text-xs ${c.missing ? 'text-red-700' : 'text-mute'}`}>{c.missing}</td>
                <td className={`px-2 py-2.5 font-mono text-xs ${c.overdue ? 'text-red-700' : 'text-mute'}`}>{c.overdue}</td>
                <td className="w-28 px-2 py-2.5">
                  <Bar value={c.total ? (c.approved / c.total) * 100 : null} tone={c.missing || c.overdue ? 'warn' : 'good'} label={w.approvedShare} />
                </td>
              </tr>
            );
          })}
        </Table>
      </Panel>

      <Panel title={w.register}>
        <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Select label={t.filter.pkg} value={pkg} onChange={setPkg} options={[['all', t.filter.all], ...data.packages.map((p): [string, string] => [p.id, `${p.id} · ${p.name}`])]} />
          <Select label={w.kindL} value={kind} onChange={setKind} options={[['all', t.filter.all], ...KINDS.map((k): [QDocKind, string] => [k, w.kind[k]])]} />
          <Select
            label={t.filter.status}
            value={state}
            onChange={setState}
            options={[['all', w.allStates], ['missing', w.missing], ['overdue', w.overdue], ...STATES.filter((s) => s !== 'required').map((s): [QDocState, string] => [s, w.state[s]])]}
          />
        </div>
        <Table head={[t.common.due, w.id, w.title, w.kindL, t.common.package, t.common.status]} empty={!shown.length}>
          {shown.map((r) => {
            const late = isOverdue(r);
            return (
              <tr key={r.id} className={`cursor-pointer hover:bg-surface/60 ${late ? 'bg-red-500/[0.04]' : ''}`} onClick={() => setOpen(r.id)}>
                <td className={`px-2 py-2.5 font-mono text-xs ${late ? 'text-red-700' : 'text-mute'}`}>{r.due}</td>
                <td className="px-2 py-2.5 font-mono text-xs">
                  <button type="button" className="cursor-pointer underline-offset-2 hover:underline" onClick={() => setOpen(r.id)}>
                    {r.id}
                  </button>
                </td>
                <td className="px-2 py-2.5">
                  {r.title}
                  {r.ref !== '—' && <span className="block font-mono text-[11px] text-mute">{r.ref}</span>}
                </td>
                <td className="px-2 py-2.5 text-xs text-mute">{w.kindShort[r.kind]}</td>
                <td className="px-2 py-2.5 font-mono text-xs">{r.pkg}</td>
                <td className="px-2 py-2.5">
                  <span className="flex flex-wrap gap-1">
                    <Pill tone={stateTone(r.state)}>{w.state[r.state]}</Pill>
                    {late && <Pill tone="bad">{t.common.overdue}</Pill>}
                  </span>
                </td>
              </tr>
            );
          })}
        </Table>
      </Panel>

      <Drawer open={!!cur} onClose={() => setOpen(null)} title={cur ? `${cur.id} · ${cur.title}` : ''}>
        {cur && <Detail key={`${cur.id}-${cur.state}`} r={cur} late={isOverdue(cur)} words={w} name={name} onStep={step} />}
      </Drawer>

      <Drawer open={adding} onClose={() => setAdding(false)} title={w.add}>
        {adding && (
          <NewRecord
            words={w}
            ids={recs.map((r) => r.id)}
            onCancel={() => setAdding(false)}
            onDone={(r) => {
              setRecs((xs) => [...xs, r]);
              setAdding(false);
            }}
          />
        )}
      </Drawer>
    </div>
  );
}

function Detail({ r, late, words: w, name, onStep }: { r: Row; late: boolean; words: Words; name: (id: string) => string; onStep: (r: Row, to: QDocState, extra?: { comment?: string; file?: string }) => boolean }) {
  const t = useText();
  const { data, can } = useStore();
  const [comment, setComment] = useState('');
  const [file, setFile] = useState('');
  const [problems, setProblems] = useState<Problem[]>([]);
  const [msg, setMsg] = useState('');
  const insp = r.inspection ? data.inspections.find((i) => i.id === r.inspection) : undefined;
  const act = r.activity ? data.activities.find((a) => a.id === r.activity) : undefined;
  const defects = r.inspection ? data.defects.filter((d) => d.inspection === r.inspection) : [];
  const docs = data.docs.filter((d) => d.ref === r.id || (r.inspection && d.ref === r.inspection));
  // a missing or returned record must come with a file (inspection records are already on file)
  const needsFile = r.kind !== 'inspection' && (r.state === 'required' || r.state === 'rejected');
  const canSubmit = (r.state === 'required' || r.state === 'draft' || r.state === 'rejected') && can('doc.upload');
  const canDecide = r.state === 'review' && can('doc.review');

  const go = (to: QDocState) => {
    setMsg('');
    if (to === 'rejected' && !comment.trim()) return setProblems([{ field: 'comment', code: 'required' }]);
    if (to === 'review' && needsFile && !file && !r.file) return setMsg(w.fileRequired);
    if (!onStep(r, to, { comment: comment.trim(), file: file || undefined })) return setProblems([{ field: 'role', code: 'forbidden' }]);
    setProblems([]);
    setComment('');
  };

  const rows: [string, string][] = [
    [w.kindL, w.kind[r.kind]],
    [t.common.package, `${r.pkg} · ${data.packages.find((p) => p.id === r.pkg)?.name ?? ''}`],
    [w.ref, r.ref],
    [w.by, name(r.by)],
    [w.date, r.date ?? '—'],
    [t.common.due, r.due],
    [w.file, r.file ?? w.noFile],
    [w.activity, act ? `${act.id} · ${act.name}` : w.none],
  ];

  return (
    <div className="space-y-5 text-sm">
      <div className="flex flex-wrap gap-1.5">
        <Pill tone={stateTone(r.state)}>{w.state[r.state]}</Pill>
        {late && <Pill tone="bad">{t.common.overdue}</Pill>}
      </div>
      <dl className="space-y-1.5 text-xs">
        {rows.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[8.5rem_1fr] gap-3 border-b border-line/50 pb-1.5">
            <dt className="text-mute">{k}</dt>
            <dd className="break-words text-fg/90">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="rounded-lg border border-line p-3 text-xs">
        <p className="mb-2 text-mute">{w.inspection}</p>
        {insp ? (
          <>
            <p className="flex flex-wrap items-center gap-2">
              <span className="font-mono">{insp.id}</span> {insp.title} <span className="text-mute">· {insp.date}</span>
              <Pill tone={insp.result === 'pass' ? 'good' : 'bad'}>{w.result[insp.result]}</Pill>
            </p>
            <p className="mt-2 text-mute">{w.checklist}</p>
            <ul className="mt-1 space-y-0.5">
              {insp.checklist.map((c) => (
                <li key={c.item} className={c.ok ? 'text-fg/80' : 'text-red-700'}>
                  {c.ok ? '✓' : '✕'} {c.item}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-mute">{w.none}</p>
        )}
      </div>

      {defects.length > 0 && (
        <div className="text-xs">
          <p className="mb-1.5 text-mute">{w.defects}</p>
          <ul className="space-y-1">
            {defects.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-2">
                <span className="font-mono">{d.id}</span> {d.title}
                <Pill tone={d.state === 'resolved' ? 'good' : d.state === 'review' ? 'info' : 'warn'}>{t.issueState[d.state]}</Pill>
                <span className="text-mute">· {t.common.due} {d.due}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {docs.length > 0 && (
        <div className="text-xs">
          <p className="mb-1.5 text-mute">{w.sharedDocs}</p>
          <ul className="space-y-1">
            {docs.map((d) => (
              <li key={d.id}>
                <span className="font-mono">{d.id}</span> {d.title} · v{d.version} · <span className="text-mute">{t.docState[d.state]}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(canSubmit || canDecide) && (
        <div className="space-y-3 rounded-xl border border-line p-3">
          {canSubmit && needsFile && (
            <Field label={w.file} error={msg || undefined}>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                className="text-xs text-mute file:mr-3 file:h-10 file:cursor-pointer file:rounded-full file:border file:border-line file:bg-transparent file:px-4 file:text-fg"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return setFile('');
                  const bad = checkFile(f);
                  setProblems(bad);
                  setFile(bad.length ? '' : f.name);
                }}
              />
            </Field>
          )}
          <Field label={t.common.comment} error={problems.some((p) => p.field === 'comment') ? w.commentRequired : undefined}>
            <textarea className={`${inputCls} h-16 py-1.5`} value={comment} onChange={(e) => setComment(e.target.value)} />
          </Field>
          <div className="flex flex-wrap gap-2">
            {canSubmit && (
              <Btn kind="primary" onClick={() => go('review')}>
                → {r.state === 'rejected' ? w.resubmit : w.submit}
              </Btn>
            )}
            {canDecide && (
              <>
                <Btn kind="primary" onClick={() => go('approved')}>
                  ✓ {w.approve}
                </Btn>
                <Btn kind="danger" onClick={() => go('rejected')}>
                  ↩ {w.reject}
                </Btn>
              </>
            )}
          </div>
          <Problems list={problems.filter((p) => p.field !== 'comment')} />
        </div>
      )}
      {r.state !== 'approved' && !canSubmit && !canDecide && <Forbidden />}

      <div>
        <p className="mb-2 text-xs text-mute">{t.common.history}</p>
        <History items={r.history} name={name} />
      </div>
    </div>
  );
}

function NewRecord({ words: w, ids, onDone, onCancel }: { words: Words; ids: string[]; onDone: (r: QualityRecord) => void; onCancel: () => void }) {
  const t = useText();
  const { data, user, log } = useStore();
  const [f, setF] = useState({ kind: 'test' as QualityRecord['kind'], pkg: data.packages[0]?.id ?? '', title: '', ref: '', due: '', inspection: '', activity: '' });
  const [file, setFile] = useState('');
  const [problems, setProblems] = useState<Problem[]>([]);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));

  const save = () => {
    const p: Problem[] = [];
    if (!f.title.trim()) p.push({ field: 'title', code: 'required' });
    if (!f.due) p.push({ field: 'due', code: 'required' });
    setProblems(p);
    if (p.length) return;
    const prefix = { test: 'TC', method: 'MST', itp: 'ITP' }[f.kind];
    const id = nextId(prefix, ids.filter((x) => x.startsWith(prefix + '-')));
    if (!log('doc.upload', id, file ? 'submitted' : 'required')) return setProblems([{ field: 'role', code: 'forbidden' }]);
    const now = today();
    onDone({
      id,
      kind: f.kind,
      pkg: f.pkg,
      title: f.title.trim(),
      ref: f.ref.trim() || '—',
      by: user,
      date: file ? now : null,
      due: f.due,
      inspection: f.inspection || null,
      activity: f.activity || null,
      file: file || null,
      state: file ? 'review' : 'required',
      history: [{ at: now, by: user, action: file ? 'submitted' : 'required' }],
    });
  };

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <Select label={w.kindL} value={f.kind} onChange={(v) => set('kind', v)} options={(['test', 'method', 'itp'] as const).map((k): [QualityRecord['kind'], string] => [k, w.kind[k]])} />
      <Select label={t.common.package} value={f.pkg} onChange={(v) => setF((x) => ({ ...x, pkg: v, inspection: '', activity: '' }))} options={data.packages.map((p) => [p.id, `${p.id} · ${p.name}`])} />
      <Field label={w.title} error={problems.some((p) => p.field === 'title') ? t.problem.required : undefined}>
        <input className={`${inputCls} h-10`} value={f.title} onChange={(e) => set('title', e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={w.ref}>
          <input className={`${inputCls} h-10`} value={f.ref} onChange={(e) => set('ref', e.target.value)} />
        </Field>
        <Field label={t.common.due} error={problems.some((p) => p.field === 'due') ? t.problem.required : undefined}>
          <input type="date" className={`${inputCls} h-10`} value={f.due} onChange={(e) => set('due', e.target.value)} />
        </Field>
      </div>
      <Select label={w.inspection} value={f.inspection} onChange={(v) => set('inspection', v)} options={[['', w.none], ...data.inspections.filter((i) => i.pkg === f.pkg).map((i): [string, string] => [i.id, `${i.id} · ${i.title}`])]} />
      <Select label={w.activity} value={f.activity} onChange={(v) => set('activity', v)} options={[['', w.none], ...data.activities.filter((a) => a.pkg === f.pkg).map((a): [string, string] => [a.id, `${a.id} · ${a.name}`])]} />
      <Field label={w.file}>
        {/* the name only: files are not stored in this demonstration */}
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          className="text-xs text-mute file:mr-3 file:h-10 file:cursor-pointer file:rounded-full file:border file:border-line file:bg-transparent file:px-4 file:text-fg"
          onChange={(e) => {
            const x = e.target.files?.[0];
            if (!x) return setFile('');
            const bad = checkFile(x);
            setProblems(bad);
            setFile(bad.length ? '' : x.name);
          }}
        />
      </Field>
      <p className="text-[11px] text-mute">{w.newNote}</p>
      <Problems list={problems.filter((p) => p.field !== 'title' && p.field !== 'due')} />
      <div className="flex gap-2">
        <Btn kind="primary" type="submit">
          {t.common.save}
        </Btn>
        <Btn onClick={onCancel}>{t.common.cancel}</Btn>
      </div>
    </form>
  );
}
