'use client';

import { useMemo, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { today } from '@/lib/construction/calc';
import { RISK_CATS, RISKS, type Risk, type RiskCat, type Trend } from '@/lib/construction/extra/risk';
import { useText, useWords } from '@/lib/construction/text';
import type { EnvRisk } from '@/lib/construction/types';
import type { Problem } from '@/lib/construction/validate';
import { Bars } from '../Charts';
import { useExtra } from '../extra';
import { Btn, Drawer, Field, Forbidden, History, inputCls, Kpi, PageHead, Panel, Pill, Problems, Select, Table, type Tone } from '../Kit';
import { nextId, useStore } from '../Store';

// The project risk register: every risk scored as probability × impact (1–5 each), placed on a 5 × 5 matrix that
// filters the list, with its owner, mitigation and the residual score expected once the mitigation is in place.
// The environmental risks of the ESG register are shown here too (read-only — they are kept on that page). The
// "what if" panel adds up the exposure as it would be if the chosen mitigations were done.
//
// Editing uses 'schedule.edit': the register belongs to the client side (project manager and supervising engineer),
// who weigh risks across packages. Contractors report hazards through quality and H&S records instead, so the wider
// 'quality.edit' (which contractors hold) would let a party score its own risks. Admin and managers hold it anyway.

const ACT = 'schedule.edit' as const;

const W = {
  mn: {
    lead: 'Төслийн эрсдэлийн бүртгэл: магадлал × нөлөө, 5×5 матриц, хариуцагч, бууруулах арга хэмжээ, үлдэгдэл эрсдэл ба «хэрэв» шинжилгээ.',
    cat: { schedule: 'Хугацаа', cost: 'Өртөг', technical: 'Техник', safety: 'Аюулгүй ажиллагаа', environmental: 'Байгаль орчин', social: 'Нийгэм', permits: 'Зөвшөөрөл' } as Record<RiskCat, string>,
    catLabel: 'Ангилал',
    band: { low: 'Бага', medium: 'Дунд', high: 'Өндөр', critical: 'Онц өндөр' } as Record<Band, string>,
    trend: { up: 'Өсөж буй', flat: 'Тогтвортой', down: 'Буурч буй' } as Record<Trend, string>,
    trendLabel: 'Чиг хандлага',
    state: { open: 'Нээлттэй', closed: 'Хаагдсан' },
    p: 'Магадлал',
    i: 'Нөлөө',
    score: 'Оноо',
    residual: 'Үлдэгдэл',
    residualFull: 'Арга хэмжээний дараах үлдэгдэл эрсдэл',
    rp: 'Үлдэгдэл магадлал',
    ri: 'Үлдэгдэл нөлөө',
    risk: 'Эрсдэл',
    title: 'Эрсдэлийн нэр',
    mitigation: 'Бууруулах арга хэмжээ',
    due: 'Арга хэмжээний хугацаа',
    ref: 'Холбоотой бүртгэл',
    matrix: 'Эрсдэлийн матриц',
    matrixHint: 'Нүдэн дээр дарж жагсаалтыг шүүнэ; дахин дарвал цэвэрлэнэ.',
    view: { current: 'Одоогийн', residual: 'Үлдэгдэл' },
    register: 'Эрсдэлийн бүртгэл',
    cell: 'Нүд',
    add: 'Эрсдэл нэмэх',
    edit: 'Эрсдэл засах',
    close: 'Хаах',
    reopen: 'Дахин нээх',
    closeNote: 'Хаах / дахин нээх шалтгаан',
    fromEsg: 'ESG бүртгэлээс',
    esgNote: 'Байгаль орчны эрсдэл «Иргэдэд хүрэх үр өгөөж» хуудсанд хөтлөгддөг. Оноо нь түвшнээс (өндөр 4×4, дунд 3×3, бага 2×2) тооцоологдсон.',
    openEsg: 'ESG хуудсанд нээх',
    kpiOpen: 'Нээлттэй эрсдэл',
    kpiCritical: 'Онц өндөр (≥15)',
    kpiExposure: 'Нийт эрсдэлийн оноо',
    kpiExposureSub: 'нээлттэй эрсдэлийн P×I нийлбэр',
    kpiResidual: 'Арга хэмжээ бүрэн хэрэгжвэл',
    kpiLate: 'Хугацаа хэтэрсэн арга хэмжээ',
    whatIf: '«Хэрэв» шинжилгээ — арга хэмжээ хэрэгжвэл',
    whatIfLead: 'Хэрэгжсэн гэж үзэх арга хэмжээг сонгоно уу. Сонгосон эрсдэлийн оноо үлдэгдэл оноогоор солигдоно.',
    pickAll: 'Бүгд',
    pickSoon: '30 хоногт хугацаатай',
    pickNone: 'Цэвэрлэх',
    now: 'Одоо',
    then: 'Хэрэгжсэний дараа',
    reduction: 'Бууралт',
    byCat: 'Ангиллаар (оноо)',
    biggest: 'Хамгийн их үр нөлөөтэй арга хэмжээ',
    criticalLeft: 'Үлдэх онц өндөр эрсдэл',
    nothingPicked: 'Арга хэмжээ сонгоогүй байна.',
    scoreChange: 'оноо',
    created: 'бүртгэсэн',
    resHigher: 'Үлдэгдэл оноо одоогийн онооноос их байж болохгүй',
    perm: 'Засах эрх: төслийн менежер, хяналтын инженер, админ',
  },
  en: {
    lead: 'The project risk register: probability × impact, a 5×5 matrix, owners, mitigations, residual risk and a “what if” view.',
    cat: { schedule: 'Schedule', cost: 'Cost', technical: 'Technical', safety: 'Safety', environmental: 'Environmental', social: 'Social', permits: 'Permits' },
    catLabel: 'Category',
    band: { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' },
    trend: { up: 'Rising', flat: 'Stable', down: 'Falling' },
    trendLabel: 'Trend',
    state: { open: 'Open', closed: 'Closed' },
    p: 'Probability',
    i: 'Impact',
    score: 'Score',
    residual: 'Residual',
    residualFull: 'Residual risk after mitigation',
    rp: 'Residual probability',
    ri: 'Residual impact',
    risk: 'Risk',
    title: 'Risk',
    mitigation: 'Mitigation',
    due: 'Mitigation due',
    ref: 'Related record',
    matrix: 'Risk matrix',
    matrixHint: 'Tap a cell to filter the list; tap it again to clear.',
    view: { current: 'Current', residual: 'Residual' },
    register: 'Risk register',
    cell: 'Cell',
    add: 'Add a risk',
    edit: 'Edit risk',
    close: 'Close',
    reopen: 'Reopen',
    closeNote: 'Reason for closing / reopening',
    fromEsg: 'From the ESG register',
    esgNote: 'Environmental risks are kept on the “Benefits to residents” page. Their scores are derived from the level (high 4×4, medium 3×3, low 2×2).',
    openEsg: 'Open the ESG page',
    kpiOpen: 'Open risks',
    kpiCritical: 'Critical (≥15)',
    kpiExposure: 'Total risk score',
    kpiExposureSub: 'sum of P×I of open risks',
    kpiResidual: 'If every mitigation is done',
    kpiLate: 'Overdue mitigations',
    whatIf: '“What if” — mitigations done',
    whatIfLead: 'Pick the mitigations to treat as done. Their risks’ scores are replaced by the residual scores.',
    pickAll: 'All',
    pickSoon: 'Due within 30 days',
    pickNone: 'Clear',
    now: 'Now',
    then: 'Once done',
    reduction: 'Reduction',
    byCat: 'By category (score)',
    biggest: 'Mitigations with the largest effect',
    criticalLeft: 'Critical risks remaining',
    nothingPicked: 'No mitigation picked.',
    scoreChange: 'score',
    created: 'opened',
    resHigher: 'The residual score cannot exceed the current score',
    perm: 'May edit: project manager, supervising engineer, admin',
  },
};

type Band = 'low' | 'medium' | 'high' | 'critical';
const band = (s: number): Band => (s >= 15 ? 'critical' : s >= 10 ? 'high' : s >= 5 ? 'medium' : 'low');
const BAND_TONE: Record<Band, Tone> = { low: 'good', medium: 'info', high: 'warn', critical: 'bad' };
const CELL: Record<Band, string> = {
  low: 'bg-emerald-400/[0.12] border-emerald-400/30',
  medium: 'bg-sky-400/[0.08] border-sky-400/25',
  high: 'bg-sky-400/[0.2] border-sky-400/45',
  critical: 'bg-red-400/[0.2] border-red-400/45',
};
const TREND_ICON: Record<Trend, string> = { up: '↑', flat: '→', down: '↓' };
const TREND_TONE: Record<Trend, Tone> = { up: 'bad', flat: 'neutral', down: 'good' };
const LEVELS = [1, 2, 3, 4, 5];

type Row = Risk & { env?: boolean };
// an ESG risk scored from its level so it can sit on the same matrix
const ENV_SCORE = { high: [4, 4, 2, 3], medium: [3, 3, 2, 2], low: [2, 2, 1, 2] } as const;
const fromEnv = (r: EnvRisk): Row => {
  const [p, i, rp, ri] = ENV_SCORE[r.level];
  return { id: r.id, title: r.title, cat: 'environmental', pkg: r.pkg, owner: r.owner, p, i, rp, ri, mitigation: r.mitigation, due: '', trend: 'flat', state: r.state === 'resolved' ? 'closed' : 'open', history: [], env: true };
};
// where a referenced record lives in the workspace
const refHref = (ref: string) => {
  const s = ref.startsWith('NP-') ? 'land' : ref.startsWith('PM-') ? 'permits' : ref.startsWith('HS-') ? 'safety' : ref.startsWith('NC-') || ref.startsWith('QI-') ? 'quality' : ref.startsWith('ER-') ? 'esg' : null;
  return s ? `/construction/${s}` : null;
};
const addDays = (d: string, n: number) => new Date(Date.parse(d + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10);

type Form = Omit<Risk, 'history' | 'state'> & { isNew: boolean };

export default function RiskModel() {
  const t = useText();
  const w = useWords(W);
  const { data, user, can, log } = useStore();
  const [risks, setRisks] = useExtra<Risk[]>('risk.register', RISKS);
  const [cat, setCat] = useState<'all' | RiskCat>('all');
  const [pkg, setPkg] = useState('all');
  const [state, setState] = useState<'all' | 'open' | 'closed'>('open');
  const [view, setView] = useState<'current' | 'residual'>('current');
  const [cell, setCell] = useState<{ p: number; i: number } | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [note, setNote] = useState('');
  const [problems, setProblems] = useState<Problem[]>([]);
  const [fieldErr, setFieldErr] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const now = today();
  const editable = can(ACT);
  const name = (id: string) => data.users.find((u) => u.id === id)?.name ?? data.orgs.find((o) => o.id === id)?.name ?? id;

  const all: Row[] = useMemo(() => [...risks, ...data.risks.map(fromEnv)], [risks, data.risks]);
  const openRisks = all.filter((r) => r.state === 'open');
  const pos = (r: Row) => (view === 'current' ? { p: r.p, i: r.i } : { p: r.rp, i: r.ri });

  // the matrix counts follow the category / package / state filters, then the cell narrows the list
  const base = all.filter((r) => (cat === 'all' || r.cat === cat) && (pkg === 'all' || r.pkg === pkg) && (state === 'all' || r.state === state));
  const rows = base
    .filter((r) => !cell || (pos(r).p === cell.p && pos(r).i === cell.i))
    .sort((a, b) => (a.state === b.state ? b.p * b.i - a.p * a.i : a.state === 'open' ? -1 : 1));
  const late = (r: Row) => r.state === 'open' && !!r.due && r.due < now;

  // what if: the picked open risks drop to their residual score
  const exposure = (pickedIds: string[], list = openRisks) => list.reduce((s, r) => s + (pickedIds.includes(r.id) ? r.rp * r.ri : r.p * r.i), 0);
  const nowExp = exposure([]);
  const thenExp = exposure(picked);
  const fullExp = exposure(openRisks.map((r) => r.id));
  const critNow = openRisks.filter((r) => r.p * r.i >= 15).length;
  const critThen = openRisks.filter((r) => (picked.includes(r.id) ? r.rp * r.ri : r.p * r.i) >= 15).length;
  const wins = openRisks
    .filter((r) => picked.includes(r.id))
    .map((r) => ({ r, gain: r.p * r.i - r.rp * r.ri }))
    .sort((a, b) => b.gain - a.gain)
    .slice(0, 5);

  const cur = open ? all.find((r) => r.id === open) ?? null : null;

  const save = () => {
    if (!form) return;
    const list: Problem[] = [];
    if (!form.title.trim()) list.push({ field: 'title', code: 'required' });
    if (!form.mitigation.trim()) list.push({ field: 'mitigation', code: 'required' });
    const resBad = form.rp * form.ri > form.p * form.i;
    if (resBad) list.push({ field: 'residual', code: 'range' });
    setFieldErr(resBad ? w.resHigher : '');
    setProblems(list);
    if (list.length) return;
    const { isNew, ...rec } = form;
    const id = isNew ? nextId('RK', risks.map((r) => r.id)) : rec.id;
    const old = risks.find((r) => r.id === id);
    const score = rec.p * rec.i;
    const oldScore = old ? old.p * old.i : score;
    const detail = isNew ? `${w.created} · ${score}` : oldScore !== score ? `${w.scoreChange} ${oldScore} → ${score}` : 'edit';
    if (!log(ACT, id, detail)) {
      setProblems([{ field: 'role', code: 'forbidden' }]);
      return;
    }
    // a changed score sets the trend unless the person chose one themselves
    const trend: Trend = !isNew && old && rec.trend === old.trend && score !== oldScore ? (score > oldScore ? 'up' : 'down') : rec.trend;
    const entry = { at: now, by: user, action: detail };
    setRisks((prev) =>
      isNew ? [...prev, { ...rec, id, trend, state: 'open', history: [entry] }] : prev.map((r) => (r.id === id ? { ...r, ...rec, trend, history: [...r.history, entry] } : r)),
    );
    setForm(null);
    setOpen(id);
  };

  const toggle = (r: Row) => {
    const to = r.state === 'open' ? 'closed' : 'open';
    if (!note.trim()) {
      setProblems([{ field: 'comment', code: 'required' }]);
      return;
    }
    if (!log(ACT, r.id, `${r.state} → ${to}`)) {
      setProblems([{ field: 'role', code: 'forbidden' }]);
      return;
    }
    setRisks((prev) => prev.map((x) => (x.id === r.id ? { ...x, state: to, history: [...x.history, { at: now, by: user, action: to, comment: note.trim() }] } : x)));
    setNote('');
    setProblems([]);
  };

  const newForm = (): Form => ({ isNew: true, id: '', title: '', cat: cat === 'all' ? 'schedule' : cat, pkg: pkg === 'all' ? data.packages[0]?.id ?? '' : pkg, owner: user, p: 3, i: 3, rp: 2, ri: 2, mitigation: '', due: addDays(now, 30), trend: 'flat', ref: '' });

  const levelSel = (label: string, v: number, set: (n: number) => void) => (
    <Field label={label}>
      <select className={inputCls} value={v} onChange={(e) => set(Number(e.target.value))}>
        {LEVELS.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    </Field>
  );

  return (
    <div className="space-y-6">
      <PageHead
        title={t.section.risk}
        lead={w.lead}
        action={
          editable ? (
            <Btn
              kind="primary"
              onClick={() => {
                setProblems([]);
                setFieldErr('');
                setForm(newForm());
              }}
            >
              + {w.add}
            </Btn>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Kpi label={w.kpiOpen} value={openRisks.length} tone={openRisks.length ? 'warn' : 'good'} />
        <Kpi label={w.kpiCritical} value={critNow} tone={critNow ? 'bad' : 'good'} />
        <Kpi label={w.kpiExposure} value={nowExp} sub={w.kpiExposureSub} />
        <Kpi label={w.kpiResidual} value={fullExp} sub={`${w.reduction}: ${nowExp ? Math.round(((nowExp - fullExp) / nowExp) * 100) : 0}%`} tone="good" />
        <Kpi label={w.kpiLate} value={openRisks.filter(late).length} tone={openRisks.some(late) ? 'bad' : 'neutral'} />
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <Select label={w.catLabel} value={cat} onChange={setCat} options={[['all', t.filter.all], ...RISK_CATS.map((c): [RiskCat, string] => [c, w.cat[c]])]} />
        <Select label={t.filter.pkg} value={pkg} onChange={setPkg} options={[['all', t.filter.all], ...data.packages.map((p): [string, string] => [p.id, p.id])]} />
        <Select
          label={t.filter.status}
          value={state}
          onChange={setState}
          options={[
            ['all', t.filter.all],
            ['open', w.state.open],
            ['closed', w.state.closed],
          ]}
        />
        {(cat !== 'all' || pkg !== 'all' || state !== 'open' || cell) && (
          <Btn
            onClick={() => {
              setCat('all');
              setPkg('all');
              setState('open');
              setCell(null);
            }}
          >
            {t.filter.clear}
          </Btn>
        )}
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <Panel
          title={w.matrix}
          action={
            <div className="flex rounded-full border border-line p-0.5 text-xs" role="group" aria-label={w.matrix}>
              {(['current', 'residual'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={view === v}
                  onClick={() => {
                    setView(v);
                    setCell(null);
                  }}
                  className={`h-8 cursor-pointer rounded-full px-3 ${view === v ? 'bg-accent/20 text-fg' : 'text-mute hover:text-fg'}`}
                >
                  {w.view[v]}
                </button>
              ))}
            </div>
          }
        >
          <p className="mb-3 text-xs text-mute">{w.matrixHint}</p>
          {/* impact up the side (5 at the top), probability along the bottom */}
          <div className="grid grid-cols-[1.25rem_repeat(5,minmax(0,1fr))] gap-1">
            {[5, 4, 3, 2, 1].map((i) => (
              <div key={i} className="contents">
                <span className="flex items-center justify-center font-mono text-[11px] text-mute">{i}</span>
                {LEVELS.map((p) => {
                  const n = base.filter((r) => pos(r).p === p && pos(r).i === i).length;
                  const on = cell?.p === p && cell?.i === i;
                  const b = band(p * i);
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setCell(on ? null : { p, i })}
                      aria-pressed={on}
                      aria-label={`${w.p} ${p}, ${w.i} ${i}: ${n}`}
                      title={`${w.p} ${p} × ${w.i} ${i} = ${p * i} · ${w.band[b]}`}
                      className={`relative flex aspect-square min-h-10 cursor-pointer flex-col items-center justify-center rounded-md border transition ${CELL[b]} ${on ? 'ring-2 ring-accent' : 'hover:brightness-125'}`}
                    >
                      <span className={`font-mono text-base tabular-nums ${n ? 'text-fg' : 'text-fg/20'}`}>{n || '·'}</span>
                      <span className="absolute right-1 bottom-0.5 font-mono text-[9px] text-mute">{p * i}</span>
                    </button>
                  );
                })}
              </div>
            ))}
            <span />
            {LEVELS.map((p) => (
              <span key={p} className="text-center font-mono text-[11px] text-mute">
                {p}
              </span>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-mute">
            <span>↑ {w.i}</span>
            <span>{w.p} →</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {(['low', 'medium', 'high', 'critical'] as Band[]).map((b) => (
              <Pill key={b} tone={BAND_TONE[b]}>
                {w.band[b]} {b === 'low' ? '1–4' : b === 'medium' ? '5–9' : b === 'high' ? '10–14' : '15–25'}
              </Pill>
            ))}
          </div>
        </Panel>

        <Panel
          title={w.register}
          action={
            <div className="flex flex-wrap items-center gap-2">
              {cell && (
                <button type="button" onClick={() => setCell(null)} className="cursor-pointer">
                  <Pill tone="info">
                    {w.cell} {w.p[0]}
                    {cell.p}×{w.i[0]}
                    {cell.i} ✕
                  </Pill>
                </button>
              )}
              {!editable && <span className="text-xs text-mute">🔒 {w.perm}</span>}
            </div>
          }
        >
          <Table head={['ID', w.risk, w.catLabel, t.common.package, w.score, w.residual, w.trendLabel, t.common.owner, w.due, t.common.status]} empty={!rows.length}>
            {rows.map((r) => {
              const s = r.p * r.i;
              const rs = r.rp * r.ri;
              return (
                <tr key={r.id} className="cursor-pointer hover:bg-surface/50" onClick={() => (setOpen(r.id), setProblems([]), setNote(''))}>
                  <td className="px-2 py-2 font-mono text-xs text-mute">{r.id}</td>
                  <td className="px-2 py-2">
                    <p className="max-w-[320px] text-fg/90">{r.title}</p>
                    {r.env && <p className="text-[11px] text-mute">{w.fromEsg}</p>}
                  </td>
                  <td className="px-2 py-2 text-xs">{w.cat[r.cat]}</td>
                  <td className="px-2 py-2 font-mono text-xs">{r.pkg}</td>
                  <td className="px-2 py-2">
                    <Pill tone={BAND_TONE[band(s)]}>
                      <span className="font-mono">{s}</span> {r.p}×{r.i}
                    </Pill>
                  </td>
                  <td className="px-2 py-2">
                    <Pill tone={BAND_TONE[band(rs)]}>
                      <span className="font-mono">{rs}</span>
                    </Pill>
                  </td>
                  <td className="px-2 py-2">
                    <Pill tone={TREND_TONE[r.trend]}>
                      {TREND_ICON[r.trend]} {w.trend[r.trend]}
                    </Pill>
                  </td>
                  <td className="px-2 py-2 text-xs text-mute">{name(r.owner)}</td>
                  <td className={`px-2 py-2 font-mono text-xs tabular-nums ${late(r) ? 'text-red-300' : ''}`}>{r.due || '—'}</td>
                  <td className="px-2 py-2">
                    <Pill tone={r.state === 'open' ? 'warn' : 'good'}>{w.state[r.state]}</Pill>
                  </td>
                </tr>
              );
            })}
          </Table>
        </Panel>
      </div>

      <Panel
        title={w.whatIf}
        action={
          <div className="flex flex-wrap gap-2">
            <Btn onClick={() => setPicked(openRisks.map((r) => r.id))}>{w.pickAll}</Btn>
            <Btn onClick={() => setPicked(openRisks.filter((r) => r.due && r.due <= addDays(now, 30)).map((r) => r.id))}>{w.pickSoon}</Btn>
            <Btn onClick={() => setPicked([])}>{w.pickNone}</Btn>
          </div>
        }
      >
        <p className="mb-4 text-xs text-mute">{w.whatIfLead}</p>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-2">
          <ul className="max-h-[420px] space-y-1 overflow-y-auto pr-1" data-lenis-prevent>
            {openRisks
              .slice()
              .sort((a, b) => b.p * b.i - b.rp * b.ri - (a.p * a.i - a.rp * a.ri))
              .map((r) => {
                const on = picked.includes(r.id);
                return (
                  <li key={r.id}>
                    <label className={`flex min-h-10 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-xs ${on ? 'border-accent/50 bg-accent/[0.06]' : 'border-line hover:border-mute'}`}>
                      <input type="checkbox" className="h-4 w-4 shrink-0 accent-[var(--color-accent)]" checked={on} onChange={() => setPicked((x) => (on ? x.filter((y) => y !== r.id) : [...x, r.id]))} />
                      <span className="min-w-0 flex-1">
                        <span className="font-mono text-mute">{r.id}</span> <span className="text-fg/90">{r.title}</span>
                      </span>
                      <span className="shrink-0 font-mono tabular-nums">
                        {r.p * r.i} → <span className="text-emerald-300">{r.rp * r.ri}</span>
                      </span>
                    </label>
                  </li>
                );
              })}
          </ul>
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-3">
              <Kpi label={w.now} value={nowExp} />
              <Kpi label={w.then} value={thenExp} tone={thenExp < nowExp ? 'good' : 'neutral'} />
              <Kpi label={w.reduction} value={nowExp ? `${Math.round(((nowExp - thenExp) / nowExp) * 100)}%` : '—'} tone={thenExp < nowExp ? 'good' : 'neutral'} />
            </div>
            <p className="text-xs text-mute">
              {w.criticalLeft}: <span className="font-mono text-fg">{critNow}</span> → <span className={`font-mono ${critThen ? 'text-red-300' : 'text-emerald-300'}`}>{critThen}</span>
            </p>
            <Bars
              unit={w.byCat}
              rows={RISK_CATS.map((c) => {
                const list = openRisks.filter((r) => r.cat === c);
                return { label: w.cat[c], values: [exposure([], list), exposure(picked, list)] };
              }).filter((r) => r.values[0])}
              measures={[
                { name: w.now, color: '#7dd3fc' },
                { name: w.then, color: '#7fa36a' },
              ]}
            />
            <div>
              <p className="mb-2 text-xs text-mute">{w.biggest}</p>
              {wins.length ? (
                <ol className="space-y-1 text-xs">
                  {wins.map(({ r, gain }) => (
                    <li key={r.id} className="flex justify-between gap-3">
                      <span className="min-w-0 truncate text-fg/85">
                        {r.id} · {r.mitigation}
                      </span>
                      <span className="shrink-0 font-mono text-emerald-300">−{gain}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-xs text-mute">{w.nothingPicked}</p>
              )}
            </div>
          </div>
        </div>
      </Panel>

      <Drawer
        open={!!cur}
        onClose={() => {
          setOpen(null);
          setProblems([]);
          setNote('');
        }}
        title={cur ? `${cur.id} · ${cur.title}` : ''}
      >
        {cur && (
          <div className="space-y-5 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone={cur.state === 'open' ? 'warn' : 'good'}>{w.state[cur.state]}</Pill>
              <Pill>{w.cat[cur.cat]}</Pill>
              <Pill tone={TREND_TONE[cur.trend]}>
                {TREND_ICON[cur.trend]} {w.trend[cur.trend]}
              </Pill>
              {late(cur) && <Pill tone="bad">{t.common.overdue}</Pill>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-line p-3">
                <p className="text-xs text-mute">{w.score}</p>
                <p className="mt-1 font-mono text-xl">{cur.p * cur.i}</p>
                <p className="text-xs text-mute">
                  {w.p} {cur.p} × {w.i} {cur.i}
                </p>
                <div className="mt-2">
                  <Pill tone={BAND_TONE[band(cur.p * cur.i)]}>{w.band[band(cur.p * cur.i)]}</Pill>
                </div>
              </div>
              <div className="rounded-xl border border-line p-3">
                <p className="text-xs text-mute">{w.residual}</p>
                <p className="mt-1 font-mono text-xl text-emerald-300">{cur.rp * cur.ri}</p>
                <p className="text-xs text-mute">
                  {w.p} {cur.rp} × {w.i} {cur.ri}
                </p>
                <div className="mt-2">
                  <Pill tone={BAND_TONE[band(cur.rp * cur.ri)]}>{w.band[band(cur.rp * cur.ri)]}</Pill>
                </div>
              </div>
            </div>
            <dl className="space-y-2 text-xs">
              <div>
                <dt className="text-mute">{w.mitigation}</dt>
                <dd className="mt-0.5 text-fg/90">{cur.mitigation}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-mute">{t.common.package}</dt>
                <dd>
                  {cur.pkg} · {data.packages.find((p) => p.id === cur.pkg)?.name}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-mute">{t.common.owner}</dt>
                <dd>{name(cur.owner)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-mute">{w.due}</dt>
                <dd className="font-mono">{cur.due || '—'}</dd>
              </div>
              {(cur.ref || cur.env) && (
                <div className="flex justify-between gap-3">
                  <dt className="text-mute">{w.ref}</dt>
                  <dd>
                    {(() => {
                      const ref = cur.env ? cur.id : cur.ref!;
                      const href = refHref(ref);
                      return href ? (
                        <Link href={href} className="font-mono text-accent-hi hover:underline">
                          {ref} →
                        </Link>
                      ) : (
                        <span className="font-mono">{ref}</span>
                      );
                    })()}
                  </dd>
                </div>
              )}
            </dl>

            {cur.env ? (
              <div className="space-y-2 rounded-xl border border-line p-3 text-xs text-mute">
                <p>{w.esgNote}</p>
                <Link href="/construction/esg" className="inline-flex h-10 items-center text-accent-hi hover:underline">
                  {w.openEsg} →
                </Link>
              </div>
            ) : editable ? (
              <div className="space-y-2 rounded-xl border border-line p-3">
                <Field label={w.closeNote}>
                  <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} />
                </Field>
                <div className="flex flex-wrap gap-2">
                  <Btn
                    kind="primary"
                    onClick={() => {
                      setProblems([]);
                      setFieldErr('');
                      const { history: _h, state: _s, ...rest } = cur;
                      void _h;
                      void _s;
                      setForm({ ...rest, ref: rest.ref ?? '', isNew: false });
                    }}
                  >
                    {t.common.edit}
                  </Btn>
                  <Btn kind={cur.state === 'open' ? 'danger' : 'ghost'} onClick={() => toggle(cur)}>
                    {cur.state === 'open' ? w.close : w.reopen}
                  </Btn>
                </div>
                <Problems list={problems} />
              </div>
            ) : (
              <Forbidden />
            )}

            {!cur.env && (
              <div>
                <p className="mb-2 text-xs text-mute">{t.common.history}</p>
                <History items={cur.history} name={name} />
              </div>
            )}
          </div>
        )}
      </Drawer>

      <Drawer open={!!form} onClose={() => setForm(null)} title={form?.isNew ? w.add : `${w.edit} · ${form?.id ?? ''}`}>
        {form && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <Field label={w.title}>
              <input className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={w.catLabel}>
                <select className={inputCls} value={form.cat} onChange={(e) => setForm({ ...form, cat: e.target.value as RiskCat })}>
                  {RISK_CATS.map((c) => (
                    <option key={c} value={c}>
                      {w.cat[c]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t.common.package}>
                <select className={inputCls} value={form.pkg} onChange={(e) => setForm({ ...form, pkg: e.target.value })}>
                  {data.packages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.id} · {p.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {levelSel(w.p, form.p, (n) => setForm({ ...form, p: n }))}
              {levelSel(w.i, form.i, (n) => setForm({ ...form, i: n }))}
            </div>
            <Field label={w.mitigation}>
              <textarea rows={3} className={`${inputCls} h-auto py-2`} value={form.mitigation} onChange={(e) => setForm({ ...form, mitigation: e.target.value })} />
            </Field>
            <p className="text-xs text-mute">{w.residualFull}</p>
            <div className="grid grid-cols-2 gap-3">
              {levelSel(w.rp, form.rp, (n) => setForm({ ...form, rp: n }))}
              {levelSel(w.ri, form.ri, (n) => setForm({ ...form, ri: n }))}
            </div>
            {fieldErr && <p className="text-xs text-red-300">{fieldErr}</p>}
            <p className="text-xs text-mute">
              {w.score}: <span className="font-mono text-fg">{form.p * form.i}</span> → {w.residual}: <span className="font-mono text-emerald-300">{form.rp * form.ri}</span>
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t.common.owner}>
                <select className={inputCls} value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })}>
                  {data.users
                    .filter((u) => u.role !== 'viewer')
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                </select>
              </Field>
              <Field label={w.due}>
                <input type="date" className={inputCls} value={form.due} onChange={(e) => setForm({ ...form, due: e.target.value })} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label={w.trendLabel}>
                <select className={inputCls} value={form.trend} onChange={(e) => setForm({ ...form, trend: e.target.value as Trend })}>
                  {(['up', 'flat', 'down'] as Trend[]).map((x) => (
                    <option key={x} value={x}>
                      {TREND_ICON[x]} {w.trend[x]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={w.ref}>
                <input className={inputCls} placeholder="PM-3, NC-1…" value={form.ref ?? ''} onChange={(e) => setForm({ ...form, ref: e.target.value.trim() })} />
              </Field>
            </div>
            <Problems list={problems} />
            <div className="flex gap-2">
              <Btn kind="primary" type="submit">
                {t.common.save}
              </Btn>
              <Btn onClick={() => setForm(null)}>{t.common.cancel}</Btn>
            </div>
          </form>
        )}
      </Drawer>
    </div>
  );
}
