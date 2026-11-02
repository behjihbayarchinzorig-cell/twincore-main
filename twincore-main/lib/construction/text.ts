// The workspace's shared wording, Mongolian and English. Each section keeps its own few extra words beside it
// (see useWords). Brand names (TwinCore, GIS, BIM, IoT) stay in English in both.

import { useLocale } from 'next-intl';
import type { AssetKind, AssetStatus, DocState, DocType, InvoiceState, IssueState, ParcelStatus, PermitStatus, PkgStatus, ProgressState, Role, SafetyKind, Severity } from './types';

export type Section =
  | 'dashboard'
  | 'schedule'
  | 'progress'
  | 'finance'
  | 'quality'
  | 'land'
  | 'permits'
  | 'infra'
  | 'iot'
  | 'esg'
  | 'docs'
  | 'reports'
  | 'admin'
  | 'approveSchedule'
  | 'variations'
  | 'qualityDocs'
  | 'materials'
  | 'project'
  | 'supervision'
  | 'pkgDeps'
  | 'pkgProgress'
  | 'masterplan'
  | 'detailplan'
  | 'safety'
  | 'risk'
  | 'suitability'
  | 'funding'
  | 'workflow'
  | 'sysdocs';
export type Group = 'mine' | 'approve' | 'control' | 'smart' | 'money' | 'report' | 'docs' | 'system';
// The sidebar: groups of sections, numbered straight through except the document archive and administration.
export const GROUPS: { key: Group; items: Section[] }[] = [
  { key: 'mine', items: ['progress', 'schedule', 'quality'] },
  { key: 'approve', items: ['approveSchedule', 'variations', 'qualityDocs', 'materials'] },
  { key: 'control', items: ['dashboard', 'project', 'supervision', 'pkgDeps', 'pkgProgress', 'masterplan', 'detailplan', 'land', 'permits', 'safety', 'infra'] },
  { key: 'smart', items: ['iot', 'risk', 'esg', 'suitability'] },
  { key: 'money', items: ['finance', 'funding'] },
  { key: 'report', items: ['reports', 'workflow'] },
  { key: 'docs', items: ['docs'] },
  { key: 'system', items: ['sysdocs', 'admin'] },
];
export const UNNUMBERED: Section[] = ['docs', 'admin'];
// sections with views of their own, opened from the sidebar (the page keeps the choice in the address #hash)
export const SUBS: Partial<Record<Section, string[]>> = {
  masterplan: ['zoning', 'landuse', 'limits', 'roads', 'networks'],
  detailplan: ['blocks', 'plots', 'parameters', 'phasing'],
};
// in sidebar order, group by group
export const SECTIONS: Section[] = GROUPS.flatMap((g) => g.items);

const mn = {
  workspace: 'Бүтээн байгуулалтын хяналт',
  workspaceSub: 'Ажлын орон зай',
  section: {
    dashboard: 'Ерөнхий дашбоард',
    schedule: 'Хуваарь',
    progress: 'Гүйцэтгэл',
    finance: 'Багцын санхүү',
    quality: 'Чанар (QAQC)',
    land: 'Газар чөлөөлөлт',
    permits: 'Зөвшөөрөл',
    infra: 'Инженерийн дэд бүтэц',
    iot: 'IoT хяналт',
    esg: 'Иргэдэд хүрэх үр өгөөж',
    docs: 'ТЭЗҮ-БОНУ',
    reports: 'Тайлан',
    admin: 'Системийн удирдлага',
    approveSchedule: 'Хуваарь батлах',
    variations: 'Нэмэлт ажил батлах',
    qualityDocs: 'Чанарын баримт',
    materials: 'Материал баталгаажуулалт',
    project: 'Төслийн дэлгэрэнгүй мэдээлэл',
    supervision: 'ТУХ',
    pkgDeps: 'Багцын хамаарал',
    pkgProgress: 'Багцын гүйцэтгэл',
    masterplan: 'Ерөнхий төлөвлөгөө',
    detailplan: 'Хэсэгчилсэн ЕТ',
    safety: 'ХАБЭА',
    risk: 'Эрсдэлийн загвар',
    suitability: 'Тохиромжтой байдлын үнэлгээ',
    funding: 'Санхүүжилт',
    workflow: 'Үйл ажиллагааны схем',
    sysdocs: 'Системийн баримт',
  } as Record<Section, string>,
  group: {mine: 'Миний ажил', approve: 'Батлах', control: 'Хяналт', smart: 'Ухаалаг хот', money: 'Санхүү', report: 'Тайлан', docs: 'Баримт', system: 'Систем'} as Record<Group, string>,
  sub: {zoning: 'Бүсчлэл', landuse: 'Газар ашиглалт', limits: 'Барилгажилтын үзүүлэлт', roads: 'Авто зам', networks: 'Инженерийн шугам', blocks: 'Хороолол, хэсэгчилсэн бүс', plots: 'Нэгж талбар', parameters: 'Барилгын үзүүлэлт', phasing: 'Үе шат'} as Record<string, string>,
  nav: { menu: 'Цэс', find: 'Хэсэг хайх…', none: 'Олдсонгүй', scope: 'Таны дүрд оногдсон хэсгүүд', all: 'Бүх хэсэг — админ', noAccess: 'Энэ хэсэг таны дүрд оногдоогүй', noAccessBody: 'Та зөвхөн өөрт оногдсон хэсгүүдийг харна. Бүх хэсэг, тайланд зөвхөн админ хандана.', back: 'Ерөнхий дашбоард руу' },
  demo: {
    title: 'Жишээ өгөгдөл — бодит төсөл биш',
    body: 'Энэ ажлын орон зай системийн ажиллагааг харуулах жишээ өгөгдөлтэй. Таны хийсэн өөрчлөлт зөвхөн энэ хөтөч дээр хадгалагдана; сервер, өгөгдлийн сан, нэвтрэлт хараахан холбогдоогүй.',
    reset: 'Жишээ өгөгдлийг сэргээх',
    resetConfirm: 'Энэ хөтөч дээрх бүх өөрчлөлт устаж, жишээ өгөгдөл анхны байдалдаа орно. Үргэлжлүүлэх үү?',
    viewAs: 'Дүрээр харах',
    viewAsNote: 'Интерфейсийг шалгах зорилготой — хамгаалалт биш',
  },
  role: { admin: 'Админ', manager: 'Төслийн менежер', engineer: 'Хяналтын инженер', contractor: 'Гүйцэтгэгч', viewer: 'Ажиглагч' } as Record<Role, string>,
  filter: { project: 'Төсөл', pkg: 'Багц', status: 'Төлөв', from: 'Эхлэх', to: 'Дуусах', org: 'Хариуцагч', all: 'Бүгд', clear: 'Цэвэрлэх', search: 'Хайх…' },
  pkgStatus: { planned: 'Төлөвлөсөн', active: 'Явагдаж буй', done: 'Дууссан', suspended: 'Түр зогссон' } as Record<PkgStatus, string>,
  progressState: { draft: 'Ноорог', submitted: 'Хянуулахаар илгээсэн', approved: 'Батлагдсан', rejected: 'Буцаагдсан' } as Record<ProgressState, string>,
  invoiceState: { submitted: 'Ирүүлсэн', approved: 'Батлагдсан', rejected: 'Буцаагдсан', paid: 'Төлөгдсөн' } as Record<InvoiceState, string>,
  issueState: { open: 'Нээлттэй', review: 'Хянагдаж буй', resolved: 'Шийдвэрлэгдсэн' } as Record<IssueState, string>,
  severity: { low: 'Бага', medium: 'Дунд', high: 'Өндөр' } as Record<Severity, string>,
  safetyKind: { observation: 'Ажиглалт', incident: 'Осол, тохиолдол', risk: 'Эрсдэлийн үнэлгээ', inspection: 'Үзлэг' } as Record<SafetyKind, string>,
  parcelStatus: { not_started: 'Эхлээгүй', negotiating: 'Хэлэлцээр', agreed: 'Тохиролцсон', cleared: 'Чөлөөлөгдсөн', disputed: 'Маргаантай' } as Record<ParcelStatus, string>,
  permitStatus: { pending: 'Хүлээгдэж буй', approved: 'Олгогдсон', rejected: 'Татгалзсан', expired: 'Хугацаа дууссан' } as Record<PermitStatus, string>,
  assetKind: { water: 'Цэвэр ус', heat: 'Дулаан', power: 'Цахилгаан', sewer: 'Бохир ус', telecom: 'Холбоо', road: 'Зам' } as Record<AssetKind, string>,
  assetStatus: { planned: 'Төлөвлөсөн', ongoing: 'Явагдаж буй', completed: 'Дууссан', delayed: 'Хоцорсон' } as Record<AssetStatus, string>,
  docType: { feasibility: 'ТЭЗҮ', eia: 'БОНҮ', permit: 'Зөвшөөрөл', contract: 'Гэрээ', drawing: 'Зураг', inspection: 'Шалгалтын баримт', report: 'Тайлан', other: 'Бусад' } as Record<DocType, string>,
  docState: { draft: 'Ноорог', review: 'Хянагдаж буй', approved: 'Батлагдсан', superseded: 'Хүчингүй (шинэ хувилбартай)' } as Record<DocState, string>,
  common: {
    overdue: 'Хугацаа хэтэрсэн',
    soon: 'Удахгүй дуусна',
    none: 'Бүртгэл алга',
    unavailable: 'Мэдээлэл байхгүй',
    open: 'Нээх',
    save: 'Хадгалах',
    cancel: 'Болих',
    edit: 'Засах',
    add: 'Нэмэх',
    delete: 'Устгах',
    close: 'Хаах',
    details: 'Дэлгэрэнгүй',
    onMap: 'Газрын зураг дээр',
    inTwin: 'Дижитал твинд харах',
    noGeom: 'Байршлын өгөгдөл байхгүй',
    history: 'Түүх',
    comment: 'Тайлбар',
    owner: 'Хариуцагч',
    due: 'Хугацаа',
    date: 'Огноо',
    status: 'Төлөв',
    package: 'Багц',
    loading: 'Ачаалж байна…',
    error: 'Алдаа гарлаа',
    forbidden: 'Энэ үйлдлийг хийх эрх таны дүрд алга',
    restricted: 'Хязгаарлагдсан мэдээлэл — эрхгүй',
    days: 'хоног',
  },
  problem: {
    dateOrder: 'Дуусах огноо эхлэхээс өмнө байна',
    required: 'Заавал бөглөнө',
    cycle: 'Хамаарал тойрог үүсгэж байна',
    depMissing: 'Хамаарах ажил олдсонгүй',
    range: 'Утга зөвшөөрөгдөх хязгаараас гадуур',
    fileType: 'Зөвхөн JPG, PNG, WEBP, PDF',
    fileSize: 'Файл 10 МБ-аас их',
    forbidden: 'Эрх хүрэхгүй',
    transition: 'Энэ шилжилт зөвшөөрөгдөхгүй',
  },
};

type Words = typeof mn;
const en: Words = {
  workspace: 'Construction control',
  workspaceSub: 'Workspace',
  section: {
    dashboard: 'Dashboard',
    schedule: 'Schedule',
    progress: 'Progress',
    finance: 'Package finance',
    quality: 'Quality (QA/QC)',
    land: 'Land clearance',
    permits: 'Permits',
    infra: 'Engineering infrastructure',
    iot: 'IoT monitoring',
    esg: 'Benefits to residents',
    docs: 'Feasibility & EIA',
    reports: 'Reports',
    admin: 'Administration',
    approveSchedule: 'Approve schedules',
    variations: 'Approve extra work',
    qualityDocs: 'Quality records',
    materials: 'Material approval',
    project: 'Project details',
    supervision: 'Technical supervision',
    pkgDeps: 'Package dependencies',
    pkgProgress: 'Package progress',
    masterplan: 'Master plan',
    detailplan: 'Detailed plan',
    safety: 'Health & safety',
    risk: 'Risk model',
    suitability: 'Suitability assessment',
    funding: 'Funding',
    workflow: 'Process map',
    sysdocs: 'System documentation',
  },
  group: {mine: 'My work', approve: 'Approve', control: 'Control', smart: 'Smart city', money: 'Finance', report: 'Reports', docs: 'Documents', system: 'System'},
  sub: {zoning: 'Zoning', landuse: 'Land use', limits: 'Building limits', roads: 'Roads', networks: 'Utility networks', blocks: 'Blocks', plots: 'Plots', parameters: 'Building parameters', phasing: 'Phasing'},
  nav: { menu: 'Menu', find: 'Find a section…', none: 'Nothing found', scope: 'Sections assigned to your role', all: 'All sections — administrator', noAccess: 'This section is not assigned to your role', noAccessBody: 'You see only the sections you are appointed to. Only the administrator has every section and the reports.', back: 'Back to the dashboard' },
  demo: {
    title: 'Demonstration data — not a real project',
    body: 'This workspace runs on sample data to show how the system works. Changes you make are kept in this browser only; no server, database or sign-in is connected yet.',
    reset: 'Reset the sample data',
    resetConfirm: 'All changes in this browser will be discarded and the sample data restored. Continue?',
    viewAs: 'View as',
    viewAsNote: 'For checking the interface — not security',
  },
  role: { admin: 'Admin', manager: 'Project manager', engineer: 'Supervising engineer', contractor: 'Contractor', viewer: 'Viewer' },
  filter: { project: 'Project', pkg: 'Package', status: 'Status', from: 'From', to: 'To', org: 'Responsible', all: 'All', clear: 'Clear', search: 'Search…' },
  pkgStatus: { planned: 'Planned', active: 'In progress', done: 'Completed', suspended: 'Suspended' },
  progressState: { draft: 'Draft', submitted: 'Submitted', approved: 'Approved', rejected: 'Rejected' },
  invoiceState: { submitted: 'Submitted', approved: 'Approved', rejected: 'Rejected', paid: 'Paid' },
  issueState: { open: 'Open', review: 'Under review', resolved: 'Resolved' },
  severity: { low: 'Low', medium: 'Medium', high: 'High' },
  safetyKind: { observation: 'Observation', incident: 'Incident', risk: 'Risk assessment', inspection: 'Inspection' },
  parcelStatus: { not_started: 'Not started', negotiating: 'Negotiating', agreed: 'Agreed', cleared: 'Cleared', disputed: 'Disputed' },
  permitStatus: { pending: 'Pending', approved: 'Granted', rejected: 'Rejected', expired: 'Expired' },
  assetKind: { water: 'Water', heat: 'Heating', power: 'Power', sewer: 'Sewer', telecom: 'Telecom', road: 'Road' },
  assetStatus: { planned: 'Planned', ongoing: 'Ongoing', completed: 'Completed', delayed: 'Delayed' },
  docType: { feasibility: 'Feasibility study', eia: 'EIA', permit: 'Permit', contract: 'Contract', drawing: 'Drawing', inspection: 'Inspection record', report: 'Report', other: 'Other' },
  docState: { draft: 'Draft', review: 'Under review', approved: 'Approved', superseded: 'Superseded' },
  common: {
    overdue: 'Overdue',
    soon: 'Due soon',
    none: 'No records',
    unavailable: 'Not available',
    open: 'Open',
    save: 'Save',
    cancel: 'Cancel',
    edit: 'Edit',
    add: 'Add',
    delete: 'Delete',
    close: 'Close',
    details: 'Details',
    onMap: 'On the map',
    inTwin: 'View in the digital twin',
    noGeom: 'No location data',
    history: 'History',
    comment: 'Comment',
    owner: 'Responsible',
    due: 'Due',
    date: 'Date',
    status: 'Status',
    package: 'Package',
    loading: 'Loading…',
    error: 'Something went wrong',
    forbidden: 'Your role may not do this',
    restricted: 'Restricted information — no access',
    days: 'days',
  },
  problem: {
    dateOrder: 'The finish is before the start',
    required: 'Required',
    cycle: 'These dependencies make a loop',
    depMissing: 'Dependency not found',
    range: 'Value out of range',
    fileType: 'JPG, PNG, WEBP or PDF only',
    fileSize: 'File larger than 10 MB',
    forbidden: 'Not permitted',
    transition: 'This step is not allowed',
  },
};

export const useText = () => (useLocale() === 'en' ? en : mn);
export const useEn = () => useLocale() === 'en';
// a section's own extra words: useWords({ mn: {...}, en: {...} })
export function useWords<T>(w: { mn: T; en: T }): T {
  return useLocale() === 'en' ? w.en : w.mn;
}
