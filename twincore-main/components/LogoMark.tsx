// TwinCore mark: three rising towers drawn in isometric, with two ribbons (the twin) sweeping up across them —
// in front of the two shorter towers, behind the tall one, their tips curling out past its far side.
// Redrawn from the concept in the site palette: rose outlines, cocoa faces, accent for the tall tower and ribbons.

type Box = { cx: number; by: number; h: number; top: string; left: string; right: string };

const A = 6.2; // half width of a tower's footprint (isometric)

const SMALL: Box = { cx: 11.5, by: 44, h: 13, top: '#8ea6cc', left: '#1a2a47', right: '#3f3231' };
const MID: Box = { cx: 23.5, by: 44, h: 21, top: '#93c5fd', left: '#1e3a5f', right: '#463634' };
const TALL: Box = { cx: 35.5, by: 44, h: 31, top: '#60a5fa', left: '#3b82f6', right: '#1e40af' };

const pts = (...p: [number, number][]) => p.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');

function Tower({ cx, by, h, top, left, right }: Box) {
  const fb: [number, number] = [cx, by];
  const lb: [number, number] = [cx - A, by - A / 2];
  const rb: [number, number] = [cx + A, by - A / 2];
  const ft: [number, number] = [cx, by - h];
  const lt: [number, number] = [cx - A, by - A / 2 - h];
  const rt: [number, number] = [cx + A, by - A / 2 - h];
  const bt: [number, number] = [cx, by - A - h];
  return (
    <g strokeLinejoin="round">
      <polygon points={pts(lb, fb, ft, lt)} fill={left} />
      <polygon points={pts(fb, rb, rt, ft)} fill={right} />
      <polygon points={pts(lt, ft, rt, bt)} fill={top} />
      {/* one window slot per face keeps it reading as a building at small sizes */}
      <line x1={cx - A / 2} y1={by - A / 4 - 2} x2={cx - A / 2} y2={by - A / 4 - h + 2.5} stroke="#060b18" strokeOpacity=".3" strokeWidth=".9" />
      <line x1={cx + A / 2} y1={by - A / 4 - 2} x2={cx + A / 2} y2={by - A / 4 - h + 2.5} stroke="#060b18" strokeOpacity=".3" strokeWidth=".9" />
      <polygon points={pts(lb, fb, rb, rt, bt, lt)} fill="none" stroke="#8ea6cc" strokeWidth=".9" />
      <line x1={fb[0]} y1={fb[1]} x2={ft[0]} y2={ft[1]} stroke="#8ea6cc" strokeWidth=".6" />
    </g>
  );
}

// Tapered ribbons: thin at both ends, fullest in the middle. A dark outline painted under the fill cuts the gap.
const RIBBONS = [
  { d: 'M2.5 40.5 C 14 37, 25 30, 32 21.5 C 36 16, 40 10, 45.5 5.5 C 42.5 10.5, 39.5 16.5, 35 23 C 28 32, 17 39.5, 2.5 40.5 Z', fill: '#3b82f6' },
  { d: 'M5.5 45.5 C 17.5 41.5, 28.5 34.5, 36 25.5 C 40 20, 43.5 15, 47 11 C 44.5 16, 41.5 21.5, 38 27 C 31 36, 20 44, 5.5 45.5 Z', fill: '#60a5fa' },
];

export default function LogoMark({ className = 'h-7 w-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <Tower {...SMALL} />
      <Tower {...MID} />
      {RIBBONS.map((r) => (
        <path key={r.d} d={r.d} fill={r.fill} stroke="#060b18" strokeWidth="1.4" strokeLinejoin="round" paintOrder="stroke" />
      ))}
      {/* the tall tower stands in front, so the ribbons wrap behind it */}
      <Tower {...TALL} />
      {/* the ribbon tips reappear past its far side */}
      <path d="M41.2 12.6 C 42.6 10.6, 44 8, 45.5 5.5 C 44.6 8.4, 43.4 10.9, 41.9 13.6 Z" fill="#3b82f6" />
      <path d="M41.9 20.4 C 43.6 17.4, 45.2 14.2, 47 11 C 46.1 14.4, 44.6 17.8, 42.6 21.4 Z" fill="#60a5fa" />
    </svg>
  );
}
