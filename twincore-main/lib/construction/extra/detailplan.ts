// DEMONSTRATION DATA — the detailed plan (хэсэгчилсэн ерөнхий төлөвлөгөө) of the district: blocks, plots (нэгж
// талбар) with their designed building parameters, and the phases they are built in. Plots that sit on a land
// clearance parcel name it, so their land status comes from the shared records. Same frame as the master plan.

import type { Event, Rect } from '../types';
import { centre, inside, type Zone } from './masterplan';

export type Block = { id: string; name: { mn: string; en: string }; r: Rect; zone: string; households: number; residents: number };

export const BLOCKS: Block[] = [
  { id: 'B-1', name: { mn: 'А хэсэг — орон сууцны хороолол', en: 'Part A — housing' }, r: { x: 20, y: 230, w: 165, h: 270 }, zone: 'Z-105', households: 760, residents: 2660 },
  { id: 'B-2', name: { mn: 'Б хэсэг — гудамж, үйлчилгээ', en: 'Part B — street and services' }, r: { x: 187, y: 230, w: 113, h: 270 }, zone: 'Z-105', households: 380, residents: 1330 },
  { id: 'B-3', name: { mn: 'В хэсэг — инженерийн коридор, эрүүл мэнд', en: 'Part C — utility corridor and health' }, r: { x: 330, y: 180, w: 230, h: 140 }, zone: 'Z-104', households: 0, residents: 0 },
  { id: 'B-4', name: { mn: 'Г хэсэг — сургууль, цэцэрлэг', en: 'Part D — school and kindergarten' }, r: { x: 590, y: 260, w: 190, h: 240 }, zone: 'Z-107', households: 0, residents: 0 },
  { id: 'B-5', name: { mn: 'Д хэсэг — дэд станц, худалдааны төв', en: 'Part E — substation and retail centre' }, r: { x: 330, y: 20, w: 230, h: 130 }, zone: 'Z-102', households: 120, residents: 410 },
];

export type PlotUse = 'housing' | 'commercial' | 'school' | 'kindergarten' | 'clinic' | 'utility' | 'parking';
export type Tenure = 'municipal' | 'state' | 'acquired' | 'private';
// building parameters as designed: floors, height m, footprint m², gross floor area m², setback from the red line m,
// parking spaces provided, green space % of the plot; sun: winter-solstice sunlight hours from the BIM sun study (null
// where not yet modelled)
export type Plot = {
  id: string;
  name: { mn: string; en: string };
  r: Rect;
  block: string;
  use: PlotUse;
  tenure: Tenure;
  parcels: string[];
  pkg: string | null;
  phase: string;
  floors: number;
  height: number;
  footprint: number;
  gfa: number;
  setback: number;
  parking: number;
  green: number;
  sun: number | null;
  history: Event[];
};

const ev = (at: string, by: string, action: string, comment?: string): Event => ({ at, by, action, comment });
const ok = ev('2025-09-15', 'u-pm', 'approved', 'ХЕТ-ийн эхний хувилбар');

export const PLOTS: Plot[] = [
  { id: 'НТ-01', name: { mn: 'Блок А — 12 давхар орон сууц', en: 'Block A — 12-storey housing' }, r: { x: 40, y: 240, w: 145, h: 60 }, block: 'B-1', use: 'housing', tenure: 'acquired', parcels: ['NP-101', 'NP-102'], pkg: 'PKG-01', phase: 'PH-1', floors: 12, height: 39.6, footprint: 1450, gfa: 17400, setback: 6, parking: 132, green: 34, sun: 2.6, history: [ok, ev('2026-02-12', 'u-eng', 'height 36 → 39.6', 'Техникийн давхрын өндөр нэмэгдсэн')] },
  { id: 'НТ-02', name: { mn: 'Блок Б — 9 давхар орон сууц', en: 'Block B — 9-storey housing' }, r: { x: 40, y: 310, w: 140, h: 70 }, block: 'B-1', use: 'housing', tenure: 'municipal', parcels: [], pkg: null, phase: 'PH-3', floors: 9, height: 29.7, footprint: 2200, gfa: 19800, setback: 6, parking: 128, green: 31, sun: 2.2, history: [ok] },
  { id: 'НТ-03', name: { mn: 'Блок В — 16 давхар орон сууц', en: 'Block C — 16-storey housing' }, r: { x: 40, y: 390, w: 140, h: 100 }, block: 'B-1', use: 'housing', tenure: 'municipal', parcels: [], pkg: null, phase: 'PH-3', floors: 16, height: 52.8, footprint: 2600, gfa: 41600, setback: 6, parking: 300, green: 28, sun: 1.8, history: [ok] },
  { id: 'НТ-04', name: { mn: 'Үйлчилгээний павильон', en: 'Service pavilion' }, r: { x: 190, y: 370, w: 45, h: 50 }, block: 'B-2', use: 'commercial', tenure: 'acquired', parcels: ['NP-103'], pkg: 'PKG-02', phase: 'PH-1', floors: 2, height: 8, footprint: 810, gfa: 1620, setback: 6, parking: 38, green: 30, sun: null, history: [ok] },
  { id: 'НТ-05', name: { mn: 'Нийтийн зогсоол, ногоон талбай', en: 'Public car park and green' }, r: { x: 237, y: 370, w: 48, h: 50 }, block: 'B-2', use: 'parking', tenure: 'private', parcels: ['NP-104'], pkg: 'PKG-02', phase: 'PH-2', floors: 1, height: 4, footprint: 300, gfa: 300, setback: 8, parking: 60, green: 45, sun: null, history: [ok] },
  { id: 'НТ-06', name: { mn: 'Блок Г — 14 давхар орон сууц', en: 'Block D — 14-storey housing' }, r: { x: 192, y: 240, w: 105, h: 120 }, block: 'B-2', use: 'housing', tenure: 'municipal', parcels: [], pkg: null, phase: 'PH-2', floors: 14, height: 46.2, footprint: 2100, gfa: 29400, setback: 6, parking: 210, green: 35, sun: 2.4, history: [ok] },
  { id: 'НТ-07', name: { mn: 'Усны насос станц, нөөц сав', en: 'Water pumping station and tank' }, r: { x: 360, y: 200, w: 140, h: 90 }, block: 'B-3', use: 'utility', tenure: 'state', parcels: [], pkg: 'PKG-03', phase: 'PH-1', floors: 1, height: 7, footprint: 1100, gfa: 1100, setback: 8, parking: 6, green: 40, sun: null, history: [ok] },
  { id: 'НТ-08', name: { mn: 'Өрхийн эрүүл мэндийн төв', en: 'Family health centre' }, r: { x: 510, y: 190, w: 45, h: 125 }, block: 'B-3', use: 'clinic', tenure: 'municipal', parcels: [], pkg: null, phase: 'PH-2', floors: 3, height: 12, footprint: 1400, gfa: 4200, setback: 6, parking: 11, green: 28, sun: null, history: [ok] },
  { id: 'НТ-09', name: { mn: 'Ерөнхий боловсролын сургууль (960 суудал)', en: 'Secondary school (960 places)' }, r: { x: 600, y: 280, w: 150, h: 110 }, block: 'B-4', use: 'school', tenure: 'acquired', parcels: ['NP-105', 'NP-106'], pkg: 'PKG-04', phase: 'PH-2', floors: 4, height: 16.8, footprint: 3900, gfa: 15600, setback: 10, parking: 40, green: 32, sun: 3.1, history: [ok] },
  { id: 'НТ-10', name: { mn: 'Цэцэрлэг (280 хүүхэд)', en: 'Kindergarten (280 children)' }, r: { x: 600, y: 400, w: 150, h: 90 }, block: 'B-4', use: 'kindergarten', tenure: 'municipal', parcels: [], pkg: 'PKG-04', phase: 'PH-2', floors: 2, height: 8.4, footprint: 2400, gfa: 4800, setback: 10, parking: 16, green: 45, sun: 3.4, history: [ok] },
  { id: 'НТ-11', name: { mn: 'Дулааны дэд станц ДС-7', en: 'Heating substation DS-7' }, r: { x: 360, y: 40, w: 90, h: 80 }, block: 'B-5', use: 'utility', tenure: 'state', parcels: [], pkg: 'PKG-05', phase: 'PH-1', floors: 2, height: 9, footprint: 1300, gfa: 2100, setback: 8, parking: 8, green: 20, sun: null, history: [ok] },
  { id: 'НТ-12', name: { mn: 'Худалдаа, оффисын төв (16 давхар)', en: 'Retail and office centre (16 storeys)' }, r: { x: 460, y: 30, w: 95, h: 115 }, block: 'B-5', use: 'commercial', tenure: 'municipal', parcels: [], pkg: null, phase: 'PH-3', floors: 16, height: 58, footprint: 3800, gfa: 49900, setback: 5, parking: 1180, green: 12, sun: null, history: [ok] },
];

// parking norm: spaces per 100 m² of floor area, by use (БНбД 30-01-04, авто зогсоолын норм — demonstration values)
export const PARKING_PER_100: Record<PlotUse, number> = { housing: 0.7, commercial: 2.5, school: 0.3, kindergarten: 0.3, clinic: 0.3, utility: 0.1, parking: 0 };
export const parkingNeed = (p: Plot) => Math.ceil((p.gfa * PARKING_PER_100[p.use]) / 100);

export type Phase = { id: string; name: { mn: string; en: string }; from: number; to: number; pkgs: string[] };
export const PHASES: Phase[] = [
  { id: 'PH-1', name: { mn: '1-р үе шат — инженерийн бэлтгэл, Блок А', en: 'Phase 1 — utilities and Block A' }, from: 2025, to: 2027, pkgs: ['PKG-01', 'PKG-02', 'PKG-03', 'PKG-05'] },
  { id: 'PH-2', name: { mn: '2-р үе шат — сургууль, цэцэрлэг, эрүүл мэнд', en: 'Phase 2 — school, kindergarten, health' }, from: 2027, to: 2029, pkgs: ['PKG-04'] },
  { id: 'PH-3', name: { mn: '3-р үе шат — орон сууц, худалдааны төв', en: 'Phase 3 — housing and retail centre' }, from: 2029, to: 2031, pkgs: [] },
];
export const PHASE_COLOR: Record<string, string> = { 'PH-1': '#60a5fa', 'PH-2': '#a78bfa', 'PH-3': '#7dd3fc' };

// ---- compliance with the master plan limits ------------------------------------------------------------------------------
export type Verdict = 'pass' | 'warn' | 'fail' | 'na';
// "at most" rules: up to 5 % over is a warning; "at least" rules: down to 90 % of the requirement is a warning
export const atMost = (v: number, lim: number): Verdict => (v <= lim ? 'pass' : v <= lim * 1.05 ? 'warn' : 'fail');
export const atLeast = (v: number, req: number): Verdict => (v >= req ? 'pass' : v >= req * 0.9 ? 'warn' : 'fail');
export const plotArea = (p: Plot) => p.r.w * p.r.h;
export const far = (p: Plot) => p.gfa / plotArea(p);
export const cover = (p: Plot) => (p.footprint / plotArea(p)) * 100;
export const zoneOf = (zones: Zone[], p: Plot) => zones.find((z) => inside(z.r, centre(p.r)));

export type Check = { key: 'far' | 'coverage' | 'height' | 'setback' | 'green' | 'parking'; value: number; limit: number; verdict: Verdict };
export function checkPlot(p: Plot, z: Zone | undefined): Check[] {
  if (!z) return [];
  return [
    { key: 'far', value: far(p), limit: z.far, verdict: atMost(far(p), z.far) },
    { key: 'coverage', value: cover(p), limit: z.coverage, verdict: atMost(cover(p), z.coverage) },
    { key: 'height', value: p.height, limit: z.height, verdict: atMost(p.height, z.height) },
    { key: 'setback', value: p.setback, limit: z.setback, verdict: atLeast(p.setback, z.setback) },
    { key: 'green', value: p.green, limit: z.green, verdict: atLeast(p.green, z.green) },
    { key: 'parking', value: p.parking, limit: parkingNeed(p), verdict: atLeast(p.parking, parkingNeed(p)) },
  ];
}
export const worst = (vs: Verdict[]): Verdict => (vs.includes('fail') ? 'fail' : vs.includes('warn') ? 'warn' : vs.length && vs.some((v) => v === 'pass') ? 'pass' : 'na');
export const VERDICT_COLOR: Record<Verdict, string> = { pass: '#34d399', warn: '#7dd3fc', fail: '#f87171', na: '#8ea6cc' };
