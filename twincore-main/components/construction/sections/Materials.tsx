'use client';

import { useState } from 'react';
import { days, today } from '@/lib/construction/calc';
import { SUBMITTALS, type MaterialState, type SampleState, type Submittal } from '@/lib/construction/extra/materials';
import { useText, useWords } from '@/lib/construction/text';
import type { Id } from '@/lib/construction/types';
import { checkFile, type Problem } from '@/lib/construction/validate';
import { useExtra } from '../extra';
import { Btn, Drawer, Field, Forbidden, History, inputCls, Kpi, PageHead, Panel, Pill, Problems, Select, Table, type Tone } from '../Kit';
import { nextId, useStore } from '../Store';

// Материал баталгаажуулалт: material submittals — the contractor proposes a material with its standard (MNS), supplier,
// a sample and the test certificate; the supervising engineer reviews it and approves, approves with comments (use it,
// but on the stated conditions) or rejects. A rejected submittal is corrected and resubmitted as the next revision.
// A submittal still undecided close to the date the material is needed on site holds up the work, so it is flagged.

const STATES: MaterialState[] = ['submitted', 'review', 'approved', 'approved_c', 'rejected'];
const SAMPLES: SampleState[] = ['provided', 'pending', 'na'];
const SOON = 21; // days before the site need date when an undecided submittal becomes urgent

const W = {
  mn: {
    lead: 'Барилгын материалын стандарт (MNS), нийлүүлэгч, дээж, туршилтын гэрчилгээг хянаж, ажилд хэрэглэхийг зөвшөөрөх — талбайд хэрэгтэй болох огноотой нь уялдуулан.',
    add: 'Материал хянуулахаар ирүүлэх',
    waiting: 'Шийдвэр хүлээгдэж буй',
    approved: 'Зөвшөөрөгдсөн',
    approvedSub: 'үүнээс тайлбартай',
    rejected: 'Татгалзсан',
    urgent: 'Яаралтай (талбайд хэрэгтэй болох дөхсөн)',
    noCert: 'Гэрчилгээгүй',
    urgentPanel: 'Шийдвэр яаралтай шаардлагатай',
    urgentNone: 'Талбайн хэрэгцээ дөхсөн шийдвэргүй материал алга.',
    list: 'Материалын хүсэлтийн бүртгэл',
    state: { submitted: 'Ирүүлсэн', review: 'Хянагдаж буй', approved: 'Зөвшөөрсөн', approved_c: 'Тайлбартай зөвшөөрсөн', rejected: 'Татгалзсан' } as Record<MaterialState, string>,
    sampleL: 'Дээж',
    sample: { provided: 'Ирүүлсэн', pending: 'Хүлээгдэж буй', na: 'Шаардлагагүй' } as Record<SampleState, string>,
    id: 'Дугаар',
    material: 'Материал',
    spec: 'Стандарт, техникийн шаардлага',
    supplier: 'Нийлүүлэгч',
    qty: 'Тоо хэмжээ',
    cert: 'Туршилтын гэрчилгээ',
    noFile: 'Ирүүлээгүй',
    activity: 'Хэрэглэх ажил',
    none: 'Холбоогүй',
    needed: 'Талбайд хэрэгтэй',
    left: 'хоног үлдсэн',
    passed: 'хоног өнгөрсөн',
    by: 'Ирүүлсэн',
    submitted: 'Ирүүлсэн огноо',
    rev: 'Хувилбар',
    startReview: 'Хянаж эхлэх',
    approve: 'Зөвшөөрөх',
    approveC: 'Тайлбартай зөвшөөрөх',
    reject: 'Татгалзах',
    commentRequired: 'Тайлбартай зөвшөөрөх, татгалзах бол тайлбар заавал бичнэ',
    resubmit: 'Засаж дахин ирүүлэх (шинэ хувилбар)',
    send: 'Ирүүлэх',
    search: 'Материал, нийлүүлэгч, стандарт…',
  },
  en: {
    lead: 'Review each material’s standard (MNS), supplier, sample and test certificate before it may be used — tied to the date it is needed on site.',
    add: 'Submit a material',
    waiting: 'Awaiting decision',
    approved: 'Approved',
    approvedSub: 'of which with comments',
    rejected: 'Rejected',
    urgent: 'Urgent (needed on site soon)',
    noCert: 'No certificate',
    urgentPanel: 'Decisions needed now',
    urgentNone: 'No undecided material is needed on site soon.',
    list: 'Material submittal register',
    state: { submitted: 'Submitted', review: 'Under review', approved: 'Approved', approved_c: 'Approved with comments', rejected: 'Rejected' } as Record<MaterialState, string>,
    sampleL: 'Sample',
    sample: { provided: 'Provided', pending: 'Pending', na: 'Not required' } as Record<SampleState, string>,
    id: 'No.',
    material: 'Material',
    spec: 'Standard / specification',
    supplier: 'Supplier',
    qty: 'Quantity',
    cert: 'Test certificate',
    noFile: 'Not submitted',
    activity: 'Used in',
    none: 'None',
    needed: 'Needed on site',
    left: 'days left',
    passed: 'days ago',
    by: 'Submitted by',
    submitted: 'Submitted',
    rev: 'Revision',
    startReview: 'Start review',
    approve: 'Approve',
    approveC: 'Approve with comments',
    reject: 'Reject',
    commentRequired: 'A comment is required to approve with comments or to reject',
    resubmit: 'Correct and resubmit (next revision)',
    send: 'Submit',
    search: 'Material, supplier, standard…',
  },
};
type Words = typeof W.mn;

const stateTone = (s: MaterialState): Tone => ({ submitted: 'info', review: 'info', approved: 'good', approved_c: 'warn', rejected: 'bad' })[s] as Tone;
const decided = (s: MaterialState) => s === 'approved' || s === 'approved_c' || s === 'rejected';
const fileCls = 'text-xs text-mute file:mr-3 file:h-10 file:cursor-pointer file:rounded-full file:border file:border-line file:bg-transparent file:px-4 file:text-fg';

export default function Materials() {
  const t = useText();
  const w = useWords(W);
  const { data, can, log, user } = useStore();
  const [items, setItems] = useExtra<Submittal[]>('materials.submittals', SUBMITTALS);
  const [pkg, setPkg] = useState('all');
  const [state, setState] = useState<'all' | 'waiting' | 'urgent' | MaterialState>('all');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<Id | null>(null);
  const [form, setForm] = useState<Submittal | null>(null);
  const now = today();
  const name = (id: string) => data.users.find((u) => u.id === id)?.name ?? data.orgs.find((o) => o.id === id)?.name ?? id;

  // undecided and needed on site within SOON days (or already past it)
  const urgent = (s: Submittal) => !decided(s.state) && days(now, s.needed) <= SOON;
  const waiting = items.filter((s) => !decided(s.state));
  const ok = items.filter((s) => s.state === 'approved' || s.state === 'approved_c');

  const shown = items
    .filter((s) => pkg === 'all' || s.pkg === pkg)
    .filter((s) => (state === 'all' ? true : state === 'waiting' ? !decided(s.state) : state === 'urgent' ? urgent(s) : s.state === state))
    .filter((s) => !q.trim() || `${s.id} ${s.material} ${s.supplier} ${s.spec}`.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => Number(urgent(b)) - Number(urgent(a)) || b.submitted.localeCompare(a.submitted));
  const cur = items.find((s) => s.id === open) ?? null;

  const step = (s: Submittal, to: MaterialState, comment: string) => {
    if (!log('material.review', s.id, `${s.state} → ${to}`)) return false;
    setItems((xs) => xs.map((x) => (x.id === s.id ? { ...x, state: to, history: [...x.history, { at: now, by: user, action: to, comment: comment || undefined }] } : x)));
    return true;
  };
  const blank = (): Submittal => ({ id: '', rev: 1, material: '', spec: 'MNS ', supplier: '', pkg: pkg === 'all' ? '' : pkg, activity: null, qty: '', sample: 'provided', cert: null, by: user, submitted: now, needed: '', state: 'submitted', history: [] });

  const needLabel = (s: Submittal) => {
    const d = days(now, s.needed);
    return d >= 0 ? `${d} ${w.left}` : `${-d} ${w.passed}`;
  };

  return (
    <div className="space-y-6">
      <PageHead
        title={t.section.materials}
        lead={w.lead}
        action={
          can('material.submit') ? (
            <Btn kind="primary" onClick={() => setForm(blank())}>
              + {w.add}
            </Btn>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Kpi label={w.waiting} value={waiting.length} tone={waiting.length ? 'info' : 'good'} />
        <Kpi label={w.approved} value={ok.length} sub={`${w.approvedSub}: ${ok.filter((s) => s.state === 'approved_c').length}`} tone="good" />
        <Kpi label={w.rejected} value={items.filter((s) => s.state === 'rejected').length} />
        <Kpi label={w.urgent} value={items.filter(urgent).length} tone={items.some(urgent) ? 'bad' : 'good'} />
        <Kpi label={w.noCert} value={waiting.filter((s) => !s.cert).length} sub={w.waiting} tone={waiting.some((s) => !s.cert) ? 'warn' : 'neutral'} />
      </div>

      <Panel title={w.urgentPanel}>
        {items.some(urgent) ? (
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {items
              .filter(urgent)
              .sort((a, b) => a.needed.localeCompare(b.needed))
              .map((s) => (
                <li key={s.id}>
                  <button type="button" onClick={() => setOpen(s.id)} className="min-h-10 w-full cursor-pointer rounded-xl border border-red-400/30 bg-red-500/[0.04] px-3 py-2.5 text-left text-xs hover:border-red-400/60">
                    <span className="flex items-start justify-between gap-2">
                      <span className="text-fg/90">
                        <span className="font-mono text-mute">{s.id}</span> {s.material}
                      </span>
                      <Pill tone={stateTone(s.state)}>{w.state[s.state]}</Pill>
                    </span>
                    <span className="mt-1 block text-mute">
                      {s.pkg} · {w.needed}: <span className="font-mono text-red-700">{s.needed}</span> ({needLabel(s)})
                    </span>
                  </button>
                </li>
              ))}
          </ul>
        ) : (
          <p className="text-sm text-mute">{w.urgentNone}</p>
        )}
      </Panel>

      <Panel title={w.list}>
        <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Select label={t.filter.pkg} value={pkg} onChange={setPkg} options={[['all', t.filter.all], ...data.packages.map((p): [string, string] => [p.id, `${p.id} · ${p.name}`])]} />
          <Select
            label={t.filter.status}
            value={state}
            onChange={setState}
            options={[['all', t.filter.all], ['waiting', w.waiting], ['urgent', w.urgent], ...STATES.map((s): [MaterialState, string] => [s, w.state[s]])]}
          />
          <Field label={t.filter.search.replace('…', '')}>
            <input className={inputCls} value={q} onChange={(e) => setQ(e.target.value)} placeholder={w.search} />
          </Field>
        </div>
        <Table head={[w.submitted, w.id, w.material, w.spec, t.common.package, `${w.sampleL} / ${w.cert}`, w.needed, t.common.status]} empty={!shown.length}>
          {shown.map((s) => {
            const late = urgent(s);
            return (
              <tr key={s.id} className={`cursor-pointer hover:bg-surface/60 ${late ? 'bg-red-500/[0.04]' : ''}`} onClick={() => setOpen(s.id)}>
                <td className="px-2 py-2.5 font-mono text-xs text-mute">{s.submitted}</td>
                <td className="px-2 py-2.5 font-mono text-xs whitespace-nowrap">
                  <button type="button" className="cursor-pointer underline-offset-2 hover:underline" onClick={() => setOpen(s.id)}>
                    {s.id}
                  </button>
                  {s.rev > 1 && <span className="text-mute"> r{s.rev}</span>}
                </td>
                <td className="px-2 py-2.5">
                  {s.material}
                  <span className="block text-[11px] text-mute">
                    {s.supplier} · {s.qty}
                  </span>
                </td>
                <td className="px-2 py-2.5 font-mono text-xs text-fg/80">{s.spec}</td>
                <td className="px-2 py-2.5 font-mono text-xs">{s.pkg}</td>
                <td className="px-2 py-2.5 text-xs whitespace-nowrap">
                  <span className={s.sample === 'pending' ? 'text-amber-700' : 'text-fg/80'}>{s.sample === 'provided' ? '✓' : s.sample === 'pending' ? '…' : '—'}</span>
                  <span className="text-mute"> / </span>
                  <span className={s.cert ? 'text-fg/80' : 'text-amber-700'}>{s.cert ? '✓' : '✕'}</span>
                </td>
                <td className={`px-2 py-2.5 font-mono text-xs whitespace-nowrap ${late ? 'text-red-700' : 'text-mute'}`}>{s.needed}</td>
                <td className="px-2 py-2.5">
                  <Pill tone={stateTone(s.state)}>{w.state[s.state]}</Pill>
                </td>
              </tr>
            );
          })}
        </Table>
        <p className="mt-2 text-[11px] text-mute">
          {w.sampleL} / {w.cert}: ✓ — {w.sample.provided}, … — {w.sample.pending}, ✕ — {w.noFile}
        </p>
      </Panel>

      <Drawer open={!!cur} onClose={() => setOpen(null)} title={cur ? `${cur.id} · ${cur.material}` : ''}>
        {cur && (
          <Detail
            key={`${cur.id}-${cur.state}-${cur.rev}`}
            s={cur}
            urgentNow={urgent(cur)}
            needLabel={needLabel(cur)}
            words={w}
            name={name}
            onStep={step}
            onResubmit={() => {
              setOpen(null);
              setForm({ ...cur, rev: cur.rev + 1 });
            }}
          />
        )}
      </Drawer>

      <Drawer open={!!form} onClose={() => setForm(null)} title={form?.id ? `${w.resubmit} · ${form.id} r${form.rev}` : w.add}>
        {form && (
          <SubmitForm
            key={form.id || 'new'}
            initial={form}
            words={w}
            onCancel={() => setForm(null)}
            onDone={(s) => {
              const id = s.id || nextId('MAT', items.map((x) => x.id));
              if (!log('material.submit', id, s.id ? `resubmitted r${s.rev}` : 'submitted')) return false;
              const h = { at: now, by: user, action: s.id ? 'resubmitted' : 'submitted', comment: s.id ? `Rev ${s.rev}` : undefined };
              setItems((xs) => (s.id ? xs.map((x) => (x.id === s.id ? { ...s, state: 'submitted', submitted: now, history: [...x.history, h] } : x)) : [...xs, { ...s, id, by: user, submitted: now, state: 'submitted', history: [h] }]));
              setForm(null);
              setOpen(id);
              return true;
            }}
          />
        )}
      </Drawer>
    </div>
  );
}

function Detail({
  s,
  urgentNow,
  needLabel,
  words: w,
  name,
  onStep,
  onResubmit,
}: {
  s: Submittal;
  urgentNow: boolean;
  needLabel: string;
  words: Words;
  name: (id: string) => string;
  onStep: (s: Submittal, to: MaterialState, comment: string) => boolean;
  onResubmit: () => void;
}) {
  const t = useText();
  const { data, can, role, user } = useStore();
  const [comment, setComment] = useState('');
  const [problems, setProblems] = useState<Problem[]>([]);
  const act = s.activity ? data.activities.find((a) => a.id === s.activity) : undefined;
  const myOrg = data.users.find((u) => u.id === user)?.org;
  const pkgObj = data.packages.find((p) => p.id === s.pkg);
  // a contractor corrects only its own package's submittals
  const mayResubmit = s.state === 'rejected' && can('material.submit') && (role !== 'contractor' || pkgObj?.contractor === myOrg);

  const go = (to: MaterialState) => {
    if ((to === 'approved_c' || to === 'rejected') && !comment.trim()) return setProblems([{ field: 'comment', code: 'required' }]);
    if (!onStep(s, to, comment.trim())) return setProblems([{ field: 'role', code: 'forbidden' }]);
    setProblems([]);
    setComment('');
  };

  const rows: [string, string][] = [
    [w.spec, s.spec],
    [w.supplier, s.supplier],
    [w.qty, s.qty || '—'],
    [t.common.package, `${s.pkg} · ${pkgObj?.name ?? ''}`],
    [w.activity, act ? `${act.id} · ${act.name}` : w.none],
    [w.sampleL, w.sample[s.sample]],
    [w.cert, s.cert ?? w.noFile],
    [w.needed, `${s.needed} (${needLabel})`],
    [w.rev, `r${s.rev}`],
    [w.by, `${name(s.by)} · ${s.submitted}`],
  ];

  return (
    <div className="space-y-5 text-sm">
      <div className="flex flex-wrap gap-1.5">
        <Pill tone={stateTone(s.state)}>{w.state[s.state]}</Pill>
        {urgentNow && <Pill tone="bad">{w.urgent}</Pill>}
      </div>
      <dl className="space-y-1.5 text-xs">
        {rows.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[8.5rem_1fr] gap-3 border-b border-line/50 pb-1.5">
            <dt className="text-mute">{k}</dt>
            <dd className={`break-words ${k === w.cert && !s.cert ? 'text-amber-700' : 'text-fg/90'}`}>{v}</dd>
          </div>
        ))}
      </dl>

      {!decided(s.state) &&
        (can('material.review') ? (
          <div className="space-y-3 rounded-xl border border-line p-3">
            {s.state === 'submitted' && <Btn onClick={() => go('review')}>→ {w.startReview}</Btn>}
            <Field label={t.common.comment} error={problems.some((p) => p.field === 'comment') ? w.commentRequired : undefined}>
              <textarea className={`${inputCls} h-16 py-1.5`} value={comment} onChange={(e) => setComment(e.target.value)} />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Btn kind="primary" onClick={() => go('approved')}>
                ✓ {w.approve}
              </Btn>
              <Btn onClick={() => go('approved_c')}>✓ {w.approveC}</Btn>
              <Btn kind="danger" onClick={() => go('rejected')}>
                ✕ {w.reject}
              </Btn>
            </div>
            <Problems list={problems.filter((p) => p.field !== 'comment')} />
          </div>
        ) : (
          <Forbidden />
        ))}
      {mayResubmit && <Btn onClick={onResubmit}>✎ {w.resubmit}</Btn>}

      <div>
        <p className="mb-2 text-xs text-mute">{t.common.history}</p>
        <History items={s.history} name={name} />
      </div>
    </div>
  );
}

function SubmitForm({ initial, words: w, onDone, onCancel }: { initial: Submittal; words: Words; onDone: (s: Submittal) => boolean; onCancel: () => void }) {
  const t = useText();
  const { data, role, user } = useStore();
  const myOrg = data.users.find((u) => u.id === user)?.org;
  const pkgs = data.packages.filter((p) => role !== 'contractor' || p.contractor === myOrg);
  const [f, setF] = useState<Submittal>({ ...initial, pkg: initial.pkg && pkgs.some((p) => p.id === initial.pkg) ? initial.pkg : (pkgs[0]?.id ?? '') });
  const [problems, setProblems] = useState<Problem[]>([]);
  const set = <K extends keyof Submittal>(k: K, v: Submittal[K]) => setF((x) => ({ ...x, [k]: v }));
  const req = (field: string) => (problems.some((p) => p.field === field) ? t.problem.required : undefined);

  const save = () => {
    const p: Problem[] = [];
    if (!f.material.trim()) p.push({ field: 'material', code: 'required' });
    if (!f.spec.trim() || f.spec.trim() === 'MNS') p.push({ field: 'spec', code: 'required' });
    if (!f.supplier.trim()) p.push({ field: 'supplier', code: 'required' });
    if (!f.needed) p.push({ field: 'needed', code: 'required' });
    if (!f.pkg) p.push({ field: 'pkg', code: 'required' });
    setProblems(p);
    if (p.length) return;
    if (!onDone({ ...f, material: f.material.trim(), spec: f.spec.trim(), supplier: f.supplier.trim(), qty: f.qty.trim() })) setProblems([{ field: 'role', code: 'forbidden' }]);
  };

  if (!pkgs.length) return <Forbidden />;
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <Field label={w.material} error={req('material')}>
        <input className={`${inputCls} h-10`} value={f.material} onChange={(e) => set('material', e.target.value)} />
      </Field>
      <Field label={w.spec} error={req('spec')}>
        <input className={`${inputCls} h-10`} value={f.spec} onChange={(e) => set('spec', e.target.value)} />
      </Field>
      <Field label={w.supplier} error={req('supplier')}>
        <input className={`${inputCls} h-10`} value={f.supplier} onChange={(e) => set('supplier', e.target.value)} />
      </Field>
      <Select label={t.common.package} value={f.pkg} onChange={(v) => setF((x) => ({ ...x, pkg: v, activity: null }))} options={pkgs.map((p) => [p.id, `${p.id} · ${p.name}`])} />
      <Select label={w.activity} value={f.activity ?? ''} onChange={(v) => set('activity', v || null)} options={[['', w.none], ...data.activities.filter((a) => a.pkg === f.pkg).map((a): [string, string] => [a.id, `${a.id} · ${a.name}`])]} />
      <div className="grid grid-cols-2 gap-3">
        <Field label={w.qty}>
          <input className={`${inputCls} h-10`} value={f.qty} onChange={(e) => set('qty', e.target.value)} />
        </Field>
        <Field label={w.needed} error={req('needed')}>
          <input type="date" className={`${inputCls} h-10`} value={f.needed} onChange={(e) => set('needed', e.target.value)} />
        </Field>
      </div>
      <Select label={w.sampleL} value={f.sample} onChange={(v) => set('sample', v)} options={SAMPLES.map((x): [SampleState, string] => [x, w.sample[x]])} />
      <Field label={`${w.cert}${f.cert ? ` — ${f.cert}` : ''}`}>
        {/* the name only: files are not stored in this demonstration */}
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          className={fileCls}
          onChange={(e) => {
            const x = e.target.files?.[0];
            if (!x) return;
            const bad = checkFile(x);
            setProblems(bad);
            if (!bad.length) set('cert', x.name);
          }}
        />
      </Field>
      <Problems list={problems.filter((p) => !['material', 'spec', 'supplier', 'needed'].includes(p.field))} />
      <div className="flex gap-2">
        <Btn kind="primary" type="submit">
          {w.send}
        </Btn>
        <Btn onClick={onCancel}>{t.common.cancel}</Btn>
      </div>
    </form>
  );
}
