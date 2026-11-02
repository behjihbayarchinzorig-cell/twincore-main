'use client';

import { useState } from 'react';
import { activityProgress, latestBaseline, plannedAt, projectProgress, pct, today, variance } from '@/lib/construction/calc';
import { useText, useWords } from '@/lib/construction/text';
import type { Data, ProgressRecord, ProgressState } from '@/lib/construction/types';
import { checkFile, nextSteps, type Problem } from '@/lib/construction/validate';
import { Bar, Btn, Drawer, Field, Forbidden, History, inputCls, Kpi, Panel, PageHead, Pill, Problems, Select, Table, toneOf } from '../Kit';
import { nextId, useStore } from '../Store';

// Гүйцэтгэл: the record of work actually done. A record starts as a draft, is submitted for review, and is approved
// or sent back with a reason; only approved records count towards progress. Each activity shows where the baseline
// says it should be today, what was reported, and what has been approved.

const W = {
  mn: {
    lead: 'Бодит гүйцэтгэлийг бүртгэж, хянуулж, батлуулна. Зөвхөн батлагдсан бүртгэл гүйцэтгэлд тооцогдоно.',
    add: 'Гүйцэтгэл бүртгэх',
    rule: 'Тооцооны дүрэм: ажил бүрийн гүйцэтгэл = хамгийн сүүлийн батлагдсан бүртгэлийн хувь; багцынх = ажлуудын жингээр жигнэсэн дундаж; төслийнх = багцуудын батлагдсан төсвөөр жигнэсэн дундаж. Төлөвлөгөөт хувь нь батлагдсан суурь хуваарийн хугацаанд шугаман өснө. Ноорог, буцаагдсан бүртгэл тооцогдохгүй.',
    approved: 'Батлагдсан гүйцэтгэл',
    reported: 'Мэдээлсэн (батлагдаагүй)',
    planned: 'Төлөвлөсөн (өнөөдөр)',
    waiting: 'Хянуулахаар хүлээгдэж буй',
    records: 'Гүйцэтгэлийн бүртгэл',
    byActivity: 'Ажил бүрээр: төлөвлөгөө, мэдээлсэн, батлагдсан',
    activity: 'Ажил',
    percent: 'Хуримтлагдсан гүйцэтгэл (%)',
    note: 'Тэмдэглэл',
    evidence: 'Нотлох баримт (зураг, PDF)',
    evidenceNote: 'Сервер холбогдоогүй тул зөвхөн файлын нэр хадгалагдана — файл өөрөө илгээгдэхгүй.',
    saveDraft: 'Ноорог хадгалах',
    submit: 'Хянуулахаар илгээх',
    reason: 'Буцаах шалтгаан (заавал)',
    act: { submitted: 'Хянуулахаар илгээх', approved: 'Батлах', rejected: 'Буцаах', draft: 'Дахин засах' } as Record<ProgressState, string>,
    delay: 'Хоцрогдол',
    shift: 'Хугацаа өөрчлөгдсөн',
    by: 'Бүртгэсэн',
    newTitle: 'Шинэ гүйцэтгэлийн бүртгэл',
    none: 'нотлох баримтгүй',
  },
  en: {
    lead: 'Record the work actually done, submit it for review, approve it. Only approved records count towards progress.',
    add: 'Record progress',
    rule: 'Calculation rule: an activity’s progress = its latest approved record; a package’s = the activities’ weighted average; the project’s = the packages’ average weighted by approved budget. Planned progress rises linearly across the approved baseline dates. Drafts and rejected records never count.',
    approved: 'Approved progress',
    reported: 'Reported (not yet approved)',
    planned: 'Planned (today)',
    waiting: 'Waiting for review',
    records: 'Progress records',
    byActivity: 'By activity: planned, reported, approved',
    activity: 'Activity',
    percent: 'Cumulative progress (%)',
    note: 'Note',
    evidence: 'Evidence (photos, PDF)',
    evidenceNote: 'No server is connected, so only the file names are kept — the files themselves are not uploaded.',
    saveDraft: 'Save draft',
    submit: 'Submit for review',
    reason: 'Reason for rejecting (required)',
    act: { submitted: 'Submit for review', approved: 'Approve', rejected: 'Reject', draft: 'Reopen' },
    delay: 'Behind plan',
    shift: 'Dates changed',
    by: 'Recorded by',
    newTitle: 'New progress record',
    none: 'no evidence',
  },
};

export default function Progress() {
  const t = useText();
  const w = useWords(W);
  const { data, role, user, can, change } = useStore();
  const [pkg, setPkg] = useState('all');
  const [state, setState] = useState<'all' | ProgressState>('all');
  const [open, setOpen] = useState<string | null>(null);
  const [form, setForm] = useState<{ activity: string; date: string; percent: number; note: string; files: string[] } | null>(null);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [reason, setReason] = useState('');
  const now = today();
  const bl = latestBaseline(data);
  const actOf = (id: string) => data.activities.find((a) => a.id === id);
  const name = (id: string) => data.users.find((u) => u.id === id)?.name ?? data.orgs.find((o) => o.id === id)?.name ?? id;

  const records = data.progress
    .filter((r) => (pkg === 'all' || actOf(r.activity)?.pkg === pkg) && (state === 'all' || r.state === state))
    .sort((a, b) => b.date.localeCompare(a.date));
  const proj = projectProgress(data, pkg === 'all' ? undefined : [pkg]);
  const waiting = data.progress.filter((r) => r.state === 'submitted').length;
  const rec = open ? data.progress.find((r) => r.id === open) : null;

  const step = (r: ProgressRecord, to: ProgressState) => {
    if (to === 'rejected' && !reason.trim()) {
      setProblems([{ field: 'comment', code: 'required' }]);
      return;
    }
    const review = to === 'approved' || to === 'rejected';
    const ok = change(review ? 'progress.review' : 'progress.submit', r.id, `${r.state} → ${to}`, (d: Data) => {
      const x = d.progress.find((p) => p.id === r.id)!;
      x.state = to;
      x.history.push({ at: now, by: user, action: to, comment: to === 'rejected' ? reason.trim() : undefined });
    });
    if (!ok) setProblems([{ field: 'role', code: 'forbidden' }]);
    else {
      setProblems([]);
      setReason('');
    }
  };

  const create = (to: 'draft' | 'submitted') => {
    if (!form) return;
    const list: Problem[] = [];
    if (!form.activity) list.push({ field: 'activity', code: 'required' });
    if (!form.date) list.push({ field: 'date', code: 'required' });
    if (form.percent < 0 || form.percent > 100 || Number.isNaN(form.percent)) list.push({ field: 'percent', code: 'range' });
    setProblems(list);
    if (list.length) return;
    const id = nextId('PR', data.progress.map((p) => p.id));
    const ok = change('progress.submit', id, to, (d: Data) => {
      d.progress.push({ id, activity: form.activity, date: form.date, percent: form.percent, note: form.note, evidence: form.files, state: to, by: user, history: to === 'submitted' ? [{ at: now, by: user, action: 'submitted' }] : [] });
    });
    if (!ok) setProblems([{ field: 'role', code: 'forbidden' }]);
    else setForm(null);
  };

  const acts = data.activities.filter((a) => pkg === 'all' || a.pkg === pkg);

  return (
    <div className="space-y-6">
      <PageHead
        title={t.section.progress}
        lead={w.lead}
        action={
          can('progress.submit') ? (
            <Btn
              kind="primary"
              onClick={() => {
                setProblems([]);
                setForm({ activity: acts[0]?.id ?? '', date: now, percent: 0, note: '', files: [] });
              }}
            >
              + {w.add}
            </Btn>
          ) : undefined
        }
      />
      {!can('progress.submit') && <Forbidden />}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label={w.approved} value={pct(proj.approved)} tone={proj.approved < proj.planned - 5 ? 'warn' : 'good'} />
        <Kpi label={w.reported} value={pct(proj.reported)} />
        <Kpi label={w.planned} value={pct(proj.planned)} />
        <Kpi label={w.waiting} value={waiting} tone={waiting ? 'info' : 'neutral'} />
      </div>
      <p className="rounded-xl border border-line bg-surface/30 px-4 py-3 text-xs leading-relaxed text-mute">{w.rule}</p>

      <Panel
        title={w.byActivity}
        action={<Select label={t.filter.pkg} value={pkg} onChange={setPkg} options={[['all', t.filter.all], ...data.packages.map((p): [string, string] => [p.id, p.id])]} />}
      >
        <Table head={[w.activity, w.planned, w.reported, w.approved, '']} empty={!acts.length}>
          {acts.map((a) => {
            const p = activityProgress(data, a.id);
            const plan = plannedAt(a, bl, now);
            const behind = plan - p.approved > 5;
            const v = variance(data, a);
            return (
              <tr key={a.id}>
                <td className="px-2 py-2">
                  <span className="font-mono text-[10px] text-mute">{a.id}</span> <span className="text-fg/90">{a.name}</span>
                  <div className="mt-1.5 w-full max-w-[260px]">
                    <Bar value={p.approved} planned={plan} tone={behind ? 'warn' : 'info'} label={a.name} />
                  </div>
                </td>
                <td className="px-2 py-2 font-mono tabular-nums">{pct(plan)}</td>
                <td className="px-2 py-2 font-mono tabular-nums text-mute">{pct(p.reported)}</td>
                <td className="px-2 py-2 font-mono tabular-nums">{pct(p.approved)}</td>
                <td className="space-x-1 px-2 py-2 text-right">
                  {behind && <Pill tone="warn">{w.delay} {Math.round(plan - p.approved)}</Pill>}
                  {v != null && v !== 0 && (
                    <Pill tone={v > 0 ? 'warn' : 'good'}>
                      {w.shift} {v > 0 ? '+' : ''}
                      {v} {t.common.days}
                    </Pill>
                  )}
                </td>
              </tr>
            );
          })}
        </Table>
      </Panel>

      <Panel
        title={w.records}
        action={
          <Select
            label={t.filter.status}
            value={state}
            onChange={setState}
            options={[['all', t.filter.all], ...(['draft', 'submitted', 'approved', 'rejected'] as ProgressState[]).map((s): [ProgressState, string] => [s, t.progressState[s]])]}
          />
        }
      >
        <Table head={['ID', t.common.date, w.activity, '%', t.common.status, w.by]} empty={!records.length}>
          {records.map((r) => (
            <tr key={r.id} className="cursor-pointer hover:bg-surface/50" onClick={() => setOpen(r.id)}>
              <td className="px-2 py-2 font-mono text-xs text-mute">{r.id}</td>
              <td className="px-2 py-2 font-mono text-xs tabular-nums">{r.date}</td>
              <td className="px-2 py-2">{actOf(r.activity)?.name ?? r.activity}</td>
              <td className="px-2 py-2 font-mono tabular-nums">{r.percent}%</td>
              <td className="px-2 py-2">
                <Pill tone={toneOf(r.state)}>{t.progressState[r.state]}</Pill>
              </td>
              <td className="px-2 py-2 text-xs text-mute">{name(r.by)}</td>
            </tr>
          ))}
        </Table>
      </Panel>

      {/* a record: its details, its review steps and its history */}
      <Drawer
        open={!!rec}
        onClose={() => {
          setOpen(null);
          setProblems([]);
          setReason('');
        }}
        title={rec ? `${rec.id} · ${actOf(rec.activity)?.name ?? ''}` : ''}
      >
        {rec && (
          <div className="space-y-5 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone={toneOf(rec.state)}>{t.progressState[rec.state]}</Pill>
              <span className="font-mono text-xs text-mute">{rec.date}</span>
              <span className="font-mono">{rec.percent}%</span>
            </div>
            {rec.note && <p className="text-fg/85">{rec.note}</p>}
            <div>
              <p className="text-xs text-mute">{w.evidence}</p>
              {rec.evidence.length ? (
                <ul className="mt-1 space-y-0.5 font-mono text-xs">
                  {rec.evidence.map((f) => (
                    <li key={f}>📎 {f}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-xs text-mute">— {w.none}</p>
              )}
            </div>
            {nextSteps(rec.state, role).length > 0 && (
              <div className="space-y-2 rounded-xl border border-line p-3">
                {nextSteps(rec.state, role).includes('rejected') && (
                  <Field label={w.reason}>
                    <input className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} />
                  </Field>
                )}
                <div className="flex flex-wrap gap-2">
                  {nextSteps(rec.state, role).map((to) => (
                    <Btn key={to} kind={to === 'approved' ? 'primary' : to === 'rejected' ? 'danger' : 'ghost'} onClick={() => step(rec, to)}>
                      {w.act[to]}
                    </Btn>
                  ))}
                </div>
                <Problems list={problems} />
              </div>
            )}
            {!nextSteps(rec.state, role).length && rec.state !== 'approved' && <Forbidden />}
            <div>
              <p className="mb-2 text-xs text-mute">{t.common.history}</p>
              <History items={rec.history} name={name} />
            </div>
          </div>
        )}
      </Drawer>

      {/* a new record */}
      <Drawer open={!!form} onClose={() => setForm(null)} title={w.newTitle}>
        {form && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              create('submitted');
            }}
          >
            <Field label={w.activity}>
              <select className={inputCls} value={form.activity} onChange={(e) => setForm({ ...form, activity: e.target.value })}>
                {data.activities.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.id} · {a.name}
                  </option>
                ))}
              </select>
            </Field>
            {form.activity && (
              <p className="text-xs text-mute">
                {w.approved}: {pct(activityProgress(data, form.activity).approved)} · {w.planned}: {pct(plannedAt(actOf(form.activity)!, bl, now))}
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Field label={t.common.date}>
                <input type="date" className={inputCls} value={form.date} max={now} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </Field>
              <Field label={w.percent}>
                <input type="number" min={0} max={100} className={inputCls} value={form.percent} onChange={(e) => setForm({ ...form, percent: Number(e.target.value) })} />
              </Field>
            </div>
            <Field label={w.note}>
              <textarea className={`${inputCls} h-20 py-1.5`} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            </Field>
            <Field label={w.evidence}>
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="text-xs text-mute file:mr-3 file:rounded-full file:border file:border-line file:bg-ink file:px-3 file:py-1 file:text-fg"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  const bad = files.flatMap((f) => checkFile(f));
                  setProblems(bad);
                  setForm({ ...form, files: files.filter((f) => !checkFile(f).length).map((f) => f.name) });
                }}
              />
            </Field>
            <p className="text-[11px] text-mute">{w.evidenceNote}</p>
            {form.files.length > 0 && (
              <ul className="font-mono text-xs text-fg/80">
                {form.files.map((f) => (
                  <li key={f}>📎 {f}</li>
                ))}
              </ul>
            )}
            <Problems list={problems} />
            <div className="flex flex-wrap gap-2">
              <Btn kind="primary" type="submit">
                {w.submit}
              </Btn>
              <Btn onClick={() => create('draft')}>{w.saveDraft}</Btn>
              <Btn onClick={() => setForm(null)}>{t.common.cancel}</Btn>
            </div>
          </form>
        )}
      </Drawer>
    </div>
  );
}
