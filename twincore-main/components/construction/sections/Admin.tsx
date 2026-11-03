'use client';

import { useState } from 'react';
import { ACTIONS, can as allowed, ROLES, type Action } from '@/lib/construction/perms';
import { useText, useWords } from '@/lib/construction/text';
import type { OrgKind, Role } from '@/lib/construction/types';
import { Forbidden, Kpi, PageHead, Panel, Pill, Select, Table } from '../Kit';
import { useStore } from '../Store';

// Administration — and an honest statement of what is missing. Sign-in and server-side authorisation do not exist
// yet (there is no backend); the "view as" switch only changes what the interface offers. The permission matrix
// below is the one a production API must enforce. Users, organisations, data sources and the audit trail are shown
// as they stand in this browser's demonstration data.

const W = {
  mn: {
    lead: 'Хэрэглэгч, дүр, эрхийн түвшин, лавлах өгөгдөл, мэдээллийн эх сурвалж, аудитын бүртгэл.',
    secTitle: 'Нэвтрэлт, серверийн эрхийн хяналт хараахан хэрэгжээгүй',
    secBody: 'Энэ ажлын орон зай сервер, өгөгдлийн сангүй ажиллаж байна. Дээрх «Дүрээр харах» сонголт зөвхөн интерфейсийг өөрчилдөг — хамгаалалт биш. Бодит ашиглалтад доорх эрхийн матрицыг серверийн API түвшинд мөрдүүлж, жинхэнэ нэвтрэлт (жишээ нь байгууллагын SSO) холбох шаардлагатай.',
    users: 'Хэрэглэгчид',
    name: 'Нэр',
    org: 'Байгууллага',
    role: 'Дүр',
    projects: 'Төслийн хандалт',
    roleDemo: 'Дүр солих нь зөвхөн энэ хөтөч дээрх жишээ өгөгдөлд нөлөөлнө.',
    matrix: 'Эрхийн матриц',
    matrixNote: 'Сервер ч мөн адил дүрмээр шалгах ёстой.',
    action: 'Үйлдэл',
    orgs: 'Байгууллагууд (лавлах)',
    kind: 'Ангилал',
    kinds: { client: 'Захиалагч', contractor: 'Гүйцэтгэгч', consultant: 'Зөвлөх, хяналт', authority: 'Төрийн байгууллага', utility: 'Шугам сүлжээ' } as Record<OrgKind, string>,
    sources: 'Мэдээллийн эх сурвалж',
    source: 'Эх сурвалж',
    use: 'Ашиглаж буй газар',
    status: 'Төлөв',
    real: 'Бодит',
    demo: 'Жишээ / симуляц',
    audit: 'Аудитын бүртгэл',
    auditNote: 'Энэ хөтөч дээрх өөрчлөлт бүр бүртгэгдэнэ (сүүлийн 500).',
    time: 'Цаг',
    who: 'Хэрэглэгч',
    entity: 'Бүртгэл',
    detail: 'Дэлгэрэнгүй',
    allActions: 'Бүх үйлдэл',
    kpiUsers: 'Хэрэглэгч',
    kpiRoles: 'Дүр',
    kpiAudit: 'Аудитын бичлэг',
    kpiAuth: 'Нэвтрэлт',
    none: 'Байхгүй',
    actions: {
      'schedule.edit': 'Хуваарь засах',
      'baseline.approve': 'Үндсэн хуваарь батлах',
      'progress.submit': 'Гүйцэтгэл илгээх',
      'progress.review': 'Гүйцэтгэл хянах, батлах',
      'finance.view': 'Санхүүгийн мэдээлэл харах',
      'invoice.submit': 'Нэхэмжлэх илгээх',
      'invoice.review': 'Нэхэмжлэх батлах',
      'quality.edit': 'QA/QC бүртгэл',
      'safety.edit': 'ХАБЭА бүртгэл',
      'safety.restricted': 'Ослын нууц мэдээлэл харах',
      'land.edit': 'Газар чөлөөлөлт засах',
      'land.owners': 'Эзэмшигчийн мэдээлэл харах',
      'permit.edit': 'Зөвшөөрөл бүртгэх',
      'asset.edit': 'Дэд бүтэц засах',
      'doc.upload': 'Баримт оруулах',
      'doc.review': 'Баримт батлах',
      'doc.restricted': 'Хязгаарлагдсан баримт харах',
      'variation.submit': 'Нэмэлт ажлын хүсэлт гаргах',
      'variation.review': 'Нэмэлт ажил хянаж батлах',
      'material.submit': 'Материалын баталгаажуулалт илгээх',
      'material.review': 'Материал хянаж батлах',
      'supervision.edit': 'Хяналтын үзлэг, заавар бүртгэх',
      'plan.edit': 'Төлөвлөгөөний мэдээлэл засах',
      'funding.edit': 'Санхүүжилтийн мэдээлэл засах',
      admin: 'Системийн удирдлага',
    } as Record<Action, string>,
  },
  en: {
    lead: 'Users, roles, permission levels, reference data, data sources and the audit log.',
    secTitle: 'Sign-in and server-side authorisation are not implemented yet',
    secBody: 'This workspace runs without a server or database. The “View as” switch above only changes the interface — it is not security. In production, the permission matrix below must be enforced at the server API, with real sign-in (for example the organisation’s SSO).',
    users: 'Users',
    name: 'Name',
    org: 'Organisation',
    role: 'Role',
    projects: 'Project access',
    roleDemo: 'Changing a role only affects the sample data in this browser.',
    matrix: 'Permission matrix',
    matrixNote: 'The server must check the same rules.',
    action: 'Action',
    orgs: 'Organisations (reference)',
    kind: 'Kind',
    kinds: { client: 'Client', contractor: 'Contractor', consultant: 'Consultant, supervision', authority: 'Authority', utility: 'Utility' },
    sources: 'Data sources',
    source: 'Source',
    use: 'Used for',
    status: 'Status',
    real: 'Real',
    demo: 'Sample / simulated',
    audit: 'Audit log',
    auditNote: 'Every change in this browser is recorded (latest 500).',
    time: 'Time',
    who: 'User',
    entity: 'Record',
    detail: 'Detail',
    allActions: 'All actions',
    kpiUsers: 'Users',
    kpiRoles: 'Roles',
    kpiAudit: 'Audit entries',
    kpiAuth: 'Sign-in',
    none: 'None',
    actions: {
      'schedule.edit': 'Edit the schedule',
      'baseline.approve': 'Approve a baseline',
      'progress.submit': 'Submit progress',
      'progress.review': 'Review and approve progress',
      'finance.view': 'See financial data',
      'invoice.submit': 'Submit invoices',
      'invoice.review': 'Approve invoices',
      'quality.edit': 'QA/QC records',
      'safety.edit': 'H&S records',
      'safety.restricted': 'See confidential incident details',
      'land.edit': 'Edit land clearance',
      'land.owners': 'See owner information',
      'permit.edit': 'Register permits',
      'asset.edit': 'Edit infrastructure',
      'doc.upload': 'Upload documents',
      'doc.review': 'Approve documents',
      'doc.restricted': 'See restricted documents',
      'variation.submit': 'Request extra work',
      'variation.review': 'Review and approve extra work',
      'material.submit': 'Submit materials for approval',
      'material.review': 'Review and approve materials',
      'supervision.edit': 'Record inspections and site instructions',
      'plan.edit': 'Edit plan information',
      'funding.edit': 'Edit funding',
      admin: 'Administration',
    },
  },
};

const SOURCES: { name: string; use: { mn: string; en: string }; real: boolean }[] = [
  { name: 'Esri World Imagery', use: { mn: 'Газрын зургийн суурь (хиймэл дагуулын зураг)', en: 'Map base (satellite imagery)' }, real: true },
  { name: 'OpenStreetMap', use: { mn: 'Нүүр хуудасны хот: барилга, зам, гол', en: 'Front-page city: buildings, roads, rivers' }, real: true },
  { name: 'Open-Meteo', use: { mn: 'Нүүр хуудасны цаг агаар (шууд)', en: 'Front-page weather (live)' }, real: true },
  { name: 'lib/monitor.ts', use: { mn: 'IoT мэдрэгчийн заалт — симуляц', en: 'IoT sensor readings — simulated' }, real: false },
  { name: 'lib/construction/demo.ts', use: { mn: 'Ажлын орон зайн бүх бүртгэл — жишээ', en: 'Every workspace record — sample' }, real: false },
];

export default function Admin() {
  const t = useText();
  const w = useWords(W);
  const en = w === W.en;
  const { data, can, change } = useStore();
  const [act, setAct] = useState('all');
  const orgName = (id: string) => data.orgs.find((o) => o.id === id)?.name ?? id;
  const userName = (id: string) => data.users.find((u) => u.id === id)?.name ?? id;
  const projName = (id: string) => data.projects.find((p) => p.id === id)?.name ?? id;
  const auditActions = [...new Set(data.audit.map((a) => a.action))];
  const audit = data.audit.filter((a) => act === 'all' || a.action === act);

  return (
    <div className="space-y-6">
      <PageHead title={t.section.admin} lead={w.lead} />

      <div role="note" className="rounded-2xl border border-red-400/40 bg-red-500/[0.07] px-4 py-3">
        <p className="font-medium text-red-700">🔒 {w.secTitle}</p>
        <p className="mt-1 text-sm text-fg/80">{w.secBody}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label={w.kpiUsers} value={data.users.length} />
        <Kpi label={w.kpiRoles} value={ROLES.length} />
        <Kpi label={w.kpiAudit} value={data.audit.length} />
        <Kpi label={w.kpiAuth} value={w.none} tone="bad" />
      </div>

      <Panel title={w.users} action={can('admin') ? <span className="text-xs text-mute">{w.roleDemo}</span> : <Forbidden />}>
        <Table head={[w.name, w.org, w.role, w.projects]} empty={!data.users.length}>
          {data.users.map((u) => (
            <tr key={u.id}>
              <td className="px-2 py-2">
                {u.name} <span className="font-mono text-xs text-mute">{u.id}</span>
              </td>
              <td className="px-2 py-2 text-xs text-mute">{orgName(u.org)}</td>
              <td className="px-2 py-2">
                {can('admin') ? (
                  <Select
                    label={w.role}
                    value={u.role}
                    onChange={(r: Role) =>
                      change('admin', u.id, `role ${u.role} → ${r}`, (d) => {
                        const x = d.users.find((y) => y.id === u.id);
                        if (x) x.role = r;
                      })
                    }
                    options={ROLES.map((r): [Role, string] => [r, t.role[r]])}
                  />
                ) : (
                  <Pill>{t.role[u.role]}</Pill>
                )}
              </td>
              <td className="px-2 py-2 text-xs text-mute">{u.projects.map(projName).join(', ')}</td>
            </tr>
          ))}
        </Table>
      </Panel>

      <Panel title={w.matrix} action={<span className="text-xs text-mute">{w.matrixNote}</span>}>
        <div className="-mx-1 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-mute">
                <th scope="col" className="px-2 py-2 font-normal">
                  {w.action}
                </th>
                {ROLES.map((r) => (
                  <th key={r} scope="col" className="px-2 py-2 text-center font-normal">
                    {t.role[r]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {ACTIONS.map((a) => (
                <tr key={a}>
                  <th scope="row" className="px-2 py-1.5 text-left font-normal">
                    {w.actions[a]} <span className="font-mono text-[10px] text-mute">{a}</span>
                  </th>
                  {ROLES.map((r) => (
                    <td key={r} className="px-2 py-1.5 text-center">
                      {allowed(r, a) ? <span className="text-emerald-700" aria-label="✓">✓</span> : <span className="text-mute" aria-label="—">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-2">
        <Panel title={w.orgs}>
          <Table head={['ID', w.name, w.kind]} empty={!data.orgs.length}>
            {data.orgs.map((o) => (
              <tr key={o.id}>
                <td className="px-2 py-2 font-mono text-xs text-mute">{o.id}</td>
                <td className="px-2 py-2">{o.name}</td>
                <td className="px-2 py-2 text-xs">{w.kinds[o.kind]}</td>
              </tr>
            ))}
          </Table>
        </Panel>
        <Panel title={w.sources}>
          <Table head={[w.source, w.use, w.status]}>
            {SOURCES.map((s) => (
              <tr key={s.name}>
                <td className="px-2 py-2 font-mono text-xs">{s.name}</td>
                <td className="px-2 py-2 text-xs text-fg/85">{en ? s.use.en : s.use.mn}</td>
                <td className="px-2 py-2">
                  <Pill tone={s.real ? 'good' : 'warn'}>{s.real ? w.real : w.demo}</Pill>
                </td>
              </tr>
            ))}
          </Table>
        </Panel>
      </div>

      <Panel
        title={w.audit}
        action={<Select label={w.action} value={act} onChange={setAct} options={[['all', w.allActions], ...auditActions.map((a): [string, string] => [a, (w.actions as Record<string, string>)[a] ?? a])]} />}
      >
        <p className="mb-3 text-xs text-mute">{w.auditNote}</p>
        <Table head={[w.time, w.who, w.action, w.entity, w.detail]} empty={!audit.length}>
          {audit.slice(0, 200).map((a, i) => (
            <tr key={i}>
              <td className="px-2 py-1.5 font-mono text-xs text-mute">{a.at.replace('T', ' ').slice(0, 19)}</td>
              <td className="px-2 py-1.5 text-xs">{userName(a.by)}</td>
              <td className="px-2 py-1.5 text-xs">{(w.actions as Record<string, string>)[a.action] ?? a.action}</td>
              <td className="px-2 py-1.5 font-mono text-xs">{a.entity}</td>
              <td className="px-2 py-1.5 text-xs text-mute">{a.detail}</td>
            </tr>
          ))}
        </Table>
      </Panel>
    </div>
  );
}
