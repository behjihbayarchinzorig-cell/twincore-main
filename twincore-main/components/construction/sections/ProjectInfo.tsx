'use client';

import { useMemo, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { activityProgress, days, isOverdue, latestBaseline, money, packageProgress, pct, projectProgress, today, tug } from '@/lib/construction/calc';
import { MILESTONES, PASSPORTS, STAKES, type Passport } from '@/lib/construction/extra/project';
import { useEn, useText, useWords } from '@/lib/construction/text';
import type { OrgKind, Package } from '@/lib/construction/types';
import type { Problem } from '@/lib/construction/validate';
import { Bar, Btn, Drawer, Field, Forbidden, History, inputCls, Kpi, Loading, PageHead, Panel, Pill, Problems, Select, Table, toneOf } from '../Kit';
import { useExtra } from '../extra';
import { useStore } from '../Store';
import WorkspaceMap, { type Pick } from '../WorkspaceMap';

// Төслийн паспорт: everything a newcomer needs on one page — what is being built and why, where, by whom, for how
// much, by when, and how far along it is. Figures come from the shared records (budget, contracts, invoices, approved
// progress, schedule); the descriptive part (purpose, outputs, funding source) is the page's own passport, editable
// by planners. Key milestones are tied to activities, so their dates and state always follow the schedule.

const W = {
  mn: {
    lead: 'Төслийн зорилго, байршил, оролцогч талууд, төсөв, гүйцэтгэл, хугацаа ба багцууд нэг дор.',
    passport: 'Төслийн паспорт',
    name: 'Төслийн нэр',
    location: 'Байршил',
    area: 'Талбайн хэмжээ',
    ha: 'га',
    client: 'Захиалагч',
    supervisor: 'Техникийн хяналт',
    authority: 'Төрийн хяналт',
    contractors: 'Гүйцэтгэгчид',
    designer: 'Зураг төсөл',
    funding: 'Санхүүжилтийн эх үүсвэр',
    purpose: 'Зорилго',
    outputs: 'Гол үр дүн',
    editPassport: 'Паспорт засах',
    budget: 'Батлагдсан төсөв',
    committed: 'Гэрээгээр',
    paid: 'Төлөгдсөн',
    paidSub: (a: string) => `Төлөвлөсөн: ${a}`,
    progress: 'Батлагдсан гүйцэтгэл',
    progressSub: (p: number) => `Төлөвлөсөн ${Math.round(p)}%`,
    span: 'Хугацаа',
    spanSub: (d: number) => `${d} хоног`,
    pkgs: 'Багц (явагдаж буй / нийт)',
    time: 'Хугацааны явц',
    start: 'Эхэлсэн',
    finishNow: 'Дуусах (одоогийн)',
    finishBl: 'Дуусах (суурь)',
    slip: 'Зөрүү',
    elapsed: 'Өнгөрсөн хугацаа',
    built: 'Гүйцэтгэл',
    milestones: 'Гол үе шат',
    milestone: 'Үе шат',
    activity: 'Ажил',
    blFinish: 'Суурь огноо',
    forecast: 'Төлөвтэй огноо',
    done: 'Хийгдсэн',
    soon: 'Ойрын 60 хоногт',
    planned: 'Төлөвлөсөн',
    packages: 'Багцууд',
    contractor: 'Гүйцэтгэгч',
    notAwarded: 'Шалгаруулаагүй',
    stakeholders: 'Оролцогч талууд',
    responsibility: 'Үүрэг',
    contact: 'Холбоо барих',
    people: 'хэрэглэгч',
    holds: 'Багц',
    map: 'Байршил ба багцын талбай',
    noFinance: 'Санхүүгийн дүн таны дүрд харагдахгүй',
    contract: 'Гэрээ',
    toSchedule: 'Хуваарь руу',
    toFinance: 'Санхүү рүү',
    toProgress: 'Гүйцэтгэл рүү',
    history: 'Паспортын өөрчлөлт',
    later: 'хойш',
    ahead: 'урагш',
    kind: { client: 'Захиалагч', contractor: 'Гүйцэтгэгч', consultant: 'Зөвлөх, хяналт', authority: 'Төрийн байгууллага', utility: 'Шугам сүлжээ' } as Record<OrgKind, string>,
    outputsHint: 'Мөр бүрт «нэр: утга»',
  },
  en: {
    lead: 'The project’s purpose, location, parties, budget, progress, dates and work packages in one place.',
    passport: 'Project passport',
    name: 'Project',
    location: 'Location',
    area: 'Site area',
    ha: 'ha',
    client: 'Client',
    supervisor: 'Technical supervision',
    authority: 'State inspection',
    contractors: 'Contractors',
    designer: 'Design',
    funding: 'Funding source',
    purpose: 'Purpose',
    outputs: 'Key outputs',
    editPassport: 'Edit passport',
    budget: 'Approved budget',
    committed: 'Under contract',
    paid: 'Paid',
    paidSub: (a: string) => `Planned: ${a}`,
    progress: 'Approved progress',
    progressSub: (p: number) => `Planned ${Math.round(p)}%`,
    span: 'Duration',
    spanSub: (d: number) => `${d} days`,
    pkgs: 'Packages (in progress / total)',
    time: 'Time elapsed',
    start: 'Started',
    finishNow: 'Finish (current)',
    finishBl: 'Finish (baseline)',
    slip: 'Variance',
    elapsed: 'Time elapsed',
    built: 'Work done',
    milestones: 'Key milestones',
    milestone: 'Milestone',
    activity: 'Activity',
    blFinish: 'Baseline',
    forecast: 'Forecast',
    done: 'Done',
    soon: 'Within 60 days',
    planned: 'Planned',
    packages: 'Work packages',
    contractor: 'Contractor',
    notAwarded: 'Not awarded',
    stakeholders: 'Stakeholders',
    responsibility: 'Role',
    contact: 'Contact',
    people: 'users',
    holds: 'Packages',
    map: 'Location and package footprints',
    noFinance: 'Financial figures are not shown to your role',
    contract: 'Contract',
    toSchedule: 'To the schedule',
    toFinance: 'To finance',
    toProgress: 'To progress',
    history: 'Passport changes',
    later: 'later',
    ahead: 'earlier',
    kind: { client: 'Client', contractor: 'Contractor', consultant: 'Consultant, supervision', authority: 'Authority', utility: 'Utility' } as Record<OrgKind, string>,
    outputsHint: 'One per line, “name: value”',
  },
};

const min = (xs: string[]) => xs.reduce((m, d) => (d < m ? d : m), '9999-12-31');
const max = (xs: string[]) => xs.reduce((m, d) => (d > m ? d : m), '0000-01-01');

export default function ProjectInfo() {
  const t = useText();
  const w = useWords(W);
  const en = useEn();
  const { data, ready, can, log } = useStore();
  const [passports, setPassports, extraReady] = useExtra<Passport[]>('project.passport', PASSPORTS);
  const [projectId, setProjectId] = useState(data.projects[0]?.id ?? 'P-1');
  const [openPkg, setOpenPkg] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const now = today();

  const project = data.projects.find((p) => p.id === projectId) ?? data.projects[0];
  const pkgList = useMemo(() => data.packages.filter((p) => p.project === project?.id), [data.packages, project?.id]);
  const pkgs = useMemo(() => pkgList.map((p) => p.id), [pkgList]);
  const passport = passports.find((p) => p.project === project?.id);

  if (!ready || !extraReady) return <Loading />;
  if (!project) return <PageHead title={t.section.project} lead={t.common.none} />;

  const prog = projectProgress(data, pkgs, now);
  const m = money(data, pkgs);
  const fin = can('finance.view');
  const acts = data.activities.filter((a) => pkgs.includes(a.pkg));
  const bl = latestBaseline(data);
  // the project's span: first start to last finish, current schedule and approved baseline side by side
  const start = acts.length ? min(acts.map((a) => a.start)) : null;
  const finish = acts.length ? max(acts.map((a) => a.finish)) : null;
  const blDates = acts.map((a) => bl?.dates[a.id]).filter((x): x is { start: string; finish: string } => !!x);
  const blFinish = blDates.length ? max(blDates.map((b) => b.finish)) : null;
  const slip = finish && blFinish ? days(blFinish, finish) : null;
  const total = start && finish ? days(start, finish) : 0;
  const elapsed = start && total ? Math.max(0, Math.min(100, (days(start, now) / total) * 100)) : 0;

  const orgName = (id: string | null) => (id ? (data.orgs.find((o) => o.id === id)?.name ?? id) : w.notAwarded);
  const userName = (id: string) => data.users.find((u) => u.id === id)?.name ?? data.orgs.find((o) => o.id === id)?.name ?? id;
  const byKind = (k: OrgKind) => data.orgs.filter((o) => o.kind === k);
  const contractors = [...new Set(pkgList.map((p) => p.contractor).filter((c): c is string => !!c))];

  const milestones = MILESTONES.map((k) => ({ k, a: data.activities.find((a) => a.id === k.activity) }))
    .filter((x): x is { k: (typeof MILESTONES)[number]; a: NonNullable<typeof x.a> } => !!x.a && pkgs.includes(x.a.pkg))
    .map(({ k, a }) => {
      const done = activityProgress(data, a.id).approved >= 100;
      const base = bl?.dates[a.id]?.finish ?? null;
      const state: 'done' | 'overdue' | 'soon' | 'planned' = done ? 'done' : isOverdue(data, a, now) ? 'overdue' : a.finish >= now && days(now, a.finish) <= 60 ? 'soon' : 'planned';
      return { k, a, base, v: base ? days(base, a.finish) : null, state };
    })
    .sort((x, y) => x.a.finish.localeCompare(y.a.finish));

  const audit = data.audit.filter((x) => x.entity === project.id).map((x) => ({ at: x.at, by: x.by, action: x.detail }));
  const pkg = openPkg ? data.packages.find((p) => p.id === openPkg) : undefined;

  const row = (k: string, v: React.ReactNode) => (
    <div key={k} className="grid grid-cols-1 gap-0.5 border-b border-line/50 py-2 sm:grid-cols-[10rem_1fr] sm:gap-3">
      <dt className="text-xs text-mute">{k}</dt>
      <dd className="text-sm text-fg/90">{v}</dd>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHead
        title={t.section.project}
        lead={w.lead}
        action={<Select label={t.filter.project} value={project.id} onChange={setProjectId} options={data.projects.map((p) => [p.id, p.name] as [string, string])} />}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label={w.budget} value={tug(m.budget, en)} sub={fin ? `${w.committed}: ${tug(m.hasContract ? m.committed : null, en)}` : undefined} href="/construction/finance" />
        <Kpi label={w.paid} value={fin ? tug(m.paid, en) : '🔒'} sub={fin ? w.paidSub(tug(m.plannedToDate, en)) : w.noFinance} href="/construction/finance" />
        <Kpi label={w.progress} value={pct(prog.approved)} sub={w.progressSub(prog.planned)} tone={prog.approved < prog.planned - 5 ? 'warn' : 'neutral'} href="/construction/progress" />
        <Kpi label={w.span} value={start && finish ? `${start.slice(0, 7)} → ${finish.slice(0, 7)}` : '—'} sub={w.spanSub(total)} />
        <Kpi
          label={w.slip}
          value={slip == null ? '—' : `${slip > 0 ? '+' : ''}${slip}`}
          sub={slip == null ? t.common.unavailable : `${t.common.days} ${slip > 0 ? w.later : slip < 0 ? w.ahead : ''}`}
          tone={slip == null ? 'neutral' : slip > 30 ? 'bad' : slip > 0 ? 'warn' : 'good'}
          href="/construction/schedule"
        />
        <Kpi label={w.pkgs} value={`${pkgList.filter((p) => p.status === 'active').length} / ${pkgList.length}`} sub={`${t.pkgStatus.done}: ${pkgList.filter((p) => p.status === 'done').length}`} href="/construction/pkgProgress" />
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Panel title={w.passport} action={can('plan.edit') ? <Btn onClick={() => setEditing(true)}>{w.editPassport}</Btn> : undefined}>
          <dl>
            {row(w.name, <span className="font-medium">{project.name}</span>)}
            {row(w.location, project.area)}
            {passport && row(w.area, `${passport.area.toLocaleString('en-US')} ${w.ha}`)}
            {row(w.client, byKind('client').map((o) => o.name).join(', ') || '—')}
            {row(w.supervisor, byKind('consultant').map((o) => o.name).join(', ') || '—')}
            {row(w.authority, byKind('authority').map((o) => o.name).join(', ') || '—')}
            {row(
              w.contractors,
              <ul className="space-y-0.5">
                {contractors.map((c) => (
                  <li key={c}>
                    {orgName(c)} <span className="font-mono text-xs text-mute">· {pkgList.filter((p) => p.contractor === c).map((p) => p.id).join(', ')}</span>
                  </li>
                ))}
                {pkgList.some((p) => !p.contractor) && (
                  <li className="text-mute">
                    {w.notAwarded}: <span className="font-mono text-xs">{pkgList.filter((p) => !p.contractor).map((p) => p.id).join(', ')}</span>
                  </li>
                )}
              </ul>,
            )}
            {passport && row(w.designer, passport.designer)}
            {passport && row(w.funding, passport.funding)}
            {passport && row(w.purpose, passport.purpose)}
          </dl>
          {passport && passport.outputs.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs text-mute">{w.outputs}</p>
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {passport.outputs.map((o) => (
                  <li key={o.label} className="rounded-lg border border-line/70 px-3 py-2">
                    <p className="text-[11px] text-mute">{o.label}</p>
                    <p className="font-mono text-sm tabular-nums">{o.value}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Panel>

        <div className="space-y-6">
          <Panel title={w.time}>
            <dl className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
              {row(w.start, <span className="font-mono">{start ?? '—'}</span>)}
              {row(w.finishNow, <span className="font-mono">{finish ?? '—'}</span>)}
              {row(w.finishBl, <span className="font-mono">{blFinish ?? t.common.unavailable}</span>)}
              {row(
                w.slip,
                slip == null ? '—' : (
                  <Pill tone={slip > 0 ? 'warn' : 'good'}>
                    {slip > 0 ? '+' : ''}
                    {slip} {t.common.days}
                  </Pill>
                ),
              )}
            </dl>
            {/* time used against work done: progress well below the share of time gone is an early warning */}
            <div className="mt-4 space-y-3 text-xs">
              <div>
                <div className="mb-1 flex justify-between text-mute">
                  <span>{w.elapsed}</span>
                  <span className="font-mono tabular-nums">{pct(elapsed)}</span>
                </div>
                <Bar value={elapsed} tone="neutral" label={w.elapsed} />
              </div>
              <div>
                <div className="mb-1 flex justify-between text-mute">
                  <span>{w.built}</span>
                  <span className="font-mono tabular-nums">{pct(prog.approved)}</span>
                </div>
                <Bar value={prog.approved} planned={prog.planned} tone={prog.approved < prog.planned - 5 ? 'warn' : 'info'} label={w.built} />
              </div>
            </div>
          </Panel>
          <Panel title={w.map}>
            <WorkspaceMap data={data} layers={['packages', 'parcels', 'assets']} initial={['packages']} only={{ pkgs }} selected={openPkg} onPick={(p: Pick) => p.kind === 'package' && setOpenPkg(p.id)} height="h-[280px]" />
          </Panel>
        </div>
      </div>

      <Panel title={w.packages}>
        <Table head={[t.common.package, w.contractor, w.budget, w.committed, w.paid, w.progress, t.common.status]} empty={!pkgList.length}>
          {pkgList.map((p) => {
            const v = packageProgress(data, p.id, now);
            const pm = money(data, [p.id]);
            return (
              <tr key={p.id} className="cursor-pointer hover:bg-surface/60" onClick={() => setOpenPkg(p.id)}>
                <td className="px-2 py-2">
                  <button type="button" className="min-h-10 cursor-pointer text-left underline-offset-2 hover:underline" onClick={() => setOpenPkg(p.id)}>
                    <span className="font-mono text-xs text-mute">{p.id}</span> {p.name}
                  </button>
                </td>
                <td className="px-2 py-2 text-xs">{orgName(p.contractor)}</td>
                <td className="px-2 py-2 font-mono text-xs tabular-nums">{tug(p.budget, en)}</td>
                <td className="px-2 py-2 font-mono text-xs tabular-nums">{fin ? tug(pm.hasContract ? pm.committed : null, en) : '🔒'}</td>
                <td className="px-2 py-2 font-mono text-xs tabular-nums">{fin ? tug(pm.hasContract ? pm.paid : null, en) : '🔒'}</td>
                <td className="w-40 px-2 py-2">
                  <div className="mb-1 font-mono text-xs tabular-nums">
                    {pct(v.approved)} <span className="text-mute">/ {pct(v.planned)}</span>
                  </div>
                  <Bar value={v.approved} planned={v.planned} tone={v.approved < v.planned - 5 ? 'warn' : 'info'} label={p.id} />
                </td>
                <td className="px-2 py-2">
                  <Pill tone={toneOf(p.status)}>{t.pkgStatus[p.status]}</Pill>
                </td>
              </tr>
            );
          })}
        </Table>
        {!fin && <p className="mt-3 text-[11px] text-mute">🔒 {w.noFinance}</p>}
      </Panel>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Panel title={w.milestones} action={<Link href="/construction/schedule" className="text-xs text-accent-hi hover:underline">{w.toSchedule} →</Link>}>
          <Table head={[w.milestone, t.common.package, w.blFinish, w.forecast, w.slip, t.common.status]} empty={!milestones.length}>
            {milestones.map(({ k, a, base, v, state }) => (
              <tr key={k.id} className={state === 'overdue' ? 'bg-red-500/[0.04]' : ''}>
                <td className="px-2 py-2">
                  {k.name}
                  <p className="text-[11px] text-mute">
                    <span className="font-mono">{a.id}</span> · {a.name}
                  </p>
                </td>
                <td className="px-2 py-2 font-mono text-xs text-mute">{a.pkg}</td>
                <td className="px-2 py-2 font-mono text-xs tabular-nums text-mute">{base ?? '—'}</td>
                <td className="px-2 py-2 font-mono text-xs tabular-nums">{a.finish}</td>
                <td className={`px-2 py-2 font-mono text-xs tabular-nums ${(v ?? 0) > 0 ? 'text-amber-700' : 'text-mute'}`}>{v == null ? '—' : `${v > 0 ? '+' : ''}${v}`}</td>
                <td className="px-2 py-2">
                  <Pill tone={state === 'done' ? 'good' : state === 'overdue' ? 'bad' : state === 'soon' ? 'warn' : 'neutral'}>{state === 'overdue' ? t.common.overdue : w[state]}</Pill>
                </td>
              </tr>
            ))}
          </Table>
        </Panel>

        <Panel title={w.stakeholders}>
          <ul className="space-y-3">
            {data.orgs.map((o) => {
              const s = STAKES.find((x) => x.org === o.id);
              const held = pkgList.filter((p) => p.contractor === o.id).map((p) => p.id);
              const people = data.users.filter((u) => u.org === o.id && u.projects.includes(project.id)).length;
              return (
                <li key={o.id} className="rounded-lg border border-line/70 px-3 py-2.5 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm text-fg/90">{o.name}</span>
                    <Pill tone={o.kind === 'client' ? 'info' : 'neutral'}>{w.kind[o.kind]}</Pill>
                  </div>
                  {s && <p className="mt-1 text-mute">{s.role}</p>}
                  <p className="mt-1 text-mute">
                    {held.length > 0 && (
                      <>
                        {w.holds}: <span className="font-mono text-fg/80">{held.join(', ')}</span> ·{' '}
                      </>
                    )}
                    {s && (
                      <>
                        {w.contact}: {s.contact} ·{' '}
                      </>
                    )}
                    {people} {w.people}
                  </p>
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>

      {audit.length > 0 && (
        <Panel title={w.history}>
          <History items={audit} name={userName} />
        </Panel>
      )}

      <Drawer open={!!pkg} onClose={() => setOpenPkg(null)} title={pkg ? `${pkg.id} · ${pkg.name}` : ''}>
        {pkg && <PackageCard pkg={pkg} words={w} />}
      </Drawer>

      <Drawer open={editing} onClose={() => setEditing(false)} title={w.editPassport}>
        {editing && (
          <PassportForm
            initial={passport ?? { project: project.id, purpose: '', area: 0, funding: '', designer: '', outputs: [] }}
            words={w}
            onCancel={() => setEditing(false)}
            onSave={(p, changed) => {
              // the passport is the page's own record: check the role and write the audit line, then keep it
              if (!log('plan.edit', project.id, changed)) return false;
              setPassports((xs) => [...xs.filter((x) => x.project !== p.project), p]);
              setEditing(false);
              return true;
            }}
          />
        )}
      </Drawer>
    </div>
  );
}

// one package at a glance, with the way to its own pages
function PackageCard({ pkg, words: w }: { pkg: Package; words: (typeof W)['mn'] }) {
  const t = useText();
  const en = useEn();
  const { data, can } = useStore();
  const v = packageProgress(data, pkg.id);
  const pm = money(data, [pkg.id]);
  const contract = data.contracts.find((c) => c.pkg === pkg.id);
  const acts = data.activities.filter((a) => a.pkg === pkg.id);
  const fin = can('finance.view');
  return (
    <div className="space-y-5 text-sm">
      <div className="flex flex-wrap gap-1.5">
        <Pill tone={toneOf(pkg.status)}>{t.pkgStatus[pkg.status]}</Pill>
        {acts.some((a) => isOverdue(data, a)) && <Pill tone="bad">{t.common.overdue}</Pill>}
      </div>
      <dl className="space-y-1.5 text-xs">
        {(
          [
            [w.contractor, pkg.contractor ? (data.orgs.find((o) => o.id === pkg.contractor)?.name ?? pkg.contractor) : w.notAwarded],
            [w.contract, contract ? `${contract.id} · ${contract.title} (${contract.signed})` : '—'],
            [w.budget, tug(pkg.budget, en)],
            [w.committed, fin ? tug(pm.hasContract ? pm.committed : null, en) : '🔒'],
            [w.paid, fin ? tug(pm.hasContract ? pm.paid : null, en) : '🔒'],
            [w.progress, `${pct(v.approved)} / ${pct(v.planned)}`],
          ] as [string, string][]
        ).map(([k, val]) => (
          <div key={k} className="grid grid-cols-[8rem_1fr] gap-3 border-b border-line/50 pb-1.5">
            <dt className="text-mute">{k}</dt>
            <dd className="text-fg/90">{val}</dd>
          </div>
        ))}
      </dl>
      <div>
        <p className="mb-2 text-xs text-mute">{w.activity}</p>
        <ul className="space-y-2.5">
          {acts.map((a) => {
            const ap = activityProgress(data, a.id).approved;
            return (
              <li key={a.id} className="text-xs">
                <div className="mb-1 flex justify-between gap-2">
                  <span>
                    <span className="font-mono text-mute">{a.id}</span> {a.name}
                  </span>
                  <span className="shrink-0 font-mono tabular-nums">{pct(ap)}</span>
                </div>
                <Bar value={ap} tone={isOverdue(data, a) ? 'bad' : ap >= 100 ? 'good' : 'info'} label={a.name} />
                <p className="mt-0.5 font-mono text-[10px] text-mute">
                  {a.start} → {a.finish}
                </p>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="flex flex-wrap gap-3 text-sm">
        <Link href="/construction/schedule" className="inline-flex min-h-10 items-center text-accent-hi hover:underline">
          {w.toSchedule} →
        </Link>
        <Link href="/construction/progress" className="inline-flex min-h-10 items-center text-accent-hi hover:underline">
          {w.toProgress} →
        </Link>
        {fin && (
          <Link href="/construction/finance" className="inline-flex min-h-10 items-center text-accent-hi hover:underline">
            {w.toFinance} →
          </Link>
        )}
        {pkg.twin && (
          <Link href={pkg.twin} className="inline-flex min-h-10 items-center text-accent-hi hover:underline">
            {t.common.inTwin} →
          </Link>
        )}
      </div>
    </div>
  );
}

function PassportForm({ initial, words: w, onSave, onCancel }: { initial: Passport; words: (typeof W)['mn']; onSave: (p: Passport, changed: string) => boolean; onCancel: () => void }) {
  const t = useText();
  const [f, setF] = useState({ ...initial, outputsText: initial.outputs.map((o) => `${o.label}: ${o.value}`).join('\n') });
  const [problems, setProblems] = useState<Problem[]>([]);
  const save = () => {
    const p: Problem[] = [];
    if (!f.purpose.trim()) p.push({ field: 'purpose', code: 'required' });
    if (!(f.area > 0)) p.push({ field: 'area', code: 'range' });
    setProblems(p);
    if (p.length) return;
    const outputs = f.outputsText
      .split('\n')
      .map((l) => l.split(':'))
      .filter((x) => x[0].trim())
      .map(([label, ...rest]) => ({ label: label.trim(), value: rest.join(':').trim() }));
    const next: Passport = { project: f.project, purpose: f.purpose.trim(), area: f.area, funding: f.funding.trim(), designer: f.designer.trim(), outputs };
    // the audit line names what changed, so the history reads on its own
    const changed = (['purpose', 'area', 'funding', 'designer'] as const).filter((k) => next[k] !== initial[k]).map((k) => w[k]);
    if (JSON.stringify(next.outputs) !== JSON.stringify(initial.outputs)) changed.push(w.outputs);
    if (!onSave(next, `${w.editPassport}: ${changed.join(', ') || '—'}`)) setProblems([{ field: 'role', code: 'forbidden' }]);
  };
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <Field label={w.purpose} error={problems.some((p) => p.field === 'purpose') ? t.problem.required : undefined}>
        <textarea className={`${inputCls} h-24 py-1.5`} value={f.purpose} onChange={(e) => setF({ ...f, purpose: e.target.value })} />
      </Field>
      <Field label={`${w.area} (${w.ha})`} error={problems.some((p) => p.field === 'area') ? t.problem.range : undefined}>
        <input type="number" step="0.1" min="0" className={inputCls} value={f.area} onChange={(e) => setF({ ...f, area: +e.target.value })} />
      </Field>
      <Field label={w.funding}>
        <input className={inputCls} value={f.funding} onChange={(e) => setF({ ...f, funding: e.target.value })} />
      </Field>
      <Field label={w.designer}>
        <input className={inputCls} value={f.designer} onChange={(e) => setF({ ...f, designer: e.target.value })} />
      </Field>
      <Field label={`${w.outputs} — ${w.outputsHint}`}>
        <textarea className={`${inputCls} h-28 py-1.5 font-mono`} value={f.outputsText} onChange={(e) => setF({ ...f, outputsText: e.target.value })} />
      </Field>
      <Problems list={problems} />
      {problems.some((p) => p.code === 'forbidden') && <Forbidden />}
      <div className="flex gap-2">
        <Btn kind="primary" type="submit">
          {t.common.save}
        </Btn>
        <Btn onClick={onCancel}>{t.common.cancel}</Btn>
      </div>
    </form>
  );
}
