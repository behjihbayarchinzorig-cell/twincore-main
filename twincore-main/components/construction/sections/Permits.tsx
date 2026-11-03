'use client';

import { useState } from 'react';
import { days, permitWarning, today } from '@/lib/construction/calc';
import { useText, useWords } from '@/lib/construction/text';
import type { Permit, PermitStatus } from '@/lib/construction/types';
import type { Problem } from '@/lib/construction/validate';
import { Btn, Drawer, Field, Forbidden, History, inputCls, Kpi, PageHead, Panel, Pill, Problems, Select, Table, toneOf } from '../Kit';
import { nextId, useStore } from '../Store';

// The permit register: every permit, application and decision tied to a package, with who submitted it, who follows
// it up, what is still missing, and the comments on the way. Granted permits close to their expiry, expired ones and
// applications waiting longer than 30 days for a decision are flagged.

const WORDS = {
  mn: {
    lead: 'Барилгын ажилтай холбоотой зөвшөөрөл, хүсэлт, шийдвэрийн бүртгэл — шат, хариуцагч, хугацаа, дутуу шаардлагатай.',
    attention: 'Анхаарах (хугацаа)',
    type: 'Төрөл',
    ref: 'Дугаар',
    org: 'Хүсэлт гаргагч',
    submitted: 'Ирүүлсэн',
    decided: 'Шийдвэр',
    expires: 'Хүчинтэй хугацаа',
    requirements: 'Дутуу шаардлага',
    comments: 'Тайлбар, шийдвэр',
    stages: ['Ирүүлсэн', 'Хянагдаж буй', 'Шийдвэр'],
    reviewLate: 'Шийдвэр удааширсан',
    add: 'Зөвшөөрөл бүртгэх',
    decide: 'Шийдвэр бүртгэх',
    addComment: 'Тайлбар нэмэх',
    grant: 'Олгосон',
    reject: 'Татгалзсан',
    expiry: 'Дуусах огноо (олгосон бол)',
    expiryOrder: 'Хүчинтэй хугацаа ирүүлсэн огнооноос хойш байх ёстой',
    left: 'хоног үлдсэн',
  },
  en: {
    lead: 'Permits, applications and decisions for the works — stage, responsible person, deadlines and what is still missing.',
    attention: 'Needs attention',
    type: 'Type',
    ref: 'Reference',
    org: 'Applicant',
    submitted: 'Submitted',
    decided: 'Decided',
    expires: 'Valid until',
    requirements: 'Outstanding requirements',
    comments: 'Comments and decisions',
    stages: ['Submitted', 'Under review', 'Decision'],
    reviewLate: 'Decision overdue',
    add: 'Register a permit',
    decide: 'Record a decision',
    addComment: 'Add a comment',
    grant: 'Granted',
    reject: 'Rejected',
    expiry: 'Valid until (if granted)',
    expiryOrder: 'Validity must end after the submission date',
    left: 'days left',
  },
};
type W = typeof WORDS.mn;

type Filter = 'all' | PermitStatus | 'attention';
const REVIEW_DAYS = 30;

export default function Permits() {
  const t = useText();
  const w = useWords(WORDS);
  const { data, can, change, user } = useStore();
  const [filter, setFilter] = useState<Filter>('all');
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const now = today();

  // what to flag on a permit: expired, expiring within 30 days, or a decision waiting too long
  const flag = (p: Permit): 'expired' | 'soon' | 'reviewLate' | null => {
    if (p.status === 'expired') return 'expired';
    const pw = permitWarning(p, now);
    if (pw) return pw;
    if (p.status === 'pending' && days(p.submitted, now) > REVIEW_DAYS) return 'reviewLate';
    return null;
  };
  const shown = data.permits.filter((p) => (filter === 'all' ? true : filter === 'attention' ? !!flag(p) : p.status === filter || (filter === 'expired' && flag(p) === 'expired')));
  const name = (id: string) => data.users.find((u) => u.id === id)?.name ?? data.orgs.find((o) => o.id === id)?.name ?? id;
  const sel = data.permits.find((p) => p.id === open);
  const by = (s: PermitStatus) => data.permits.filter((p) => p.status === s).length;

  const flagPill = (p: Permit) => {
    const f = flag(p);
    if (!f) return null;
    if (f === 'soon') return <Pill tone="warn">{`${t.common.soon} · ${days(now, p.expires!)} ${w.left}`}</Pill>;
    if (f === 'reviewLate') return <Pill tone="bad">{w.reviewLate}</Pill>;
    return p.status === 'expired' ? null : <Pill tone="bad">{t.permitStatus.expired}</Pill>;
  };

  return (
    <div className="space-y-6">
      <PageHead title={t.section.permits} lead={w.lead} action={can('permit.edit') ? <Btn kind="primary" onClick={() => setAdding(true)}>+ {w.add}</Btn> : undefined} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Kpi label={t.permitStatus.pending} value={by('pending')} tone="info" />
        <Kpi label={t.permitStatus.approved} value={by('approved')} tone="good" />
        <Kpi label={t.permitStatus.rejected} value={by('rejected')} tone={by('rejected') ? 'bad' : 'neutral'} />
        <Kpi label={t.permitStatus.expired} value={by('expired')} tone={by('expired') ? 'bad' : 'neutral'} />
        <Kpi label={w.attention} value={data.permits.filter((p) => flag(p)).length} tone={data.permits.some((p) => flag(p)) ? 'warn' : 'good'} />
      </div>

      <Panel
        action={
          <div className="w-[220px]">
            <Select<Filter>
              label={t.filter.status}
              value={filter}
              onChange={setFilter}
              options={[['all', t.filter.all], ['pending', t.permitStatus.pending], ['approved', t.permitStatus.approved], ['rejected', t.permitStatus.rejected], ['expired', t.permitStatus.expired], ['attention', w.attention]]}
            />
          </div>
        }
      >
        <Table head={[w.type, w.ref, t.common.package, w.org, w.submitted, w.decided, w.expires, t.common.status, t.common.owner, w.requirements]} empty={!shown.length}>
          {shown.map((p) => (
            <tr key={p.id} className="cursor-pointer align-top hover:bg-surface/60" onClick={() => setOpen(p.id)}>
              <td className="px-2 py-2">
                <button type="button" className="cursor-pointer text-left hover:underline" onClick={() => setOpen(p.id)}>
                  {p.type}
                </button>
                <span className="block font-mono text-[11px] text-mute">{p.id}</span>
              </td>
              <td className="px-2 py-2 font-mono text-xs">{p.ref}</td>
              <td className="px-2 py-2 font-mono text-xs">{p.pkg}</td>
              <td className="px-2 py-2 text-xs">{name(p.org)}</td>
              <td className="px-2 py-2 font-mono text-xs text-mute">{p.submitted}</td>
              <td className="px-2 py-2 font-mono text-xs text-mute">{p.decided ?? '—'}</td>
              <td className="px-2 py-2 font-mono text-xs text-mute">{p.expires ?? '—'}</td>
              <td className="px-2 py-2">
                <span className="flex flex-wrap gap-1">
                  <Pill tone={toneOf(p.status)}>{t.permitStatus[p.status]}</Pill>
                  {flagPill(p)}
                </span>
              </td>
              <td className="px-2 py-2 text-xs">{name(p.owner)}</td>
              <td className="px-2 py-2 text-xs text-fg/80">{p.requirements.length ? p.requirements.join(', ') : '—'}</td>
            </tr>
          ))}
        </Table>
      </Panel>

      <Drawer open={!!sel} onClose={() => setOpen(null)} title={sel ? `${sel.type} · ${sel.ref}` : ''}>
        {sel && <PermitDetail p={sel} flag={flagPill(sel)} name={name} words={w} canEdit={can('permit.edit')} user={user} change={change} />}
      </Drawer>
      <Drawer open={adding} onClose={() => setAdding(false)} title={w.add}>
        <NewPermit onDone={() => setAdding(false)} words={w} />
      </Drawer>
    </div>
  );
}

// the stages: submitted → under review → decision (granted / rejected / expired)
function Stepper({ p, labels }: { p: Permit; labels: string[] }) {
  const t = useText();
  const at = p.status === 'pending' ? (p.comments.length ? 1 : 0) : 2;
  const end = p.status === 'pending' ? labels[2] : t.permitStatus[p.status];
  return (
    <ol className="flex items-center gap-2 text-[11px]">
      {[labels[0], labels[1], end].map((l, i) => {
        const done = i <= at;
        const bad = i === 2 && (p.status === 'rejected' || p.status === 'expired');
        return (
          <li key={i} className="flex items-center gap-2">
            <span className={`grid h-5 w-5 place-items-center rounded-full border font-mono ${bad ? 'border-red-400/60 text-red-700' : done ? 'border-accent bg-accent/20 text-accent-hi' : 'border-line text-mute'}`}>{i + 1}</span>
            <span className={done ? 'text-fg/90' : 'text-mute'}>{l}</span>
            {i < 2 && <span className="h-px w-5 bg-line" />}
          </li>
        );
      })}
    </ol>
  );
}

function PermitDetail({ p, flag, name, words: w, canEdit, user, change }: { p: Permit; flag: React.ReactNode; name: (id: string) => string; words: W; canEdit: boolean; user: string; change: ReturnType<typeof useStore>['change'] }) {
  const t = useText();
  const { data } = useStore();
  const [comment, setComment] = useState('');
  const [expiry, setExpiry] = useState('');
  const [problems, setProblems] = useState<Problem[]>([]);
  const docs = p.docs.map((d) => data.docs.find((x) => x.id === d)).filter(Boolean);

  const record = (decision: 'approved' | 'rejected' | null) => {
    if (decision === 'approved' && expiry && expiry <= p.submitted) return setProblems([{ field: 'expires', code: 'dateOrder' }]);
    if (!decision && !comment.trim()) return setProblems([{ field: 'comment', code: 'required' }]);
    setProblems([]);
    const ok = change('permit.edit', p.id, decision ?? 'comment', (d) => {
      const x = d.permits.find((q) => q.id === p.id);
      if (!x) return;
      if (decision) {
        x.status = decision;
        x.decided = today();
        if (decision === 'approved' && expiry) x.expires = expiry;
      }
      x.comments.push({ at: today(), by: user, action: decision ?? 'comment', comment: comment.trim() || undefined });
    });
    if (ok) {
      setComment('');
      setExpiry('');
    }
  };

  return (
    <div className="space-y-5 text-sm">
      <Stepper p={p} labels={w.stages} />
      <div className="flex flex-wrap gap-1.5">
        <Pill tone={toneOf(p.status)}>{t.permitStatus[p.status]}</Pill>
        {flag}
      </div>
      <dl className="space-y-1.5 text-xs">
        {(
          [
            [t.common.package, `${p.pkg} · ${data.packages.find((x) => x.id === p.pkg)?.name ?? ''}`],
            [w.org, name(p.org)],
            [w.submitted, p.submitted],
            [w.expires, p.expires ?? '—'],
            [t.common.owner, name(p.owner)],
            [w.requirements, p.requirements.length ? p.requirements.join(', ') : '—'],
          ] as [string, string][]
        ).map(([k, v]) => (
          <div key={k} className="grid grid-cols-[8rem_1fr] gap-3 border-b border-line/50 pb-1.5">
            <dt className="text-mute">{k}</dt>
            <dd className="text-fg/90">{v}</dd>
          </div>
        ))}
      </dl>
      {docs.length > 0 && (
        <ul className="text-xs">
          {docs.map((d) => (
            <li key={d!.id}>📄 {d!.title}</li>
          ))}
        </ul>
      )}
      {canEdit ? (
        <div className="space-y-2">
          <Field label={t.common.comment}>
            <input className={inputCls} value={comment} onChange={(e) => setComment(e.target.value)} />
          </Field>
          {p.status === 'pending' && (
            <Field label={w.expiry}>
              <input type="date" className={inputCls} value={expiry} onChange={(e) => setExpiry(e.target.value)} />
            </Field>
          )}
          <Problems list={problems} />
          <div className="flex flex-wrap gap-2">
            <Btn onClick={() => record(null)}>{w.addComment}</Btn>
            {p.status === 'pending' && (
              <>
                <Btn kind="primary" onClick={() => record('approved')}>
                  {w.grant}
                </Btn>
                <Btn kind="danger" onClick={() => record('rejected')}>
                  {w.reject}
                </Btn>
              </>
            )}
          </div>
        </div>
      ) : (
        <Forbidden />
      )}
      <div>
        <p className="mb-2 text-xs text-mute">{w.comments}</p>
        <History items={p.comments} name={name} />
      </div>
    </div>
  );
}

function NewPermit({ onDone, words: w }: { onDone: () => void; words: W }) {
  const t = useText();
  const { data, change, user } = useStore();
  const [f, setF] = useState({ type: '', ref: '', pkg: data.packages[0]?.id ?? '', org: data.orgs[0]?.id ?? '', submitted: today(), expires: '', owner: user, requirements: '' });
  const [problems, setProblems] = useState<Problem[]>([]);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const save = () => {
    const p: Problem[] = [];
    if (!f.type.trim()) p.push({ field: 'type', code: 'required' });
    if (!f.pkg) p.push({ field: 'pkg', code: 'required' });
    if (!f.submitted) p.push({ field: 'submitted', code: 'required' });
    if (f.expires && f.submitted && f.expires <= f.submitted) p.push({ field: 'expires', code: 'dateOrder' });
    setProblems(p);
    if (p.length) return;
    const ok = change('permit.edit', 'permit', f.type, (d) => {
      d.permits.push({
        id: nextId('PM', d.permits.map((x) => x.id)),
        type: f.type.trim(),
        ref: f.ref.trim() || '—',
        pkg: f.pkg,
        org: f.org,
        submitted: f.submitted,
        expires: f.expires || undefined,
        status: 'pending',
        owner: f.owner,
        docs: [],
        comments: [{ at: today(), by: user, action: 'submitted' }],
        requirements: f.requirements
          .split(',')
          .map((x) => x.trim())
          .filter(Boolean),
      });
    });
    if (!ok) setProblems([{ field: 'role', code: 'forbidden' }]);
    else onDone();
  };
  const err = (field: string) => {
    const p = problems.find((x) => x.field === field);
    return p ? (field === 'expires' ? w.expiryOrder : t.problem[p.code]) : undefined;
  };
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <Field label={w.type} error={err('type')}>
        <input className={inputCls} value={f.type} onChange={(e) => set('type', e.target.value)} required />
      </Field>
      <Field label={w.ref}>
        <input className={inputCls} value={f.ref} onChange={(e) => set('ref', e.target.value)} />
      </Field>
      <Select label={t.common.package} value={f.pkg} onChange={(v) => set('pkg', v)} options={data.packages.map((p) => [p.id, `${p.id} · ${p.name}`])} />
      <Select label={w.org} value={f.org} onChange={(v) => set('org', v)} options={data.orgs.map((o) => [o.id, o.name])} />
      <Field label={w.submitted} error={err('submitted')}>
        <input type="date" className={inputCls} value={f.submitted} onChange={(e) => set('submitted', e.target.value)} required />
      </Field>
      <Field label={w.expires} error={err('expires')}>
        <input type="date" className={inputCls} value={f.expires} onChange={(e) => set('expires', e.target.value)} />
      </Field>
      <Select label={t.common.owner} value={f.owner} onChange={(v) => set('owner', v)} options={data.users.map((u) => [u.id, u.name])} />
      <Field label={w.requirements}>
        <input className={inputCls} value={f.requirements} onChange={(e) => set('requirements', e.target.value)} placeholder="…, …" />
      </Field>
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
