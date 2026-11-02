import type { Element } from '@/lib/bim';
import { FACADE_LAG, FLOORS, opsStatus, unit, type UnitStatus } from '@/lib/twin';
import { ACTIVE, STATUS_COLOR, UNIT_COLOR, designLook, type Look, type Styler } from './colors';

export type Stage = 'design' | 'build' | 'operate' | 'sell';
export const STAGES: Stage[] = ['design', 'build', 'operate', 'sell'];

const GHOST: Look = { batch: 'ghost', color: '#8ea6cc' };
const HIDDEN: Look = { batch: 'hidden', color: '' };

// 4D: what stands on site when `built` floors of frame are up.
export const buildStyler = (built: number): Styler => {
  const done = Math.floor(built);
  return (e) => {
    if (e.level < 0) return designLook(e);
    if (e.category === 'structure') {
      if (e.level < done) return designLook(e);
      if (e.level === done && built < FLOORS) {
        if (e.ifc === 'IfcSlab') return designLook(e);
        if (e.ifc === 'IfcColumn' || e.ifc === 'IfcWall') return { batch: 'opaque', color: ACTIVE };
      }
      return GHOST;
    }
    if (e.category === 'facade') return e.level < done - FACADE_LAG ? designLook(e) : GHOST;
    return e.level < done - 1 ? designLook(e) : HIDDEN;
  };
};

// Planning: the building exists only as a drawing — every element as an outline, services not yet routed.
export const planStyler: Styler = (e) => (e.category === 'mep' ? HIDDEN : GHOST);
export const PLAN_GHOST = { face: 0.05, edge: 0.55 };
// The drawn building rising out of the plan sheet: levels up to `levels` are drawn, the rest not yet.
export const planRiseStyler = (levels: number): Styler => (e) => (e.category === 'mep' || e.level >= levels ? HIDDEN : GHOST);

// CityGML levels of detail for the same building.
// LOD1: a flat block. LOD2: plus roof structures. LOD3: the full façade. LOD4: the interior too (shown with a cut).
const BLOCK = '#c9c2bc';
export type Lod = 1 | 2 | 3 | 4;
export const lodStyler = (lod: Lod): Styler => (e) => {
  if (lod >= 3) return e.category === 'mep' && lod === 3 ? HIDDEN : designLook(e);
  const roofThing = e.level >= FLOORS; // roof slab, parapets, plant, roof core
  if (roofThing) return lod === 2 || e.ifc === 'IfcSlab' ? { batch: 'opaque', color: BLOCK } : HIDDEN;
  // the envelope only: glass and spandrels read as one surface
  if ((e.ifc === 'IfcPlate' && e.material === 'glass') || e.ref.startsWith('SP-')) return { batch: 'opaque', color: BLOCK };
  return HIDDEN;
};

// Facade tinted per level (operations dashboards).
export const levelTintStyler = (tint: (level: number) => string | null): Styler => (e) => {
  if (e.category === 'facade' && e.level >= 0) {
    const c = tint(e.level);
    if (c) return { batch: 'opaque', color: c };
  }
  return designLook(e);
};

// Facade panels coloured by apartment status; `match` dims apartments outside the filter.
export const salesStyler = (match: (status: UnitStatus, rooms: number) => boolean = () => true): Styler => (e) => {
  if (e.material === 'glass' && e.unit != null) {
    const u = unit(e.level, e.unit);
    if (u) return { batch: 'opaque', color: match(u.status, u.rooms) ? UNIT_COLOR[u.status] : '#16233d' };
  }
  return designLook(e);
};

export const stageStyler = (stage: Stage, built: number): Styler =>
  stage === 'build'
    ? buildStyler(built)
    : stage === 'operate'
      ? levelTintStyler((l) => STATUS_COLOR[opsStatus(l)])
      : stage === 'sell'
        ? salesStyler()
        : designLook;

export const sameUnit = (a: Element, b: Element) => a.unit != null && a.unit === b.unit && a.level === b.level;
export const sameLevel = (a: Element, b: Element) => a.level === b.level;

// 4D on the construction page, as the building really goes up, one phase after another: the foundation, then the
// frame (columns, beams, slabs) floor by floor, then the outer walls, then the windows — and it is done. Driven by
// overall progress `p` (0 … 100). Only whole floors change, so the model is restyled once per floor, not every frame.
export type BuildPhase = 'dig' | 'raft' | 'frame' | 'envelope' | 'windows' | 'done';
const PHASE: Record<'raft' | 'frame' | 'envelope' | 'windows', [number, number]> = { raft: [8, 20], frame: [20, 60], envelope: [60, 80], windows: [80, 97] };
const LEVELS = FLOORS + 1; // ground floor to roof
const levelsBy = (p: number, [a, b]: [number, number]) => Math.floor(Math.min(1, Math.max(0, (p - a) / (b - a))) * LEVELS);

export function buildPhase(p: number) {
  const frame = levelsBy(p, PHASE.frame);
  const envelope = levelsBy(p, PHASE.envelope);
  const windows = levelsBy(p, PHASE.windows);
  const raft = p >= (PHASE.raft[0] + PHASE.raft[1]) / 2;
  const phase: BuildPhase =
    p >= PHASE.windows[1] ? 'done' : p >= PHASE.windows[0] ? 'windows' : p >= PHASE.envelope[0] ? 'envelope' : p >= PHASE.frame[0] ? 'frame' : p >= PHASE.raft[0] ? 'raft' : 'dig';
  // the floor being worked on, for the caption
  const floor = Math.min(LEVELS, (phase === 'frame' ? frame : phase === 'envelope' ? envelope : windows) + 1);
  return { phase, frame, envelope, windows, raft, floor, key: `${frame}:${envelope}:${windows}:${raft ? 1 : 0}:${phase === 'done' ? 1 : 0}` };
}

export const phaseStyler = (b: ReturnType<typeof buildPhase>): Styler => (e) => {
  if (b.phase === 'done') return designLook(e);
  if (e.level < 0) return b.raft ? designLook(e) : HIDDEN; // the raft foundation
  if (e.category === 'structure') return e.level < b.frame ? designLook(e) : HIDDEN;
  // glass and doors go in last; the rest of the façade (spandrels, stone plinth, entrance canopy) is the outer wall
  if (e.category === 'facade') return (e.material === 'glass' || e.material === 'door' ? e.level < b.windows : e.level < b.envelope) ? designLook(e) : HIDDEN;
  return e.level < b.windows ? designLook(e) : HIDDEN; // services, closed in with the windows
};
