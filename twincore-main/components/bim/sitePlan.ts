// The site plan drawn as an SVG sheet in world coordinates, so it can be laid on the ground in the 3D scene.
// x runs west→east, z north→south (north is the top of the sheet), 1 m = PX px.

import { FOOTPRINT } from '@/lib/twin';

// Covers the plot only, stopping short of the pavement so the street stays clear.
export const SHEET = { x0: -44, z0: -34, w: 88, d: 63 }; // metres covered by the sheet
const PX = 16;
const X = (m: number) => (m - SHEET.x0) * PX;
const Z = (m: number) => (m - SHEET.z0) * PX;
const INK = '#eaf2fb'; // white linework on blueprint blue
const FAINT = '#eaf2fb73';

export function sitePlanSvg() {
  const w = FOOTPRINT.south / 2;
  const d = FOOTPRINT.east / 2;
  const xs = Array.from({ length: 7 }, (_, i) => -24 + i * 8);
  const zs = Array.from({ length: 5 }, (_, i) => -18 + i * 9);
  const bays = [...Array.from({ length: 12 }, (_, i) => -37.4 + i * 2.75), ...Array.from({ length: 12 }, (_, i) => 7.1 + i * 2.75)];
  const W = SHEET.w * PX;
  const H = SHEET.d * PX;
  const o: string[] = [];
  const line = (x1: number, z1: number, x2: number, z2: number, attrs = '') =>
    o.push(`<line x1="${X(x1)}" y1="${Z(z1)}" x2="${X(x2)}" y2="${Z(z2)}" ${attrs}/>`);
  const text = (x: number, z: number, s: string, size: number, attrs = '') =>
    o.push(`<text x="${X(x)}" y="${Z(z)}" font-size="${size}" fill="${INK}" text-anchor="middle" font-family="Arial, sans-serif" ${attrs}>${s}</text>`);

  o.push(`<rect width="${W}" height="${H}" fill="#1e4a78"/>`);
  // fine blueprint grid, 2 m
  for (let gx = 0; gx <= W; gx += 2 * PX) o.push(`<line x1="${gx}" y1="0" x2="${gx}" y2="${H}" stroke="#ffffff" stroke-opacity=".07" stroke-width="1"/>`);
  for (let gy = 0; gy <= H; gy += 2 * PX) o.push(`<line x1="0" y1="${gy}" x2="${W}" y2="${gy}" stroke="#ffffff" stroke-opacity=".07" stroke-width="1"/>`);
  o.push(`<rect x="${PX * 1.5}" y="${PX * 1.5}" width="${W - PX * 3}" height="${H - PX * 3}" fill="none" stroke="${INK}" stroke-width="5"/>`);
  // site boundary
  o.push(`<rect x="${X(-40)}" y="${Z(-30)}" width="${80 * PX}" height="${60 * PX}" fill="none" stroke="${INK}" stroke-width="4" stroke-dasharray="40 16"/>`);
  // parking bays
  for (const x of bays) o.push(`<rect x="${X(x)}" y="${Z(20.6)}" width="${2.75 * PX}" height="${5 * PX}" fill="none" stroke="${FAINT}" stroke-width="2.5"/>`);
  // structural grid with bubbles
  xs.forEach((x, i) => {
    line(x, -d - 5, x, d + 1.5, `stroke="${FAINT}" stroke-width="2.5" stroke-dasharray="44 10 6 10"`);
    o.push(`<circle cx="${X(x)}" cy="${Z(-d - 7.5)}" r="${2.2 * PX}" fill="none" stroke="${INK}" stroke-width="3"/>`);
    text(x, -d - 6.4, 'ABCDEFG'[i], 30);
  });
  zs.forEach((z, i) => {
    line(-w - 5, z, w + 1.5, z, `stroke="${FAINT}" stroke-width="2.5" stroke-dasharray="44 10 6 10"`);
    o.push(`<circle cx="${X(-w - 7.5)}" cy="${Z(z)}" r="${2.2 * PX}" fill="none" stroke="${INK}" stroke-width="3"/>`);
    text(-w - 7.5, z + 1.1, String(i + 1), 30);
  });
  // building: outline, columns, core, entrance
  o.push(`<rect x="${X(-w)}" y="${Z(-d)}" width="${w * 2 * PX}" height="${d * 2 * PX}" fill="#ffffff14" stroke="${INK}" stroke-width="9"/>`);
  for (const x of xs)
    for (const z of zs) if (!(x === 0 && z === 0)) o.push(`<rect x="${X(x) - 6}" y="${Z(z) - 6}" width="12" height="12" fill="${INK}"/>`);
  o.push(`<rect x="${X(-4)}" y="${Z(-3)}" width="${8 * PX}" height="${6 * PX}" fill="#ffffff22" stroke="${INK}" stroke-width="4"/>`);
  line(-4, -3, 4, 3, `stroke="${INK}" stroke-width="2.5"`);
  line(4, -3, -4, 3, `stroke="${INK}" stroke-width="2.5"`);
  line(-2.2, d, 2.2, d, `stroke="#1e4a78" stroke-width="12"`);
  o.push(`<path d="M${X(-2.2)} ${Z(d)} a ${2.2 * PX} ${2.2 * PX} 0 0 0 ${2.2 * PX} ${2.2 * PX}" fill="none" stroke="#3b82f6" stroke-width="3"/>`);
  o.push(`<path d="M${X(2.2)} ${Z(d)} a ${2.2 * PX} ${2.2 * PX} 0 0 1 ${-2.2 * PX} ${2.2 * PX}" fill="none" stroke="#3b82f6" stroke-width="3"/>`);
  // dimensions
  line(-w, -d - 13, w, -d - 13, `stroke="${INK}" stroke-width="3"`);
  line(-w, -d - 14.5, -w, -d - 11.5, `stroke="${INK}" stroke-width="3"`);
  line(w, -d - 14.5, w, -d - 11.5, `stroke="${INK}" stroke-width="3"`);
  text(0, -d - 14, `${FOOTPRINT.south.toFixed(1)} m`, 36);
  line(w + 10, -d, w + 10, d, `stroke="${INK}" stroke-width="3"`);
  line(w + 8.5, -d, w + 11.5, -d, `stroke="${INK}" stroke-width="3"`);
  line(w + 8.5, d, w + 11.5, d, `stroke="${INK}" stroke-width="3"`);
  o.push(
    `<text x="${X(w + 12.2)}" y="${Z(0)}" font-size="36" fill="${INK}" text-anchor="middle" font-family="Arial, sans-serif" transform="rotate(90 ${X(w + 12.2)} ${Z(0)})">${FOOTPRINT.east.toFixed(1)} m</text>`,
  );
  // north arrow
  o.push(
    `<g transform="translate(${X(38)} ${Z(-26)})"><circle r="40" fill="none" stroke="${INK}" stroke-width="3"/><path d="M0 -34 L16 18 L0 8 L-16 18 Z" fill="${INK}"/></g>`,
  );
  // title block
  o.push(`<rect x="${X(-43)}" y="${Z(-33.2)}" width="${14.5 * PX}" height="${2.7 * PX}" fill="none" stroke="${INK}" stroke-width="3"/>`);
  o.push(
    `<text x="${X(-42.4)}" y="${Z(-31.4)}" font-size="26" fill="${INK}" font-family="Arial, sans-serif">TwinCore · A-101 · 1:500</text>`,
  );

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${o.join('')}</svg>`;
}
