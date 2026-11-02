'use client';

import { useMemo, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { useText, useWords } from '@/lib/construction/text';
import type { Asset, AssetKind, AssetStatus, Data } from '@/lib/construction/types';
import type { Problem } from '@/lib/construction/validate';
import { Bar, Btn, Drawer, Field, Forbidden, inputCls, Kpi, PageHead, Panel, Pill, Problems, Select, Table, toneOf } from '../Kit';
import { useStore } from '../Store';
import WorkspaceMap, { ASSET_COLOR, type Pick } from '../WorkspaceMap';

// Engineering infrastructure: the utility networks and roads of the project, each a line on the map in its own colour,
// with its planned and actual progress, technical attributes, responsible organisation and documents. Where detailed
// geometry or an actual figure isn't available, it says so rather than guessing.

const KINDS: AssetKind[] = ['water', 'heat', 'power', 'sewer', 'telecom', 'road'];
const STATUSES: AssetStatus[] = ['planned', 'ongoing', 'completed', 'delayed'];

export default function Infra() {
  const t = useText();
  const w = useWords({
    mn: {
      lead: 'Шугам сүлжээ, байгууламжийн бүртгэл — төрөл, байршил, төлөвлөсөн ба гүйцэтгэсэн, техникийн үзүүлэлт, хариуцагч, баримт.',
      assets: 'Объект',
      completed: 'Дууссан',
      delayed: 'Хоцорсон',
      noGeom: 'Байршилгүй',
      kind: 'Төрөл',
      name: 'Нэр',
      plannedActual: 'Төлөвлөсөн / гүйцэтгэсэн',
      org: 'Хариуцагч байгууллага',
      attrs: 'Техникийн үзүүлэлт',
      docs: 'Баримт',
      update: 'Гүйцэтгэл шинэчлэх',
      actual: 'Гүйцэтгэл, %',
      planned: 'Төлөвлөсөн өнөөдөр',
      openPkg: 'Багцыг харах',
      map: 'Газрын зураг',
      unavailable: 'Гүйцэтгэлийн мэдээлэл ирээгүй',
    },
    en: {
      lead: 'The networks and structures — type, location, planned and actual progress, technical attributes, responsible organisation, documents.',
      assets: 'Assets',
      completed: 'Completed',
      delayed: 'Delayed',
      noGeom: 'No geometry',
      kind: 'Type',
      name: 'Name',
      plannedActual: 'Planned / actual',
      org: 'Responsible organisation',
      attrs: 'Technical attributes',
      docs: 'Documents',
      update: 'Update progress',
      actual: 'Actual, %',
      planned: 'Planned by today',
      openPkg: 'Open the package',
      map: 'Map',
      unavailable: 'No progress reported yet',
    },
  });
  const { data, can, change } = useStore();
  const [kind, setKind] = useState<'all' | AssetKind>('all');
  const [status, setStatus] = useState<'all' | AssetStatus>('all');
  const [open, setOpen] = useState<string | null>(null);

  const shown = data.assets.filter((a) => (kind === 'all' || a.kind === kind) && (status === 'all' || a.status === status));
  const mapData = useMemo<Data>(() => ({ ...data, assets: shown }), [data, shown]);
  const orgName = (id: string) => data.orgs.find((o) => o.id === id)?.name ?? id;
  const sel = data.assets.find((a) => a.id === open);

  return (
    <div className="space-y-6">
      <PageHead title={t.section.infra} lead={w.lead} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label={w.assets} value={data.assets.length} />
        <Kpi label={w.completed} value={data.assets.filter((a) => a.status === 'completed').length} tone="good" />
        <Kpi label={w.delayed} value={data.assets.filter((a) => a.status === 'delayed').length} tone={data.assets.some((a) => a.status === 'delayed') ? 'bad' : 'good'} />
        <Kpi label={w.noGeom} value={data.assets.filter((a) => !a.geom).length} tone={data.assets.some((a) => !a.geom) ? 'warn' : 'neutral'} />
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="w-[200px]">
          <Select label={w.kind} value={kind} onChange={setKind} options={[['all', t.filter.all], ...KINDS.map((k) => [k, t.assetKind[k]] as [AssetKind, string])]} />
        </div>
        <div className="w-[200px]">
          <Select label={t.filter.status} value={status} onChange={setStatus} options={[['all', t.filter.all], ...STATUSES.map((s) => [s, t.assetStatus[s]] as [AssetStatus, string])]} />
        </div>
      </div>

      <Panel title={w.map}>
        <WorkspaceMap data={mapData} layers={['assets', 'packages']} selected={open} onPick={(p: Pick) => p.kind === 'asset' && setOpen(p.id)} height="h-[360px]" />
      </Panel>

      <Panel title={w.assets}>
        <Table head={['ID', w.name, w.kind, t.common.package, w.plannedActual, t.common.status, w.org, w.attrs]} empty={!shown.length}>
          {shown.map((a) => (
            <tr key={a.id} className="cursor-pointer align-top hover:bg-surface/60" onClick={() => setOpen(a.id)}>
              <td className="px-2 py-2 font-mono text-xs">
                {a.id}
                {!a.geom && <span className="mt-0.5 block font-sans text-[11px] text-sky-300">{t.common.noGeom}</span>}
              </td>
              <td className="px-2 py-2">
                <button type="button" className="cursor-pointer text-left hover:underline" onClick={() => setOpen(a.id)}>
                  {a.name}
                </button>
              </td>
              <td className="px-2 py-2 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm" style={{ background: ASSET_COLOR[a.kind] }} />
                  {t.assetKind[a.kind]}
                </span>
              </td>
              <td className="px-2 py-2 font-mono text-xs">{a.pkg}</td>
              <td className="min-w-[150px] px-2 py-2">
                <Bar value={a.actual} planned={a.planned} tone={a.status === 'delayed' ? 'bad' : a.status === 'completed' ? 'good' : 'info'} label={a.name} />
                <span className="mt-1 block font-mono text-[11px] text-mute">
                  {a.planned}% / {a.actual == null ? '—' : `${a.actual}%`}
                </span>
              </td>
              <td className="px-2 py-2">
                <Pill tone={toneOf(a.status)}>{t.assetStatus[a.status]}</Pill>
              </td>
              <td className="px-2 py-2 text-xs">{orgName(a.org)}</td>
              <td className="px-2 py-2 text-xs text-fg/80">
                {Object.entries(a.attrs).length
                  ? Object.entries(a.attrs).map(([k, v]) => (
                      <span key={k} className="block">
                        {k}: {v}
                      </span>
                    ))
                  : '—'}
              </td>
            </tr>
          ))}
        </Table>
      </Panel>

      <Drawer open={!!sel} onClose={() => setOpen(null)} title={sel ? `${sel.id} · ${sel.name}` : ''}>
        {sel && <AssetDetail a={sel} words={w} canEdit={can('asset.edit')} change={change} orgName={orgName} />}
      </Drawer>
    </div>
  );
}

type W = { kind: string; plannedActual: string; org: string; attrs: string; docs: string; update: string; actual: string; planned: string; openPkg: string; unavailable: string };

function AssetDetail({ a, words: w, canEdit, change, orgName }: { a: Asset; words: W; canEdit: boolean; change: ReturnType<typeof useStore>['change']; orgName: (id: string) => string }) {
  const t = useText();
  const { data, can } = useStore();
  const [actual, setActual] = useState(a.actual == null ? '' : String(a.actual));
  const [status, setStatus] = useState<AssetStatus>(a.status);
  const [problems, setProblems] = useState<Problem[]>([]);
  const pkg = data.packages.find((p) => p.id === a.pkg);
  const docs = a.docs.map((d) => data.docs.find((x) => x.id === d)).filter((d) => d && (d.access !== 'restricted' || can('doc.restricted')));

  const save = () => {
    const v = actual.trim() === '' ? null : Number(actual);
    if (v != null && (Number.isNaN(v) || v < 0 || v > 100)) return setProblems([{ field: 'actual', code: 'range' }]);
    setProblems([]);
    change('asset.edit', a.id, `${v ?? '—'}% · ${status}`, (d) => {
      const x = d.assets.find((q) => q.id === a.id);
      if (!x) return;
      x.actual = v;
      x.status = status;
    });
  };

  return (
    <div className="space-y-5 text-sm">
      <div className="flex flex-wrap gap-1.5">
        <Pill tone={toneOf(a.status)}>{t.assetStatus[a.status]}</Pill>
        {!a.geom && <Pill tone="warn">{t.common.noGeom}</Pill>}
      </div>
      <div>
        <Bar value={a.actual} planned={a.planned} tone={a.status === 'delayed' ? 'bad' : 'info'} label={a.name} />
        <p className="mt-1.5 text-xs text-mute">
          {w.planned}: {a.planned}% · {w.actual}: {a.actual == null ? w.unavailable : `${a.actual}%`}
        </p>
      </div>
      <dl className="space-y-1.5 text-xs">
        {(
          [
            [w.kind, t.assetKind[a.kind]],
            [t.common.package, pkg ? `${pkg.id} · ${pkg.name}` : a.pkg],
            [w.org, orgName(a.org)],
            ...Object.entries(a.attrs),
          ] as [string, string][]
        ).map(([k, v]) => (
          <div key={k} className="grid grid-cols-[8rem_1fr] gap-3 border-b border-line/50 pb-1.5">
            <dt className="text-mute">{k}</dt>
            <dd className="text-fg/90">{v}</dd>
          </div>
        ))}
      </dl>
      <div>
        <p className="mb-1 text-xs text-mute">{w.docs}</p>
        {docs.length ? docs.map((d) => <p key={d!.id} className="text-xs">📄 {d!.title}</p>) : <p className="text-xs text-mute">{t.common.none}</p>}
      </div>
      {pkg && (
        <div className="flex flex-wrap gap-3 text-xs">
          <Link href="/construction/progress" className="text-accent-hi hover:underline">
            {w.openPkg} ({pkg.id}) →
          </Link>
          {pkg.twin && (
            <Link href={pkg.twin} className="text-accent-hi hover:underline">
              {t.common.inTwin} →
            </Link>
          )}
        </div>
      )}
      {canEdit ? (
        <div className="space-y-2 border-t border-line pt-4">
          <p className="text-xs text-mute">{w.update}</p>
          <Field label={w.actual} error={problems.length ? t.problem.range : undefined}>
            <input type="number" min={0} max={100} className={inputCls} value={actual} onChange={(e) => setActual(e.target.value)} />
          </Field>
          <Select label={t.filter.status} value={status} onChange={setStatus} options={STATUSES.map((s) => [s, t.assetStatus[s]])} />
          <Problems list={problems} />
          <Btn kind="primary" onClick={save}>
            {t.common.save}
          </Btn>
        </div>
      ) : (
        <Forbidden />
      )}
    </div>
  );
}
