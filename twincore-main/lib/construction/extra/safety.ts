// DEMONSTRATION DATA — what the health & safety page keeps beside the shared H&S records: hours worked on site per
// package and month (from the contractors' monthly H&S reports, the basis of the frequency rates), and the log of
// safety briefings, inductions and drills.

export type Month = string; // YYYY-MM

// average daily headcount per package and month; hours = headcount × 26 working days × 10 h
const CREW: Record<string, Record<Month, number>> = {
  'PKG-01': { '2026-01': 38, '2026-02': 44, '2026-03': 62, '2026-04': 70, '2026-05': 82, '2026-06': 90, '2026-07': 96, '2026-08': 102, '2026-09': 108, '2026-10': 104 },
  'PKG-02': { '2026-03': 22, '2026-04': 36, '2026-05': 48, '2026-06': 54, '2026-07': 58, '2026-08': 52, '2026-09': 46, '2026-10': 40 },
  'PKG-03': { '2025-11': 34, '2025-12': 18, '2026-01': 12, '2026-02': 14, '2026-03': 26, '2026-04': 38, '2026-05': 36, '2026-06': 22, '2026-07': 16, '2026-08': 8 },
  'PKG-05': { '2026-04': 14, '2026-05': 20, '2026-06': 26, '2026-07': 34, '2026-08': 42, '2026-09': 46, '2026-10': 44 },
};
export const HOURS: Record<string, Record<Month, number>> = Object.fromEntries(Object.entries(CREW).map(([pkg, m]) => [pkg, Object.fromEntries(Object.entries(m).map(([k, n]) => [k, n * 260]))]));

export type BriefingKind = 'induction' | 'toolbox' | 'drill' | 'training';
export type Briefing = { id: string; date: string; pkg: string; kind: BriefingKind; topic: string; people: number; by: string };

export const BRIEFINGS: Briefing[] = [
  { id: 'TB-1', date: '2026-05-04', pkg: 'PKG-01', kind: 'induction', topic: 'Шинэ ажилтны танилцуулга — талбайн дүрэм', people: 18, by: 'u-a' },
  { id: 'TB-2', date: '2026-06-15', pkg: 'PKG-02', kind: 'toolbox', topic: 'Шуудууны хана нурах эрсдэл', people: 24, by: 'u-b' },
  { id: 'TB-3', date: '2026-07-10', pkg: 'PKG-01', kind: 'training', topic: 'Өндөрт ажиллах — бүсэлүүр, аврах төлөвлөгөө', people: 32, by: 'u-eng' },
  { id: 'TB-4', date: '2026-08-21', pkg: 'PKG-05', kind: 'toolbox', topic: 'Цамхаг кран — дохио, салхины хязгаар', people: 15, by: 'u-d' },
  { id: 'TB-5', date: '2026-09-05', pkg: 'PKG-01', kind: 'drill', topic: 'Галын түгшүүр, нүүлгэн шилжүүлэх дадлага', people: 96, by: 'u-eng' },
  { id: 'TB-6', date: '2026-09-29', pkg: 'PKG-02', kind: 'toolbox', topic: 'Явган хүний хамгаалалт, түр хашлага', people: 21, by: 'u-b' },
  { id: 'TB-7', date: '2026-10-06', pkg: 'PKG-01', kind: 'toolbox', topic: 'Багаж, материал өндрөөс унахаас сэргийлэх', people: 40, by: 'u-a' },
  { id: 'TB-8', date: '2026-10-13', pkg: 'PKG-05', kind: 'training', topic: 'Хүйтний улиралд ажиллах — гагнуур, халаалт', people: 19, by: 'u-d' },
];
