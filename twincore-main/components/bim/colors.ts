import type { Element, Material } from '@/lib/bim';
import type { OpsStatus, UnitStatus } from '@/lib/twin';

// Batch an element is drawn in: solid, glass, a faint "planned" ghost, or not at all.
export type Batch = 'opaque' | 'glass' | 'ghost' | 'hidden';
export type Look = { batch: Batch; color: string };
export type Styler = (e: Element) => Look;

export const MATERIAL_COLOR: Record<Material, string> = {
  concrete: '#d6cfc9',
  glass: '#9fbcc8',
  aluminium: '#7d7672',
  galvanised: '#aab3ba',
  pipeHot: '#d9604e',
  pipeCold: '#6b93c4',
  plant: '#c2bbb4',
  stone: '#8f8681',
  door: '#334155',
};

export const HOVER = '#93c5fd';
export const SELECT = '#3b82f6';
export const ACTIVE = '#60a5fa';

export const UNIT_COLOR: Record<UnitStatus, string> = { free: '#60a5fa', reserved: '#8ea6cc', sold: '#5a4a47' };
export const STATUS_COLOR: Record<OpsStatus, string | null> = { ok: null, service: '#93c5fd', alert: '#ef4444' };

// Cocoa → accent ramp for quantities (low → high).
export const RAMP = ['#172554', '#1e3a8a', '#1e40af', '#60a5fa', '#3b82f6'];
export const ramp = (v: number, lo: number, hi: number) =>
  RAMP[Math.round(Math.min(1, Math.max(0, (v - lo) / (hi - lo))) * (RAMP.length - 1))];

// Default design-model look.
export const designLook = (e: Element): Look => ({
  batch: e.material === 'glass' ? 'glass' : 'opaque',
  color: MATERIAL_COLOR[e.material],
});
