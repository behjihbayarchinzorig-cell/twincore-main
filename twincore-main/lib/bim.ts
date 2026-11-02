// A small but structurally plausible BIM model of the sample building, as IFC-typed boxes.
// Axes: x runs west→east (grid A–G), z runs north→south (grid 1–5), y is up. Origin at the plan centre.

import { FLOORS, FLOOR_HEIGHT_M as FH, FOOTPRINT, UNITS } from './twin';

export type Category = 'structure' | 'facade' | 'mep';
export type IfcClass =
  | 'IfcFooting' | 'IfcSlab' | 'IfcColumn' | 'IfcBeam' | 'IfcWall' | 'IfcPlate' | 'IfcMember'
  | 'IfcDuctSegment' | 'IfcPipeSegment' | 'IfcUnitaryEquipment' | 'IfcDoor' | 'IfcRailing';
export type Material = 'concrete' | 'glass' | 'aluminium' | 'galvanised' | 'pipeHot' | 'pipeCold' | 'plant' | 'stone' | 'door';
export type Facade = 'south' | 'east' | 'north' | 'west';

export type Element = {
  index: number;
  guid: string;
  ifc: IfcClass;
  ref: string; // language-neutral reference, e.g. "C-3", "L05", "S-07"
  level: number; // -1 foundation, 0..FLOORS-1 storeys, FLOORS = roof
  category: Category;
  material: Material;
  pos: [number, number, number]; // centre
  size: [number, number, number];
  facade?: Facade;
  unit?: number; // apartment index on that floor (glass panels only)
};

export const X_AXES = ['A', 'B', 'C', 'D', 'E'].map((name, i) => ({ name, x: -16 + i * 8 }));
export const Z_AXES = ['1', '2', '3', '4', '5'].map((name, i) => ({ name, z: -16 + i * 8 }));
export const ROOF_Y = FLOORS * FH;
const SLAB = 0.25;
const FACADE_OFFSET = 0.6; // curtain wall sits outside the perimeter columns
const PANEL = 4; // curtain-wall module width
const SPANDREL_PROUD = 0.14; // spandrel face in front of the glass

// IFC GlobalIds are 22 characters of a base-64 alphabet; derive a stable one per element.
const B64 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$';
const guid = (n: number) => {
  let h = (n + 1) * 2654435761;
  let s = B64[n % 4];
  for (let i = 1; i < 22; i++) {
    h = Math.imul(h ^ (h >>> 15), 2246822519) ^ (i * 3266489917);
    s += B64[(h >>> 7) & 63];
  }
  return s;
};

const pad = (n: number) => String(n).padStart(2, '0');
export const levelName = (l: number) => (l < 0 ? 'B1' : l >= FLOORS ? 'RF' : `L${pad(l + 1)}`);

function build(): Element[] {
  const out: Element[] = [];
  const add = (e: Omit<Element, 'index' | 'guid'>) => out.push({ ...e, index: out.length, guid: guid(out.length) });
  const W = FOOTPRINT.south;
  const D = FOOTPRINT.east;

  add({ ifc: 'IfcFooting', ref: 'RAFT', level: -1, category: 'structure', material: 'concrete', pos: [0, -0.6, 0], size: [W + 3, 1.2, D + 3] });

  for (let l = 0; l <= FLOORS; l++) {
    const y = l * FH;
    // Floor slab (the roof slab at l = FLOORS)
    add({ ifc: 'IfcSlab', ref: levelName(l), level: l, category: 'structure', material: 'concrete', pos: [0, y - SLAB / 2, 0], size: [W + 2 * FACADE_OFFSET, SLAB, D + 2 * FACADE_OFFSET] });
    if (l === FLOORS) break;

    const colH = FH - SLAB;
    const midY = y + colH / 2;
    // Columns at every grid intersection, except inside the core
    for (const ax of X_AXES) {
      for (const az of Z_AXES) {
        if (ax.x === 0 && az.z === 0) continue;
        add({ ifc: 'IfcColumn', ref: `${ax.name}-${az.name}`, level: l, category: 'structure', material: 'concrete', pos: [ax.x, midY, az.z], size: [0.6, colH, 0.6] });
      }
    }
    // Downstand beams carrying the slab above
    const beamY = (l + 1) * FH - SLAB - 0.25;
    for (const az of Z_AXES) {
      for (let i = 0; i < X_AXES.length - 1; i++) {
        const a = X_AXES[i];
        const b = X_AXES[i + 1];
        add({ ifc: 'IfcBeam', ref: `${a.name}–${b.name}/${az.name}`, level: l, category: 'structure', material: 'concrete', pos: [(a.x + b.x) / 2, beamY, az.z], size: [8 - 0.6, 0.5, 0.35] });
      }
    }
    for (const ax of X_AXES) {
      for (let i = 0; i < Z_AXES.length - 1; i++) {
        const a = Z_AXES[i];
        const b = Z_AXES[i + 1];
        add({ ifc: 'IfcBeam', ref: `${ax.name}/${a.name}–${b.name}`, level: l, category: 'structure', material: 'concrete', pos: [ax.x, beamY, (a.z + b.z) / 2], size: [0.35, 0.5, b.z - a.z - 0.6] });
      }
    }
    // Lift and stair core
    const core: [string, [number, number, number], [number, number, number]][] = [
      ['CORE-N', [0, midY, -3], [8, colH, 0.3]],
      ['CORE-S', [0, midY, 3], [8, colH, 0.3]],
      ['CORE-W', [-4, midY, 0], [0.3, colH, 6]],
      ['CORE-E', [4, midY, 0], [0.3, colH, 6]],
    ];
    for (const [ref, pos, size] of core) add({ ifc: 'IfcWall', ref, level: l, category: 'structure', material: 'concrete', pos, size });

    // Curtain wall: 4 m glass panels, 8 per side. Apartments: four south and four north (two panels each),
    // three east and three west (3 + 3 + 2 panels).
    const gy = y + FH / 2;
    const gh = FH - 0.3;
    const zS = D / 2 + FACADE_OFFSET;
    const xE = W / 2 + FACADE_OFFSET;
    const nS = W / PANEL; // 8
    const nE = D / PANEL; // 8
    const side3 = (k: number) => Math.min(2, Math.floor(k / 3));
    for (let k = 0; k < nS; k++) {
      const x = -W / 2 + PANEL / 2 + k * PANEL;
      add({ ifc: 'IfcPlate', ref: `S-${pad(k + 1)}`, level: l, category: 'facade', material: 'glass', facade: 'south', unit: l ? Math.floor(k / 2) : undefined, pos: [x, gy, zS], size: [PANEL, gh, 0.06] });
      add({ ifc: 'IfcPlate', ref: `N-${pad(k + 1)}`, level: l, category: 'facade', material: 'glass', facade: 'north', unit: l ? 7 + Math.floor((nS - 1 - k) / 2) : undefined, pos: [x, gy, -zS], size: [PANEL, gh, 0.06] });
    }
    for (let k = 0; k < nE; k++) {
      const z = D / 2 - PANEL / 2 - k * PANEL;
      add({ ifc: 'IfcPlate', ref: `E-${pad(k + 1)}`, level: l, category: 'facade', material: 'glass', facade: 'east', unit: l ? 4 + side3(k) : undefined, pos: [xE, gy, z], size: [0.06, gh, PANEL] });
      add({ ifc: 'IfcPlate', ref: `W-${pad(k + 1)}`, level: l, category: 'facade', material: 'glass', facade: 'west', unit: l ? 11 + side3(nE - 1 - k) : undefined, pos: [-xE, gy, z], size: [0.06, gh, PANEL] });
    }
    // Spandrel band at the slab edge above. It sits proud of the glass (never in the same plane),
    // otherwise the two surfaces fight in the depth buffer and the façade shimmers while orbiting.
    const sy = (l + 1) * FH;
    const so = SPANDREL_PROUD;
    const sw = W + 2 * (FACADE_OFFSET + so);
    const sd = D + 2 * (FACADE_OFFSET + so);
    add({ ifc: 'IfcMember', ref: `SP-S/${levelName(l)}`, level: l, category: 'facade', material: 'aluminium', pos: [0, sy, zS + so], size: [sw, 0.42, 0.1] });
    add({ ifc: 'IfcMember', ref: `SP-N/${levelName(l)}`, level: l, category: 'facade', material: 'aluminium', pos: [0, sy, -zS - so], size: [sw, 0.42, 0.1] });
    add({ ifc: 'IfcMember', ref: `SP-E/${levelName(l)}`, level: l, category: 'facade', material: 'aluminium', pos: [xE + so, sy, 0], size: [0.1, 0.42, sd] });
    add({ ifc: 'IfcMember', ref: `SP-W/${levelName(l)}`, level: l, category: 'facade', material: 'aluminium', pos: [-xE - so, sy, 0], size: [0.1, 0.42, sd] });

    // Services: risers in the core shaft and a supply duct along the corridor
    add({ ifc: 'IfcPipeSegment', ref: `HW-R/${levelName(l)}`, level: l, category: 'mep', material: 'pipeHot', pos: [2.6, midY, 1.6], size: [0.22, FH, 0.22] });
    add({ ifc: 'IfcPipeSegment', ref: `CW-R/${levelName(l)}`, level: l, category: 'mep', material: 'pipeCold', pos: [3.1, midY, 1.6], size: [0.22, FH, 0.22] });
    add({ ifc: 'IfcDuctSegment', ref: `SA-R/${levelName(l)}`, level: l, category: 'mep', material: 'galvanised', pos: [-2.4, midY, 1.4], size: [1.2, FH, 0.8] });
    add({ ifc: 'IfcDuctSegment', ref: `SA-H/${levelName(l)}`, level: l, category: 'mep', material: 'galvanised', pos: [0, beamY - 0.55, 5.2], size: [W - 4, 0.45, 0.9] });
  }

  // Street level: a stone plinth around the base, the main entrance on the south face, a service door north.
  {
    const zS = D / 2 + FACADE_OFFSET;
    const xE = W / 2 + FACADE_OFFSET;
    const ph = 0.8; // plinth height
    const pt = 0.35; // plinth thickness
    const po = 0.3; // plinth stands proud of the glass line
    const plinth = (ref: string, pos: [number, number, number], size: [number, number, number]) =>
      add({ ifc: 'IfcWall', ref, level: 0, category: 'facade', material: 'stone', pos, size });
    // South plinth leaves a 9 m opening for the entrance; north leaves room for the service door.
    plinth('PLINTH-S1', [-(4.5 + (xE + po - 4.5) / 2), ph / 2, zS + po], [xE + po - 4.5, ph, pt]);
    plinth('PLINTH-S2', [4.5 + (xE + po - 4.5) / 2, ph / 2, zS + po], [xE + po - 4.5, ph, pt]);
    plinth('PLINTH-N1', [-(11 + (xE + po - 11) / 2), ph / 2, -zS - po], [xE + po - 11, ph, pt]);
    plinth('PLINTH-N2', [(xE + po - 9) / 2, ph / 2, -zS - po], [xE + po + 9, ph, pt]);
    plinth('PLINTH-E', [xE + po, ph / 2, 0], [pt, ph, 2 * (zS + po)]);
    plinth('PLINTH-W', [-xE - po, ph / 2, 0], [pt, ph, 2 * (zS + po)]);

    // Main entrance: double doors in a portal frame, a cantilevered canopy, a stone landing and step.
    add({ ifc: 'IfcDoor', ref: 'D-01A', level: 0, category: 'facade', material: 'door', pos: [-0.95, 1.35, zS + 0.12], size: [1.8, 2.7, 0.1] });
    add({ ifc: 'IfcDoor', ref: 'D-01B', level: 0, category: 'facade', material: 'door', pos: [0.95, 1.35, zS + 0.12], size: [1.8, 2.7, 0.1] });
    add({ ifc: 'IfcMember', ref: 'PORTAL-H', level: 0, category: 'facade', material: 'aluminium', pos: [0, 2.88, zS + 0.2], size: [4.6, 0.35, 0.4] });
    add({ ifc: 'IfcMember', ref: 'PORTAL-L', level: 0, category: 'facade', material: 'aluminium', pos: [-2.15, 1.45, zS + 0.2], size: [0.3, 2.9, 0.4] });
    add({ ifc: 'IfcMember', ref: 'PORTAL-R', level: 0, category: 'facade', material: 'aluminium', pos: [2.15, 1.45, zS + 0.2], size: [0.3, 2.9, 0.4] });
    add({ ifc: 'IfcSlab', ref: 'CANOPY', level: 0, category: 'facade', material: 'concrete', pos: [0, 3.42, zS + 1.75], size: [10, 0.26, 3.5] });
    add({ ifc: 'IfcSlab', ref: 'LANDING', level: 0, category: 'facade', material: 'stone', pos: [0, 0.075, zS + 1.35], size: [8, 0.15, 2.3] });
    add({ ifc: 'IfcSlab', ref: 'STEP-01', level: 0, category: 'facade', material: 'stone', pos: [0, 0.04, zS + 3.0], size: [9, 0.08, 1.0] });
    // Service door to the loading area, north side.
    add({ ifc: 'IfcDoor', ref: 'D-02', level: 0, category: 'facade', material: 'door', pos: [-10, 1.2, -zS - 0.12], size: [1.4, 2.4, 0.1] });

    // Balconies: one per apartment on the south face, centred on its two panels.
    for (let l = 1; l < FLOORS; l++) {
      for (let k = 0; k < W / PANEL; k += 2) {
        const x = -W / 2 + PANEL + k * PANEL;
        const front = zS + SPANDREL_PROUD + 0.05; // face of the spandrel band
        add({ ifc: 'IfcSlab', ref: `BAL-${pad(k / 2 + 1)}/${levelName(l)}`, level: l, category: 'facade', material: 'concrete', pos: [x, l * FH - 0.1, front + 0.7], size: [3.6, 0.2, 1.4] });
        add({ ifc: 'IfcRailing', ref: `RL-${pad(k / 2 + 1)}/${levelName(l)}`, level: l, category: 'facade', material: 'glass', pos: [x, l * FH + 0.5, front + 1.37], size: [3.6, 1.0, 0.05] });
      }
    }
  }

  // Roof: parapet and plant
  const py = ROOF_Y + 0.55;
  const zS = FOOTPRINT.east / 2 + FACADE_OFFSET;
  const xE = FOOTPRINT.south / 2 + FACADE_OFFSET;
  add({ ifc: 'IfcWall', ref: 'PARAPET-S', level: FLOORS, category: 'structure', material: 'concrete', pos: [0, py, zS - 0.1], size: [2 * xE, 1.1, 0.2] });
  add({ ifc: 'IfcWall', ref: 'PARAPET-N', level: FLOORS, category: 'structure', material: 'concrete', pos: [0, py, -zS + 0.1], size: [2 * xE, 1.1, 0.2] });
  add({ ifc: 'IfcWall', ref: 'PARAPET-E', level: FLOORS, category: 'structure', material: 'concrete', pos: [xE - 0.1, py, 0], size: [0.2, 1.1, 2 * zS] });
  add({ ifc: 'IfcWall', ref: 'PARAPET-W', level: FLOORS, category: 'structure', material: 'concrete', pos: [-xE + 0.1, py, 0], size: [0.2, 1.1, 2 * zS] });
  add({ ifc: 'IfcUnitaryEquipment', ref: 'AHU-01', level: FLOORS, category: 'mep', material: 'plant', pos: [-8, ROOF_Y + 1.3, -8], size: [6, 2.6, 3.2] });
  add({ ifc: 'IfcUnitaryEquipment', ref: 'CH-01', level: FLOORS, category: 'mep', material: 'plant', pos: [8, ROOF_Y + 1.1, -8], size: [5, 2.2, 3] });
  add({ ifc: 'IfcUnitaryEquipment', ref: 'CT-01', level: FLOORS, category: 'mep', material: 'plant', pos: [10, ROOF_Y + 1.6, 8], size: [3.4, 3.2, 3.4] });
  add({ ifc: 'IfcWall', ref: 'CORE-RF', level: FLOORS, category: 'structure', material: 'concrete', pos: [0, ROOF_Y + 1.6, 0], size: [8.3, 3.2, 6.3] });

  return out;
}

export const ELEMENTS = build();

// Glass panels grouped by apartment, keyed "floor:unit".
export const PANELS_BY_UNIT = (() => {
  const m = new Map<string, number[]>();
  for (const e of ELEMENTS) {
    if (e.unit == null) continue;
    const k = `${e.level}:${e.unit}`;
    m.set(k, [...(m.get(k) ?? []), e.index]);
  }
  return m;
})();

// Outward-facing camera pose for an apartment: stand inside the middle panel, look out.
export function unitViewpoint(floor: number, u: number) {
  const ids = PANELS_BY_UNIT.get(`${floor}:${u}`);
  if (!ids) return null;
  const mid = ELEMENTS[ids[1] ?? ids[0]];
  const n = { south: [0, 1], north: [0, -1], east: [1, 0], west: [-1, 0] }[mid.facade!];
  const eyeY = floor * FH + 1.6;
  return {
    position: [mid.pos[0] - n[0] * 3, eyeY, mid.pos[2] - n[1] * 3] as [number, number, number],
    target: [mid.pos[0] + n[0] * 40, eyeY - 4, mid.pos[2] + n[1] * 40] as [number, number, number],
  };
}

export const ELEMENT_COUNT = ELEMENTS.length;
export const UNITS_PER_FLOOR = UNITS;
