'use client';

import { useMemo, useState } from 'react';
import { days, today } from '@/lib/construction/calc';
import { useText, useWords } from '@/lib/construction/text';
import type { Data, ParcelStatus } from '@/lib/construction/types';
import { Donut } from '../Charts';
import { Btn, Drawer, Forbidden, Kpi, PageHead, Panel, Pill, Table, toneOf } from '../Kit';
import { useStore } from '../Store';
import WorkspaceMap, { PARCEL_COLOR, type Pick } from '../WorkspaceMap';

// Land clearance: every parcel on the map, coloured by where its clearance stands. The status chips (or a slice of
// the ring) filter the map and the table together. Who owns a parcel is personal information: it isn't stored in the
// demonstration, and showing it would need an authorised role and a real, server-checked sign-in.

const STATUSES: ParcelStatus[] = ['not_started', 'negotiating', 'agreed', 'cleared', 'disputed'];

export default function Land() {
  const t = useText();
  const w = useWords({
    mn: {
      lead: 'Нэгж талбар бүрийн байршил, чөлөөлөлтийн төлөв, хариуцагч, хугацаа, баримт, шийдвэрлэгдээгүй асуудал — газрын зурагтай холбоотой.',
      parcels: 'Нэгж талбар',
      cleared: 'Чөлөөлөгдсөн',
      late: 'Хугацаа хоцорсон',
      disputed: 'Маргаантай',
      byStatus: 'Төлөвөөр',
      map: 'Газрын зураг',
      started: 'Эхэлсэн',
      target: 'Зорилтот',
      done: 'Дууссан',
      lateDays: 'Хоцрогдол',
      docs: 'Баримт',
      issues: 'Асуудал, тэмдэглэл',
      responsible: 'Хариуцагч',
      owners:
        'Өмчлөгчийн мэдээлэл хувийн мэдээлэлд хамаарна: жишээ өгөгдөлд хадгалаагүй. Харуулахад эрх бүхий дүр болон серверт шалгагдах нэвтрэлт шаардлагатай.',
      ownersAllowed: 'Таны дүр өмчлөгчийн мэдээлэл харах эрхтэй ч жишээ өгөгдөлд ийм мэдээлэл алга.',
      setStatus: 'Төлөв өөрчлөх',
      restrictedDoc: 'Хязгаарлагдсан баримт',
    },
    en: {
      lead: 'Each parcel’s location, clearance status, responsible party, dates, documents and open issues — tied to the map.',
      parcels: 'Parcels',
      cleared: 'Cleared',
      late: 'Behind target',
      disputed: 'Disputed',
      byStatus: 'By status',
      map: 'Map',
      started: 'Started',
      target: 'Target',
      done: 'Done',
      lateDays: 'Late by',
      docs: 'Documents',
      issues: 'Issues, notes',
      responsible: 'Responsible',
      owners: 'Owner details are personal information: they are not stored in the demonstration. Showing them needs an authorised role and a server-checked sign-in.',
      ownersAllowed: 'Your role may see owner details, but the demonstration holds none.',
      setStatus: 'Change status',
      restrictedDoc: 'Restricted document',
    },
  });
  const { data, can, change } = useStore();
  const [filter, setFilter] = useState<ParcelStatus | 'all'>('all');
  const [open, setOpen] = useState<string | null>(null);
  const now = today();

  const lateBy = (p: Data['parcels'][number]) => (p.status !== 'cleared' && p.target < now ? days(p.target, now) : 0);
  const shown = data.parcels.filter((p) => filter === 'all' || p.status === filter);
  // the map gets the same filtered set
  const mapData = useMemo<Data>(() => ({ ...data, parcels: shown }), [data, shown]);
  const orgName = (id: string) => data.orgs.find((o) => o.id === id)?.name ?? id;
  const docTitle = (id: string) => {
    const d = data.docs.find((x) => x.id === id);
    if (!d) return id;
    return d.access === 'restricted' && !can('doc.restricted') ? `🔒 ${w.restrictedDoc}` : d.title;
  };
  const sel = data.parcels.find((p) => p.id === open);

  const setStatus = (id: string, s: ParcelStatus) =>
    change('land.edit', id, s, (d) => {
      const p = d.parcels.find((x) => x.id === id);
      if (!p) return;
      p.status = s;
      if (s === 'cleared' && !p.done) p.done = today();
      if (s !== 'cleared') delete p.done;
    });

  return (
    <div className="space-y-6">
      <PageHead title={t.section.land} lead={w.lead} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label={w.parcels} value={data.parcels.length} />
        <Kpi label={w.cleared} value={`${data.parcels.filter((p) => p.status === 'cleared').length} / ${data.parcels.length}`} tone="good" />
        <Kpi label={w.late} value={data.parcels.filter((p) => lateBy(p) > 0).length} tone={data.parcels.some((p) => lateBy(p) > 0) ? 'bad' : 'good'} />
        <Kpi label={w.disputed} value={data.parcels.filter((p) => p.status === 'disputed').length} tone={data.parcels.some((p) => p.status === 'disputed') ? 'warn' : 'neutral'} />
      </div>

      {/* status chips: filter the map and the table together */}
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={t.filter.status}>
        {(['all', ...STATUSES] as const).map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={filter === s}
            onClick={() => setFilter(s)}
            className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors ${filter === s ? 'border-accent/50 bg-accent/10 text-fg' : 'border-line text-mute hover:text-fg'}`}
          >
            {s !== 'all' && <span className="h-2 w-2 rounded-sm" style={{ background: PARCEL_COLOR[s] }} />}
            {s === 'all' ? t.filter.all : t.parcelStatus[s]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <Panel title={w.map}>
          <WorkspaceMap data={mapData} layers={['parcels', 'packages']} selected={open} onPick={(p: Pick) => p.kind === 'parcel' && setOpen(p.id)} height="h-[360px]" />
        </Panel>
        <Panel title={w.byStatus}>
          <Donut
            label={w.byStatus}
            parts={STATUSES.map((s) => ({ key: s, name: t.parcelStatus[s], value: data.parcels.filter((p) => p.status === s).length, color: PARCEL_COLOR[s] }))}
            onPick={(k) => setFilter((f) => (f === k ? 'all' : (k as ParcelStatus)))}
          />
          <p className="mt-4 rounded-lg border border-line p-3 text-xs text-mute">🔒 {can('land.owners') ? w.ownersAllowed : w.owners}</p>
        </Panel>
      </div>

      <Panel title={w.parcels}>
        <Table head={['ID', t.common.status, w.responsible, w.started, w.target, w.done, w.lateDays, w.docs, w.issues]} empty={!shown.length}>
          {shown.map((p) => {
            const late = lateBy(p);
            return (
              <tr key={p.id} className="cursor-pointer align-top hover:bg-surface/60" onClick={() => setOpen(p.id)}>
                <td className="px-2 py-2 font-mono text-xs">
                  {p.id}
                  {!p.geom && <span className="mt-0.5 block font-sans text-[11px] text-amber-700">{t.common.noGeom}</span>}
                </td>
                <td className="px-2 py-2">
                  <Pill tone={toneOf(p.status)}>{t.parcelStatus[p.status]}</Pill>
                </td>
                <td className="px-2 py-2 text-xs">{orgName(p.responsible)}</td>
                <td className="px-2 py-2 font-mono text-xs text-mute">{p.started}</td>
                <td className={`px-2 py-2 font-mono text-xs ${late ? 'text-red-700' : 'text-mute'}`}>{p.target}</td>
                <td className="px-2 py-2 font-mono text-xs text-mute">{p.done ?? '—'}</td>
                <td className="px-2 py-2 text-xs">{late ? <Pill tone="bad">{`${late} ${t.common.days}`}</Pill> : '—'}</td>
                <td className="px-2 py-2 text-xs">{p.docs.length ? p.docs.map((d) => <span key={d} className="block">{docTitle(d)}</span>) : '—'}</td>
                <td className="max-w-[260px] px-2 py-2 text-xs text-fg/80">{p.issues || '—'}</td>
              </tr>
            );
          })}
        </Table>
      </Panel>

      <Drawer open={!!sel} onClose={() => setOpen(null)} title={sel ? `${sel.id} · ${t.parcelStatus[sel.status]}` : ''}>
        {sel && (
          <div className="space-y-5 text-sm">
            <dl className="space-y-1.5 text-xs">
              {(
                [
                  [w.responsible, orgName(sel.responsible)],
                  [w.started, sel.started],
                  [w.target, sel.target],
                  [w.done, sel.done ?? '—'],
                  [w.lateDays, lateBy(sel) ? `${lateBy(sel)} ${t.common.days}` : '—'],
                  [t.common.onMap, sel.geom ? `${sel.geom.w} × ${sel.geom.h} м` : t.common.noGeom],
                  [w.issues, sel.issues || '—'],
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
              {sel.docs.length ? sel.docs.map((d) => <p key={d} className="text-xs">{docTitle(d)}</p>) : <p className="text-xs text-mute">{t.common.none}</p>}
            </div>
            <p className="rounded-lg border border-line p-3 text-xs text-mute">🔒 {can('land.owners') ? w.ownersAllowed : w.owners}</p>
            {can('land.edit') ? (
              <div>
                <p className="mb-2 text-xs text-mute">{w.setStatus}</p>
                <div className="flex flex-wrap gap-2">
                  {STATUSES.filter((s) => s !== sel.status).map((s) => (
                    <Btn key={s} onClick={() => setStatus(sel.id, s)}>
                      → {t.parcelStatus[s]}
                    </Btn>
                  ))}
                </div>
              </div>
            ) : (
              <Forbidden />
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
