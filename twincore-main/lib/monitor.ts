// Sample data for the construction monitoring module: IoT sensors on the building under construction, site
// activity, and alerts. Readings move over time (deterministically) so the page feels live.

import { BUILT, FLOORS, FLOOR_HEIGHT_M } from './twin';

export type SensorKind = 'crane' | 'concrete' | 'settlement' | 'tilt' | 'dust' | 'noise';
export type Sensor = {
  id: string;
  kind: SensorKind;
  pos: [number, number, number]; // world position on the model
  unit: string;
  warn: number; // reading at which it turns amber
  alarm: number; // and red
  base: number; // typical reading
  swing: number; // how much it moves
  period: number; // seconds per cycle
};

const top = Math.floor(BUILT) * FLOOR_HEIGHT_M;

export const SENSORS: Sensor[] = [
  { id: 'CR-01', kind: 'crane', pos: [25, FLOORS * FLOOR_HEIGHT_M + 14.1, -22], unit: '%', warn: 85, alarm: 95, base: 62, swing: 30, period: 9 },
  { id: 'CT-07', kind: 'concrete', pos: [6, top + 0.4, 5], unit: '°C', warn: 60, alarm: 70, base: 48, swing: 10, period: 14 },
  { id: 'CT-08', kind: 'concrete', pos: [-9, top + 0.4, -6], unit: '°C', warn: 60, alarm: 70, base: 55, swing: 14, period: 11 },
  { id: 'ST-02', kind: 'settlement', pos: [16, 0.6, 16], unit: 'mm', warn: 15, alarm: 25, base: 8, swing: 3, period: 20 },
  { id: 'ST-04', kind: 'settlement', pos: [-16, 0.6, -16], unit: 'mm', warn: 15, alarm: 25, base: 12, swing: 5, period: 17 },
  { id: 'TL-01', kind: 'tilt', pos: [16, top - 2, -16], unit: '‰', warn: 1.5, alarm: 2.5, base: 0.6, swing: 0.5, period: 13 },
  { id: 'DS-03', kind: 'dust', pos: [30, 3, 24], unit: 'µg/m³', warn: 150, alarm: 250, base: 110, swing: 90, period: 8 },
  { id: 'NS-01', kind: 'noise', pos: [-30, 3, 24], unit: 'dB', warn: 75, alarm: 85, base: 68, swing: 12, period: 6 },
];

// A reading at time t (seconds): a slow wave plus a faster flutter.
export function reading(s: Sensor, t: number) {
  const seed = s.id.charCodeAt(3) + s.id.charCodeAt(4);
  return s.base + s.swing * (0.6 * Math.sin((t / s.period) * 2 * Math.PI + seed) + 0.4 * Math.sin((t / (s.period * 0.37)) * 2 * Math.PI + seed * 2));
}

export type Level = 'ok' | 'warn' | 'alarm';
export const level = (s: Sensor, v: number): Level => (v >= s.alarm ? 'alarm' : v >= s.warn ? 'warn' : 'ok');
export const LEVEL_COLOR: Record<Level, string> = { ok: '#7fa36a', warn: '#38bdf8', alarm: '#ef4444' };
