// The district map shared by the base-data map and the construction workspace: a district of central Ulaanbaatar,
// east of Sükhbaatar Square. Map units are metres east / south of the north-west corner of an 800 × 520 m frame.

export const CENTRE: [number, number] = [47.9178, 106.9235];
const M_LAT = 1 / 111320;
const M_LNG = 1 / (111320 * Math.cos((CENTRE[0] * Math.PI) / 180));
export const ll = (x: number, y: number): [number, number] => [CENTRE[0] + (260 - y) * M_LAT, CENTRE[1] + (x - 400) * M_LNG];
export const rect = (x: number, y: number, w: number, h: number): [number, number][] => [ll(x, y), ll(x + w, y), ll(x + w, y + h), ll(x, y + h)];
