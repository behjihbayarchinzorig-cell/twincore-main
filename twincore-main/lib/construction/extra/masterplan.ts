// DEMONSTRATION DATA — the district's master plan (ерөнхий төлөвлөгөө): zones with their building limits and land-use
// mix, the road hierarchy, and the capacity of the utility networks. Same frame and units as the workspace map
// (800 × 520 m, metres east / south of the north-west corner); the zones are the ones the base-data map shows.
// The detailed plan and the suitability assessment read these limits, so a planner's edit here reaches both.

import type { Event, Line, Rect } from '../types';

export const FRAME = { w: 800, h: 520 };

export type ZoneKind = 'res' | 'com' | 'public' | 'green' | 'ind';
export type Use = 'housing' | 'commercial' | 'social' | 'green' | 'roads' | 'utility';
export const USES: Use[] = ['housing', 'commercial', 'social', 'green', 'roads', 'utility'];

// limits: FAR (gross floor area ÷ plot area), coverage % (footprint ÷ plot area), height m, minimum green %, minimum
// setback from the red line m
export type Zone = {
  id: string;
  kind: ZoneKind;
  name: { mn: string; en: string };
  r: Rect;
  far: number;
  coverage: number;
  height: number;
  green: number;
  setback: number;
  mix: Record<Use, number>; // % of the zone, sums to 100
  history: Event[];
};

const ev = (at: string, by: string, action: string, comment?: string): Event => ({ at, by, action, comment });

export const ZONES: Zone[] = [
  {
    id: 'Z-101',
    kind: 'res',
    name: { mn: 'Хойд орон сууцны хороолол', en: 'North residential quarter' },
    r: { x: 20, y: 20, w: 280, h: 180 },
    far: 3.0,
    coverage: 40,
    height: 45,
    green: 30,
    setback: 6,
    mix: { housing: 58, commercial: 8, social: 6, green: 14, roads: 12, utility: 2 },
    history: [ev('2025-04-18', 'u-pm', 'approved', 'НИТХ-ын тогтоол — ЕТ 2040')],
  },
  {
    id: 'Z-102',
    kind: 'com',
    name: { mn: 'Худалдаа, оффисын төв', en: 'Commercial and office centre' },
    r: { x: 330, y: 20, w: 230, h: 130 },
    far: 4.5,
    coverage: 60,
    height: 60,
    green: 15,
    setback: 5,
    mix: { housing: 10, commercial: 52, social: 4, green: 10, roads: 16, utility: 8 },
    history: [ev('2025-04-18', 'u-pm', 'approved', 'НИТХ-ын тогтоол — ЕТ 2040')],
  },
  {
    id: 'Z-103',
    kind: 'green',
    name: { mn: 'Хорооллын цэцэрлэгт хүрээлэн', en: 'Neighbourhood park' },
    r: { x: 590, y: 20, w: 190, h: 210 },
    far: 0.2,
    coverage: 5,
    height: 6,
    green: 85,
    setback: 10,
    mix: { housing: 0, commercial: 2, social: 3, green: 85, roads: 10, utility: 0 },
    history: [ev('2025-04-18', 'u-pm', 'approved', 'НИТХ-ын тогтоол — ЕТ 2040')],
  },
  {
    id: 'Z-104',
    kind: 'public',
    name: { mn: 'Нийгмийн дэд бүтэц, инженерийн коридор', en: 'Public services and utility corridor' },
    r: { x: 330, y: 180, w: 230, h: 140 },
    far: 2.0,
    coverage: 45,
    height: 24,
    green: 25,
    setback: 6,
    mix: { housing: 0, commercial: 6, social: 38, green: 20, roads: 14, utility: 22 },
    history: [ev('2025-04-18', 'u-pm', 'approved', 'НИТХ-ын тогтоол — ЕТ 2040')],
  },
  {
    id: 'Z-105',
    kind: 'res',
    name: { mn: 'Баруун өмнөд орон сууцны хороолол', en: 'South-west residential quarter' },
    r: { x: 20, y: 230, w: 280, h: 270 },
    far: 2.4,
    coverage: 35,
    height: 38,
    green: 30,
    setback: 6,
    mix: { housing: 54, commercial: 9, social: 5, green: 16, roads: 14, utility: 2 },
    history: [ev('2025-04-18', 'u-pm', 'approved', 'НИТХ-ын тогтоол — ЕТ 2040'), ev('2026-02-12', 'u-eng', 'height 36 → 38', 'Блок А-гийн зураг төслийн экспертизийн дүгнэлтээр')],
  },
  {
    id: 'Z-106',
    kind: 'ind',
    name: { mn: 'Үйлдвэрлэл, агуулахын бүс', en: 'Light industry and storage' },
    r: { x: 330, y: 350, w: 230, h: 150 },
    far: 1.2,
    coverage: 55,
    height: 18,
    green: 15,
    setback: 8,
    mix: { housing: 0, commercial: 12, social: 0, green: 12, roads: 18, utility: 58 },
    history: [ev('2025-04-18', 'u-pm', 'approved', 'НИТХ-ын тогтоол — ЕТ 2040')],
  },
  {
    id: 'Z-107',
    kind: 'res',
    name: { mn: 'Зүүн өмнөд орон сууц, боловсролын хэсэг', en: 'South-east housing and schools' },
    r: { x: 590, y: 260, w: 190, h: 240 },
    far: 2.8,
    coverage: 40,
    height: 42,
    green: 30,
    setback: 6,
    mix: { housing: 44, commercial: 5, social: 22, green: 15, roads: 12, utility: 2 },
    history: [ev('2025-04-18', 'u-pm', 'approved', 'НИТХ-ын тогтоол — ЕТ 2040')],
  },
];

// ---- roads ---------------------------------------------------------------------------------------------------------------
export type RoadClass = 'arterial' | 'collector' | 'local' | 'ped';
export const ROAD_CLASSES: RoadClass[] = ['arterial', 'collector', 'local', 'ped'];
export type RoadState = 'existing' | 'upgrade' | 'new';
// width: between the red lines, m; speed: design speed, km/h; asset: the infrastructure record that builds it, if any
export type Road = { id: string; name: { mn: string; en: string }; cls: RoadClass; line: Line; width: number; lanes: number; speed: number; state: RoadState; pkg?: string; asset?: string };

export const ROADS: Road[] = [
  { id: 'R-1', name: { mn: 'Баруун тойруу магистраль', en: 'West ring arterial' }, cls: 'arterial', line: [[315, 0], [315, 520]], width: 32, lanes: 6, speed: 60, state: 'upgrade' },
  { id: 'R-2', name: { mn: 'Зүүн тойруу магистраль', en: 'East ring arterial' }, cls: 'arterial', line: [[575, 0], [575, 520]], width: 30, lanes: 4, speed: 60, state: 'existing' },
  { id: 'R-3', name: { mn: 'Сургуулийн гудамж', en: 'School street' }, cls: 'collector', line: [[0, 215], [315, 215]], width: 25, lanes: 4, speed: 50, state: 'upgrade', pkg: 'PKG-02' },
  { id: 'R-4', name: { mn: 'Төвийн гудамж', en: 'Centre street' }, cls: 'collector', line: [[315, 165], [575, 165]], width: 25, lanes: 4, speed: 50, state: 'existing' },
  { id: 'R-5', name: { mn: 'Үйлдвэрийн гудамж', en: 'Works street' }, cls: 'collector', line: [[315, 335], [575, 335]], width: 22, lanes: 2, speed: 40, state: 'upgrade' },
  { id: 'R-6', name: { mn: 'Цэцэрлэгт хүрээлэнгийн гудамж', en: 'Park street' }, cls: 'collector', line: [[575, 245], [800, 245]], width: 22, lanes: 2, speed: 40, state: 'new', pkg: 'PKG-04' },
  { id: 'R-7', name: { mn: 'Гудамж 1 — явган зам', en: 'Street 1 — pedestrian way' }, cls: 'local', line: [[190, 470], [280, 470]], width: 12, lanes: 2, speed: 20, state: 'new', pkg: 'PKG-02', asset: 'IN-R1' },
  { id: 'R-8', name: { mn: 'Гудамж 2', en: 'Street 2' }, cls: 'local', line: [[187, 230], [187, 500]], width: 15, lanes: 2, speed: 30, state: 'new', pkg: 'PKG-02' },
  { id: 'R-9', name: { mn: 'Хойд хорооллын дотоод гудамж', en: 'North quarter internal street' }, cls: 'local', line: [[20, 110], [300, 110]], width: 15, lanes: 2, speed: 30, state: 'existing' },
  { id: 'R-10', name: { mn: 'Цэцэрлэгт хүрээлэнгийн явган аллей', en: 'Park promenade' }, cls: 'ped', line: [[600, 40], [690, 125], [770, 215]], width: 8, lanes: 0, speed: 0, state: 'new' },
  { id: 'R-11', name: { mn: 'Сургуулийн явган зам', en: 'School footpath' }, cls: 'ped', line: [[590, 395], [780, 395]], width: 6, lanes: 0, speed: 0, state: 'new', pkg: 'PKG-04' },
];

// ---- utility networks: capacity and today's / design demand, keyed by the infrastructure record ---------------------------
export type NetCap = { capacity: number; demand: number; unit: string; note: { mn: string; en: string } };
export const NETWORKS: Record<string, NetCap> = {
  'IN-W1': { capacity: 2400, demand: 1750, unit: 'м³/хоног', note: { mn: 'Хорооллын хэрэгцээ 2040 он хүртэл хангана', en: 'Covers the district’s demand to 2040' } },
  'IN-W2': { capacity: 900, demand: 610, unit: 'м³/хоног', note: { mn: 'Сургууль, цэцэрлэгийг тэжээнэ', en: 'Supplies the school and kindergarten' } },
  'IN-H1': { capacity: 38, demand: 34.5, unit: 'Гкал/ц', note: { mn: 'Ачаалал 90%-д ойр — 3-р үе шатанд нөөц хүрэхгүй', en: 'Close to 90% load — no spare for phase 3' } },
  'IN-H2': { capacity: 12, demand: 7.8, unit: 'Гкал/ц', note: { mn: 'ДС-7 дэд станцаас салбарлана', en: 'Branches from substation DS-7' } },
  'IN-P1': { capacity: 6.3, demand: 4.1, unit: 'МВА', note: { mn: '10/0.4 кВ дэд станц 2 ширхэг', en: 'Two 10/0.4 kV substations' } },
  'IN-S1': { capacity: 2100, demand: 1580, unit: 'м³/хоног', note: { mn: 'Өөрийн урсгалаар ТЦБ руу', en: 'Gravity flow to the central treatment plant' } },
  'IN-T1': { capacity: 96, demand: 40, unit: 'шилэн утас', note: { mn: 'Шугамын зураг ирээгүй', en: 'Route drawing not yet received' } },
};

// ---- small geometry helpers ------------------------------------------------------------------------------------------------
export const areaHa = (r: Rect) => (r.w * r.h) / 10000;
export const lineLen = (l: Line) => l.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - l[i][0], p[1] - l[i][1]), 0);
export const centre = (r: Rect): [number, number] => [r.x + r.w / 2, r.y + r.h / 2];
export const inside = (r: Rect, p: [number, number]) => p[0] >= r.x && p[0] <= r.x + r.w && p[1] >= r.y && p[1] <= r.y + r.h;
export const zoneAt = (zones: Zone[], r: Rect) => zones.find((z) => inside(z.r, centre(r)));
// shortest distance from a point to a rectangle (0 inside)
export const toRect = (p: [number, number], r: Rect) => Math.hypot(Math.max(r.x - p[0], 0, p[0] - r.x - r.w), Math.max(r.y - p[1], 0, p[1] - r.y - r.h));
// shortest distance from a rectangle to a polyline, sampled every 5 m along the line
export function rectToLine(r: Rect, l: Line) {
  let best = Infinity;
  for (let i = 1; i < l.length; i++) {
    const [a, b] = [l[i - 1], l[i]];
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 5));
    for (let k = 0; k <= n; k++) best = Math.min(best, toRect([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n], r));
  }
  return best;
}
