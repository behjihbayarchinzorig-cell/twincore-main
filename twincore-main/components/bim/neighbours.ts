import { terrainHeight } from './terrain';

// The city round the site: blocks on a street grid, one to three buildings each, lower towards the edges and
// always lower than the tower so it stays the subject. Deterministic, so every view shows the same city.
// Each entry: x, z (centre), width, height, depth in metres.

const rand = (n: number) => {
  const x = Math.sin(n * 91.3458 + 17.123) * 47453.5453;
  return x - Math.floor(x);
};

// Street centre lines. The main street runs east–west in front of the site (z 31–39).
const STREETS_X = [-250, -190, -130, -70, 70, 130, 190, 250];
const STREETS_Z = [-205, -150, -95, -40, 35, 95, 150, 205];
const STREET = 14; // carriageway and pavements
const RADIUS = 255;

export const CITY_STREETS = { x: STREETS_X, z: STREETS_Z, width: STREET, radius: RADIUS };

function city(): [number, number, number, number, number][] {
  const out: [number, number, number, number, number][] = [];
  const xs = [-RADIUS - 40, ...STREETS_X, RADIUS + 40];
  const zs = [-RADIUS - 40, ...STREETS_Z, RADIUS + 40];
  let n = 0;
  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < zs.length - 1; j++) {
      // the block between two streets each way, less the pavements
      const x0 = xs[i] + STREET / 2 + 3;
      const x1 = xs[i + 1] - STREET / 2 - 3;
      const z0 = zs[j] + STREET / 2 + 3;
      const z1 = zs[j + 1] - STREET / 2 - 3;
      if (x1 - x0 < 16 || z1 - z0 < 16) continue;
      const cx = (x0 + x1) / 2;
      const cz = (z0 + z1) / 2;
      const dist = Math.hypot(cx, cz);
      if (dist > RADIUS + 20) continue;
      // the site's own block stays open: the plot, its forecourt and the car park
      if (Math.abs(cx) < 70 && cz > -40 && cz < 35) continue;
      const parts = 1 + Math.floor(rand(++n) * 3); // 1–3 buildings along the block
      const along = x1 - x0 >= z1 - z0; // split along the longer side
      const len = along ? x1 - x0 : z1 - z0;
      const across = along ? z1 - z0 : x1 - x0;
      const gap = 6;
      const each = (len - gap * (parts - 1)) / parts;
      for (let p = 0; p < parts; p++) {
        const r = rand(++n);
        const w0 = each * (0.75 + rand(++n) * 0.25);
        const d0 = across * (0.55 + rand(++n) * 0.4);
        const c0 = (along ? x0 : z0) + p * (each + gap) + each / 2;
        const c1 = (along ? z0 : x0) + across / 2 + (rand(++n) - 0.5) * (across - d0);
        const [x, z] = along ? [c0, c1] : [c1, c0];
        const [w, d] = along ? [w0, d0] : [d0, w0];
        // nearer blocks rise higher; a few mid-rise towers; nothing reaches the subject (77 m)
        const near = 1 - Math.min(1, dist / RADIUS);
        let h = 9 + r * r * 26 + near * 16;
        if (rand(++n) < 0.12) h = 38 + rand(++n) * 22;
        // the views come in from the south-east: what stands between them and the tower stays low-rise
        const front = x > -40 && z > 30 && Math.abs(x * 178 - z * 150) / Math.hypot(150, 178) < 90;
        if (front) h = 6 + r * 9;
        // keep out of the river valley
        const ground = Math.min(...[[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => terrainHeight(x + (a * w) / 2, z + (b * d) / 2)));
        if (ground < -0.4) continue;
        out.push([Math.round(x), Math.round(z), Math.round(w), Math.round(h), Math.round(d)]);
      }
    }
  }
  return out;
}

export const NEIGHBOURS: [number, number, number, number, number][] = city();

// Lowest ground under a background building's footprint (where it is founded).
export const footing = ([x, z, w, , d]: readonly number[]) =>
  Math.min(...[[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => terrainHeight(x + (a * w) / 2, z + (b * d) / 2)));
