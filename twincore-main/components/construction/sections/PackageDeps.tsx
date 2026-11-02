'use client';

import { useMemo, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { activityProgress, isOverdue, pct, today } from '@/lib/construction/calc';
import { INTERFACES, type InterfaceLink } from '@/lib/construction/extra/pkgDeps';
import { useText, useWords } from '@/lib/construction/text';
import type { Activity, Data } from '@/lib/construction/types';
import type { Problem } from '@/lib/construction/validate';
import { Btn, Drawer, Field, Forbidden, inputCls, Kpi, Loading, PageHead, Panel, Pill, Problems, Select, Table, type Tone } from '../Kit';
import { useExtra } from '../extra';
import { nextId, useStore } from '../Store';
import { PKG_COLOR } from '../WorkspaceMap';

// Багцын хамаарал: which work package waits on which. A package depends on another when one of its activities must
// wait for an activity of the other — from the schedule's own dependencies (data.activities[].deps) and from the
// interface register kept on this page (cross-package links agreed between the parties but not yet in the schedule).
//
// Each activity pair is checked:
//  • late    — the predecessor is overdue (isOverdue: not 100 % approved and past its finish)
//  • blocked — the successor should already have started, but its predecessor isn't finished
//  • clash   — the schedule has the successor starting before the predecessor finishes
// A package link takes the worst state of its pairs. The network lays packages out left to right by dependency
// depth (longest chain of predecessors); loops between packages are possible and are flagged, not hidden.

type PairState = 'late' | 'blocked' | 'clash' | 'ok' | 'done';
type Pair = { act: Activity; dep: Activity; source: 'schedule' | 'interface'; ref?: InterfaceLink; state: PairState };
type Link_ = { from: string; to: string; pairs: Pair[]; state: PairState };

const RANK: PairState[] = ['late', 'blocked', 'clash', 'ok', 'done'];
const worst = (xs: PairState[]) => RANK.find((s) => xs.includes(s)) ?? 'ok';
const TONE: Record<PairState, Tone> = { late: 'bad', blocked: 'bad', clash: 'warn', ok: 'info', done: 'good' };
const STROKE: Record<PairState, string> = { late: '#f87171', blocked: '#f87171', clash: '#7dd3fc', ok: '#60a5fa', done: '#7fa36a' };

const W = {
  mn: {
    lead: 'Нэг багцын ажил нөгөө багцын ажил дуусахыг хүлээх хамаарал — хуваарийн хамаарал ба интерфейсийн бүртгэлээс. Хоцорсон, саатсан холбоосыг тодруулна.',
    links: 'Багц хоорондын холбоос',
    pairs: 'Ажлын хос',
    late: 'Өмнөх ажил хоцорсон',
    blocked: 'Дараагийн ажил саатсан',
    clash: 'Хугацаа давхцсан',
    ok: 'Хэвийн',
    done: 'Шийдэгдсэн',
    loops: 'Багц хоорондын тойрог',
    network: 'Хамаарлын сүлжээ',
    networkHint: 'Зүүнээс баруун тийш: эхлээд дуусах ёстой багц зүүн талд. Багц дээр дарж дэлгэрэнгүйг харна.',
    matrix: 'Хамаарлын матриц',
    matrixHint: 'Мөр — хүлээж буй багц, багана — хүлээгдэж буй багц. Нүдэнд ажлын хосын тоо.',
    waitsOn: 'Хүлээж буй',
    waitedBy: 'Түүнийг хүлээж буй',
    successor: 'Дараагийн ажил',
    predecessor: 'Өмнө дуусах ажил',
    source: 'Эх сурвалж',
    schedule: 'Хуваарь',
    interface: 'Интерфейсийн бүртгэл',
    register: 'Интерфейсийн бүртгэл',
    registerHint: 'Хуваарьт хараахан ороогүй, талуудын тохиролцсон багц хоорондын хамаарал.',
    add: 'Холбоос нэмэх',
    remove: 'Устгах',
    note: 'Үндэслэл',
    finish: 'Дуусах',
    start: 'Эхлэх',
    progress: 'Гүйцэтгэл',
    pick: 'Багц сонгоно уу',
    nothing: 'Багц хоорондын хамаарал алга',
    samePkg: 'Хоёр ажил өөр багцынх байх ёстой',
    duplicate: 'Ийм холбоос аль хэдийн бүртгэгдсэн',
    toSchedule: 'Хуваарь руу',
    all: 'Бүх холбоос',
    problems: 'Анхаарах',
    noIssue: 'Асуудалгүй',
    depth: 'Шат',
  },
  en: {
    lead: 'Where one package’s work waits for another package’s — from the schedule’s dependencies and the interface register. Late and blocked links are highlighted.',
    links: 'Package links',
    pairs: 'Activity pairs',
    late: 'Predecessor late',
    blocked: 'Successor blocked',
    clash: 'Dates overlap',
    ok: 'On track',
    done: 'Cleared',
    loops: 'Loops between packages',
    network: 'Dependency network',
    networkHint: 'Left to right: what must finish first is on the left. Tap a package for its detail.',
    matrix: 'Dependency matrix',
    matrixHint: 'Row — the package that waits; column — the package it waits on. Each cell counts activity pairs.',
    waitsOn: 'Waits on',
    waitedBy: 'Waited on by',
    successor: 'Successor',
    predecessor: 'Must finish first',
    source: 'Source',
    schedule: 'Schedule',
    interface: 'Interface register',
    register: 'Interface register',
    registerHint: 'Links between packages agreed by the parties that the schedule doesn’t carry yet.',
    add: 'Add a link',
    remove: 'Remove',
    note: 'Reason',
    finish: 'Finish',
    start: 'Start',
    progress: 'Progress',
    pick: 'Pick a package',
    nothing: 'No links between packages',
    samePkg: 'The two activities must be in different packages',
    duplicate: 'This link is already recorded',
    toSchedule: 'To the schedule',
    all: 'All links',
    problems: 'Needs attention',
    noIssue: 'No issues',
    depth: 'Step',
  },
};
type Words = (typeof W)['mn'];

function pairState(d: Data, act: Activity, dep: Activity, on: string): PairState {
  const depDone = activityProgress(d, dep.id).approved >= 100;
  const actDone = activityProgress(d, act.id).approved >= 100;
  if (depDone) return 'done';
  if (isOverdue(d, dep, on)) return 'late';
  if (!actDone && act.start <= on) return 'blocked';
  if (act.start < dep.finish) return 'clash';
  return 'ok';
}

export default function PackageDeps() {
  const t = useText();
  const w = useWords(W);
  const { data, ready, can, log, user } = useStore();
  const [register, setRegister, r1] = useExtra<InterfaceLink[]>('pkgDeps.interfaces', INTERFACES);
  const [sel, setSel] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState<'all' | 'problems'>('all');
  const now = today();

  const { links, pkgIds, depth, loops } = useMemo(() => {
    const byId = new Map(data.activities.map((a) => [a.id, a]));
    const pairs: Pair[] = [];
    for (const a of data.activities)
      for (const id of a.deps) {
        const dep = byId.get(id);
        if (dep && dep.pkg !== a.pkg) pairs.push({ act: a, dep, source: 'schedule', state: pairState(data, a, dep, now) });
      }
    for (const r of register) {
      const a = byId.get(r.act);
      const dep = byId.get(r.dep);
      if (a && dep && a.pkg !== dep.pkg) pairs.push({ act: a, dep, source: 'interface', ref: r, state: pairState(data, a, dep, now) });
    }
    const map = new Map<string, Link_>();
    for (const p of pairs) {
      const k = `${p.dep.pkg}>${p.act.pkg}`;
      const l = map.get(k) ?? { from: p.dep.pkg, to: p.act.pkg, pairs: [], state: 'ok' as PairState };
      l.pairs.push(p);
      map.set(k, l);
    }
    const links = [...map.values()].map((l) => ({ ...l, state: worst(l.pairs.map((p) => p.state)) }));
    const pkgIds = data.packages.map((p) => p.id);
    // depth = longest chain of predecessors, walked depth-first; an edge back into the chain being walked closes a
    // loop and is left out of the layout (it is still drawn, curving underneath)
    const depth: Record<string, number> = {};
    const walking = new Set<string>();
    const depthOf = (x: string): number => {
      if (depth[x] != null) return depth[x];
      walking.add(x);
      let d = 0;
      for (const l of links) if (l.to === x && l.from !== x && !walking.has(l.from)) d = Math.max(d, depthOf(l.from) + 1);
      walking.delete(x);
      return (depth[x] = d);
    };
    pkgIds.forEach(depthOf);
    // a loop: B can be reached from A and A from B
    const reach = (a: string, b: string) => {
      const seen = new Set<string>();
      const stack = [a];
      while (stack.length) {
        const x = stack.pop()!;
        for (const l of links) if (l.from === x && !seen.has(l.to)) (seen.add(l.to), stack.push(l.to));
      }
      return seen.has(b);
    };
    const loops = links.filter((l) => reach(l.to, l.from));
    return { links, pkgIds, depth, loops };
  }, [data, register, now]);

  if (!ready || !r1) return <Loading />;

  const allPairs = links.flatMap((l) => l.pairs);
  const count = (s: PairState) => allPairs.filter((p) => p.state === s).length;
  const pkgName = (id: string) => data.packages.find((p) => p.id === id)?.name ?? id;
  const shownLinks = links.filter((l) => filter === 'all' || ['late', 'blocked', 'clash'].includes(l.state)).sort((a, b) => RANK.indexOf(a.state) - RANK.indexOf(b.state));
  const openLink = link ? links.find((l) => `${l.from}>${l.to}` === link) : undefined;

  const removeIf = (r: InterfaceLink) => {
    if (!log('schedule.edit', r.id, `${r.dep} → ${r.act}: removed`)) return false;
    setRegister((xs) => xs.filter((x) => x.id !== r.id));
    return true;
  };

  return (
    <div className="space-y-6">
      <PageHead
        title={t.section.pkgDeps}
        lead={w.lead}
        action={can('schedule.edit') ? <Btn kind="primary" onClick={() => setAdding(true)}>+ {w.add}</Btn> : undefined}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Kpi label={w.links} value={links.length} sub={`${w.pairs}: ${allPairs.length}`} />
        <Kpi label={w.late} value={count('late')} tone={count('late') ? 'bad' : 'good'} />
        <Kpi label={w.blocked} value={count('blocked')} tone={count('blocked') ? 'bad' : 'good'} />
        <Kpi label={w.clash} value={count('clash')} tone={count('clash') ? 'warn' : 'good'} />
        <Kpi label={w.loops} value={loops.length} tone={loops.length ? 'warn' : 'good'} />
      </div>

      <Panel title={w.network}>
        <Network data={data} pkgIds={pkgIds} links={links} depth={depth} sel={sel} onPick={(id) => setSel(sel === id ? null : id)} onLink={setLink} words={w} />
        <p className="mt-2 text-[11px] text-mute">{w.networkHint}</p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-mute">
          {(['late', 'clash', 'ok', 'done'] as PairState[]).map((s) => (
            <span key={s} className="flex items-center gap-1.5">
              <span className="h-0.5 w-4" style={{ background: STROKE[s] }} />
              {s === 'late' ? `${w.late} / ${w.blocked}` : w[s]}
            </span>
          ))}
        </div>
      </Panel>

      {sel && <Focus id={sel} links={links} words={w} pkgName={pkgName} onLink={setLink} onClose={() => setSel(null)} />}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <Panel title={w.matrix}>
          <Matrix pkgIds={pkgIds} links={links} sel={sel} onLink={setLink} />
          <p className="mt-2 text-[11px] text-mute">{w.matrixHint}</p>
        </Panel>

        <Panel title={w.links} action={<Select label={t.filter.status} value={filter} onChange={setFilter} options={[['all', w.all], ['problems', w.problems]]} />}>
          <ul className="space-y-2">
            {shownLinks.map((l) => (
              <li key={`${l.from}>${l.to}`}>
                <button type="button" onClick={() => setLink(`${l.from}>${l.to}`)} className="flex min-h-10 w-full cursor-pointer flex-wrap items-center gap-2 rounded-lg border border-line/70 px-3 py-2 text-left text-sm hover:border-accent/50">
                  <span className="font-mono text-xs">
                    {l.to} <span className="text-mute">←</span> {l.from}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs text-mute">
                    {pkgName(l.to)} ← {pkgName(l.from)}
                  </span>
                  <Pill tone={TONE[l.state]}>{w[l.state]}</Pill>
                  <span className="font-mono text-[11px] text-mute">×{l.pairs.length}</span>
                </button>
              </li>
            ))}
            {!shownLinks.length && <p className="py-6 text-center text-sm text-mute">{links.length ? w.noIssue : w.nothing}</p>}
          </ul>
        </Panel>
      </div>

      <Panel title={w.register} action={<Link href="/construction/schedule" className="text-xs text-accent-hi hover:underline">{w.toSchedule} →</Link>}>
        <p className="mb-3 text-xs text-mute">{w.registerHint}</p>
        <Table head={['ID', w.successor, w.predecessor, w.note, t.common.status, '']} empty={!register.length}>
          {register.map((r) => {
            const p = allPairs.find((x) => x.ref?.id === r.id);
            return (
              <tr key={r.id} className="align-top">
                <td className="px-2 py-2 font-mono text-xs text-mute">{r.id}</td>
                <td className="px-2 py-2 text-xs">
                  <span className="font-mono">{r.act}</span> {p?.act.name}
                </td>
                <td className="px-2 py-2 text-xs">
                  <span className="font-mono">{r.dep}</span> {p?.dep.name}
                </td>
                <td className="max-w-[320px] px-2 py-2 text-xs text-mute">{r.note}</td>
                <td className="px-2 py-2">{p ? <Pill tone={TONE[p.state]}>{w[p.state]}</Pill> : <Pill>{t.common.unavailable}</Pill>}</td>
                <td className="px-2 py-2 text-right">
                  {can('schedule.edit') && (
                    <button type="button" onClick={() => removeIf(r)} className="min-h-10 cursor-pointer rounded px-2 text-xs text-red-300 hover:underline">
                      {w.remove}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </Table>
        {!can('schedule.edit') && (
          <div className="mt-3">
            <Forbidden />
          </div>
        )}
      </Panel>

      <Drawer open={!!openLink} onClose={() => setLink(null)} title={openLink ? `${openLink.to} ← ${openLink.from}` : ''}>
        {openLink && <LinkDetail l={openLink} words={w} pkgName={pkgName} />}
      </Drawer>

      <Drawer open={adding} onClose={() => setAdding(false)} title={w.add}>
        {adding && (
          <NewLink
            words={w}
            register={register}
            onCancel={() => setAdding(false)}
            onSave={(r) => {
              const id = nextId('IF', register.map((x) => x.id));
              if (!log('schedule.edit', id, `${r.dep} → ${r.act}`)) return false;
              setRegister((xs) => [...xs, { ...r, id, by: user, at: now }]);
              setAdding(false);
              return true;
            }}
          />
        )}
      </Drawer>
    </div>
  );
}

// the network: one column per depth, packages as boxes, links as curves coloured by state
function Network({ data, pkgIds, links, depth, sel, onPick, onLink, words: w }: { data: Data; pkgIds: string[]; links: Link_[]; depth: Record<string, number>; sel: string | null; onPick: (id: string) => void; onLink: (k: string) => void; words: Words }) {
  const cols = Math.max(...pkgIds.map((p) => depth[p] ?? 0)) + 1;
  const byCol = Array.from({ length: cols }, (_, c) => pkgIds.filter((p) => depth[p] === c));
  const rows = Math.max(1, ...byCol.map((c) => c.length));
  const BW = 150;
  const BH = 56;
  const GX = 90;
  const GY = 28;
  const Wd = cols * BW + (cols - 1) * GX + 40;
  const Ht = rows * BH + (rows - 1) * GY + 60;
  const pos: Record<string, { x: number; y: number }> = {};
  byCol.forEach((col, c) => {
    const off = ((rows - col.length) * (BH + GY)) / 2;
    col.forEach((p, r) => (pos[p] = { x: 20 + c * (BW + GX), y: 36 + off + r * (BH + GY) }));
  });
  const related = (l: Link_) => !sel || l.from === sel || l.to === sel;
  return (
    // wide networks scroll sideways on a phone rather than shrinking past reading size
    <div className="-mx-1 overflow-x-auto" data-lenis-prevent>
      <svg viewBox={`0 0 ${Wd} ${Ht}`} className="w-full" style={{ minWidth: Math.min(Wd, 640) }} role="img" aria-label={w.network}>
        <defs>
          {Object.entries(STROKE).map(([k, c]) => (
            <marker key={k} id={`pd-arrow-${k}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0 0L10 5L0 10z" fill={c} />
            </marker>
          ))}
        </defs>
        {Array.from({ length: cols }, (_, c) => (
          <text key={c} x={20 + c * (BW + GX) + BW / 2} y={18} textAnchor="middle" fontSize="10" fill="var(--color-mute)">
            {w.depth} {c + 1}
          </text>
        ))}
        {links.map((l) => {
          const a = pos[l.from];
          const b = pos[l.to];
          if (!a || !b) return null;
          const back = b.x <= a.x; // a loop or same-column link: curve around below
          const x1 = a.x + BW;
          const y1 = a.y + BH / 2;
          const x2 = b.x;
          const y2 = b.y + BH / 2;
          const d = back ? `M${a.x + BW / 2} ${a.y + BH} C${a.x + BW / 2} ${Ht - 4}, ${b.x + BW / 2} ${Ht - 4}, ${b.x + BW / 2} ${b.y + BH}` : `M${x1} ${y1} C${x1 + GX / 2} ${y1}, ${x2 - GX / 2} ${y2}, ${x2} ${y2}`;
          const k = `${l.from}>${l.to}`;
          return (
            <g key={k} className="cursor-pointer" onClick={() => onLink(k)} opacity={related(l) ? 1 : 0.18}>
              <path d={d} fill="none" stroke="transparent" strokeWidth={16} />
              <path d={d} fill="none" stroke={STROKE[l.state]} strokeWidth={l.state === 'late' || l.state === 'blocked' ? 2.6 : 1.8} strokeDasharray={l.state === 'clash' ? '5 4' : undefined} markerEnd={`url(#pd-arrow-${l.state})`} />
              <title>{`${l.to} ← ${l.from}: ${w[l.state]} (${l.pairs.length})`}</title>
            </g>
          );
        })}
        {pkgIds.map((id) => {
          const p = pos[id];
          const pk = data.packages.find((x) => x.id === id)!;
          const on = sel === id;
          return (
            <g key={id} className="cursor-pointer" onClick={() => onPick(id)} role="button" aria-pressed={on} aria-label={`${id} ${pk.name}`}>
              <rect x={p.x} y={p.y} width={BW} height={BH} rx={10} fill="var(--color-ink)" stroke={on ? 'var(--color-accent)' : 'var(--color-line)'} strokeWidth={on ? 2 : 1} />
              <rect x={p.x} y={p.y + 10} width={3} height={BH - 20} rx={1.5} fill={PKG_COLOR[pk.status]} />
              <text x={p.x + 12} y={p.y + 22} fontSize="12" fill="var(--color-fg)" className="font-mono">
                {id}
              </text>
              <text x={p.x + 12} y={p.y + 40} fontSize="10" fill="var(--color-mute)">
                {pk.name.length > 22 ? pk.name.slice(0, 21) + '…' : pk.name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function Matrix({ pkgIds, links, sel, onLink }: { pkgIds: string[]; links: Link_[]; sel: string | null; onLink: (k: string) => void }) {
  const cell: Record<Tone, string> = { bad: 'bg-red-400/20 text-red-200', warn: 'bg-sky-400/15 text-sky-200', info: 'bg-accent/15 text-accent-hi', good: 'bg-emerald-400/15 text-emerald-200', neutral: '' };
  return (
    <div className="-mx-1 overflow-x-auto">
      <table className="w-full min-w-[420px] border-collapse text-xs">
        <thead>
          <tr>
            <th scope="col" className="p-1.5 text-left font-normal text-mute">↓ ← →</th>
            {pkgIds.map((c) => (
              <th key={c} scope="col" className={`p-1.5 text-center font-mono font-normal ${sel === c ? 'text-accent-hi' : 'text-mute'}`}>
                {c.replace('PKG-', 'P')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pkgIds.map((r) => (
            <tr key={r} className="border-t border-line/60">
              <th scope="row" className={`p-1.5 text-left font-mono font-normal ${sel === r ? 'text-accent-hi' : 'text-mute'}`}>
                {r}
              </th>
              {pkgIds.map((c) => {
                const l = links.find((x) => x.to === r && x.from === c);
                return (
                  <td key={c} className="p-1 text-center">
                    {r === c ? (
                      <span className="block h-10 rounded bg-line/30" />
                    ) : l ? (
                      <button type="button" onClick={() => onLink(`${l.from}>${l.to}`)} className={`h-10 w-full min-w-10 cursor-pointer rounded font-mono ${cell[TONE[l.state]]}`}>
                        {l.pairs.length}
                      </button>
                    ) : (
                      <span className="block h-10 leading-10 text-line">·</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// a picked package: what it waits on, and what waits on it
function Focus({ id, links, words: w, pkgName, onLink, onClose }: { id: string; links: Link_[]; words: Words; pkgName: (id: string) => string; onLink: (k: string) => void; onClose: () => void }) {
  const t = useText();
  const on = links.filter((l) => l.to === id);
  const by = links.filter((l) => l.from === id);
  const list = (xs: Link_[], other: (l: Link_) => string) =>
    xs.length ? (
      <ul className="space-y-1.5">
        {xs.map((l) => (
          <li key={`${l.from}>${l.to}`}>
            <button type="button" onClick={() => onLink(`${l.from}>${l.to}`)} className="flex min-h-10 w-full cursor-pointer items-center gap-2 rounded-lg border border-line/70 px-3 text-left text-xs hover:border-accent/50">
              <span className="font-mono">{other(l)}</span>
              <span className="min-w-0 flex-1 truncate text-mute">{pkgName(other(l))}</span>
              <Pill tone={TONE[l.state]}>{w[l.state]}</Pill>
            </button>
          </li>
        ))}
      </ul>
    ) : (
      <p className="text-xs text-mute">{t.common.none}</p>
    );
  return (
    <Panel
      title={
        <>
          <span className="font-mono">{id}</span> · {pkgName(id)}
        </>
      }
      action={
        <button type="button" onClick={onClose} aria-label={t.common.close} className="min-h-10 cursor-pointer rounded px-3 text-mute hover:text-fg">
          ✕
        </button>
      }
    >
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          <p className="mb-2 text-xs text-mute">{w.waitsOn}</p>
          {list(on, (l) => l.from)}
        </div>
        <div>
          <p className="mb-2 text-xs text-mute">{w.waitedBy}</p>
          {list(by, (l) => l.to)}
        </div>
      </div>
    </Panel>
  );
}

function LinkDetail({ l, words: w, pkgName }: { l: Link_; words: Words; pkgName: (id: string) => string }) {
  const { data } = useStore();
  const row = (a: Activity, label: string) => (
    <div className="rounded-lg border border-line/70 px-3 py-2">
      <p className="text-[11px] text-mute">{label}</p>
      <p className="text-sm">
        <span className="font-mono text-xs text-mute">{a.id}</span> {a.name}
      </p>
      <p className="mt-0.5 font-mono text-[11px] text-mute">
        {a.start} → {a.finish} · {w.progress} {pct(activityProgress(data, a.id).approved)}
      </p>
    </div>
  );
  return (
    <div className="space-y-5 text-sm">
      <p className="text-xs text-mute">
        <span className="font-mono text-fg/90">{l.to}</span> {pkgName(l.to)} ← <span className="font-mono text-fg/90">{l.from}</span> {pkgName(l.from)}
      </p>
      <Pill tone={TONE[l.state]}>{w[l.state]}</Pill>
      <ul className="space-y-4">
        {l.pairs.map((p, i) => (
          <li key={i} className="space-y-2 border-b border-line/60 pb-4">
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone={TONE[p.state]}>{w[p.state]}</Pill>
              <span className="text-[11px] text-mute">
                {w.source}: {p.source === 'schedule' ? w.schedule : `${w.interface} ${p.ref?.id ?? ''}`}
              </span>
            </div>
            {row(p.dep, w.predecessor)}
            <p className="text-center text-mute">↓</p>
            {row(p.act, w.successor)}
            {p.ref?.note && <p className="text-xs text-mute">“{p.ref.note}”</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function NewLink({ words: w, register, onSave, onCancel }: { words: Words; register: InterfaceLink[]; onSave: (r: Omit<InterfaceLink, 'id' | 'by' | 'at'>) => boolean; onCancel: () => void }) {
  const t = useText();
  const { data } = useStore();
  const acts = data.activities;
  const [f, setF] = useState({ act: acts.find((a) => a.pkg === 'PKG-04')?.id ?? acts[0]?.id ?? '', dep: acts[0]?.id ?? '', note: '' });
  const [problems, setProblems] = useState<Problem[]>([]);
  const [msg, setMsg] = useState('');
  const opts = acts.map((a) => [a.id, `${a.id} · ${a.name}`] as [string, string]);
  // successor-side predecessors, from the schedule and the register together
  const preds = (id: string) => [...(acts.find((x) => x.id === id)?.deps ?? []), ...register.filter((r) => r.act === id).map((r) => r.dep)];
  const save = () => {
    const a = acts.find((x) => x.id === f.act);
    const d = acts.find((x) => x.id === f.dep);
    const p: Problem[] = [];
    let m = '';
    if (!a || !d) p.push({ field: 'act', code: 'depMissing' });
    else if (a.pkg === d.pkg) m = w.samePkg;
    else if (preds(a.id).includes(d.id)) m = w.duplicate;
    else {
      // refuse a link that would close a loop between activities: walk back from the predecessor through what it waits on
      const seen = new Set<string>();
      const stack = [d.id];
      while (stack.length) {
        const x = stack.pop()!;
        if (x === a.id) {
          p.push({ field: 'dep', code: 'cycle' });
          break;
        }
        for (const y of preds(x)) if (!seen.has(y)) (seen.add(y), stack.push(y));
      }
    }
    if (!f.note.trim()) p.push({ field: 'note', code: 'required' });
    setProblems(p);
    setMsg(m);
    if (p.length || m) return;
    if (!onSave({ act: f.act, dep: f.dep, note: f.note.trim() })) setProblems([{ field: 'role', code: 'forbidden' }]);
  };
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <Select label={w.predecessor} value={f.dep} onChange={(v) => setF({ ...f, dep: v })} options={opts} />
      <Select label={w.successor} value={f.act} onChange={(v) => setF({ ...f, act: v })} options={opts} />
      <Field label={w.note} error={problems.some((p) => p.field === 'note') ? t.problem.required : undefined}>
        <textarea className={`${inputCls} h-20 py-1.5`} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
      </Field>
      {msg && <p className="rounded-lg border border-red-400/40 bg-red-400/[0.07] px-3 py-2 text-xs text-red-200">• {msg}</p>}
      <Problems list={problems.filter((p) => p.field !== 'note')} />
      <div className="flex gap-2">
        <Btn kind="primary" type="submit">
          {t.common.save}
        </Btn>
        <Btn onClick={onCancel}>{t.common.cancel}</Btn>
      </div>
    </form>
  );
}
