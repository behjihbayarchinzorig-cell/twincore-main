// Terrain around the site for the risk simulations: a river valley to the north, a floodplain, hills beyond.
// The plot, the street and the blocks around them stay level (height 0) so the model sits on flat ground.
// The same function exists in TypeScript (for placing things and computing flood figures) and GLSL (for the water).

export const RIVER_LEVEL = -3.6; // normal water surface in the river, metres
const CORE = { x0: -165, x1: 185, z0: -58, z1: 62 }; // level ground: plot, street, nearby blocks

const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

export const riverCentre = (x: number) => -118 + 16 * Math.sin(x / 85) + 6 * Math.sin(x / 31);

export function terrainHeight(x: number, z: number) {
  const zc = riverCentre(x);
  const d = Math.abs(z - zc);
  // channel and a wide, shallow floodplain either side of it
  const channel = -6.2 * Math.exp(-((d / 15) ** 2));
  const plain = -2.2 * Math.exp(-((d / 48) ** 2));
  // hills to the north, a gentle rise to the south, some undulation everywhere
  const hills = Math.max(0, -z - 175) * 0.16 + 3 * Math.sin(x / 55) * smooth(-175, -260, z);
  const south = Math.max(0, z - 90) * 0.05;
  const roll = 1.2 * Math.sin(x / 47 + 1.3) * Math.cos(z / 63);
  const raw = channel + plain + hills + south + roll;
  // fade to perfectly level inside the core
  const dx = Math.max(CORE.x0 - x, 0, x - CORE.x1);
  const dz = Math.max(CORE.z0 - z, 0, z - CORE.z1);
  return raw * smooth(0, 30, Math.hypot(dx, dz));
}

// GLSL twin of terrainHeight (keep in step with the function above).
export const TERRAIN_GLSL = /* glsl */ `
float tSmooth(float e0, float e1, float x) { float t = clamp((x - e0) / (e1 - e0), 0.0, 1.0); return t * t * (3.0 - 2.0 * t); }
float terrainHeight(float x, float z) {
  float zc = -118.0 + 16.0 * sin(x / 85.0) + 6.0 * sin(x / 31.0);
  float d = abs(z - zc);
  float channel = -6.2 * exp(-pow(d / 15.0, 2.0));
  float plain = -2.2 * exp(-pow(d / 48.0, 2.0));
  float hills = max(0.0, -z - 175.0) * 0.16 + 3.0 * sin(x / 55.0) * tSmooth(-175.0, -260.0, z);
  float south = max(0.0, z - 90.0) * 0.05;
  float roll = 1.2 * sin(x / 47.0 + 1.3) * cos(z / 63.0);
  float raw = channel + plain + hills + south + roll;
  float dx = max(max(${CORE.x0.toFixed(1)} - x, 0.0), x - ${CORE.x1.toFixed(1)});
  float dz = max(max(${CORE.z0.toFixed(1)} - z, 0.0), z - ${CORE.z1.toFixed(1)});
  return raw * tSmooth(0.0, 30.0, length(vec2(dx, dz)));
}`;

// Land newly under water (m²) when the surface is `level` metres above the river's normal level, over a
// 600 × 600 m study area sampled on a 5 m grid. The river's own bed isn't counted.
export function floodedArea(level: number) {
  const y = RIVER_LEVEL + level;
  let cells = 0;
  for (let x = -300; x < 300; x += 5)
    for (let z = -300; z < 300; z += 5) {
      const h = terrainHeight(x, z);
      if (h >= RIVER_LEVEL && h < y - 0.05) cells++;
    }
  return cells * 25;
}
