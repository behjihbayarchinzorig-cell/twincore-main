'use client';

import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { BimCanvasProps } from './BimCanvas';

export { VIEWS, type Pose, type ViewName } from './BimCanvas';

function Skeleton() {
  return (
    <div className="shimmer grid h-full w-full place-items-center">
      <div className="h-24 w-16 rounded-sm border border-dashed border-mute/30" />
    </div>
  );
}

const BimCanvas = dynamic(() => import('./BimCanvas'), { ssr: false, loading: Skeleton });

type Props = Omit<BimCanvasProps, 'active' | 'running'> & {
  className?: string;
  children?: ReactNode; // overlays (toolbars, panels) positioned inside the viewport
};

// Viewport frame around the 3D canvas. Mouse: drag orbits straight away, the wheel zooms once you've
// clicked inside. Touch: the page keeps scrolling and taps still pick things; "Tap to explore" turns on orbiting.
export default function BimViewer({ className = 'h-[520px]', children, ...canvas }: Props) {
  const t = useTranslations('bim');
  const box = useRef<HTMLDivElement>(null);
  const [running, setRunning] = useState(true);
  const [active, setActive] = useState(false);
  const [coarse, setCoarse] = useState(false);
  const cover = useRef<HTMLDivElement>(null);
  const down = useRef<{ x: number; y: number; t: number } | null>(null);

  // A short, still tap on the cover is replayed on whatever lies under it, so pins and apartments can be
  // picked without first switching on touch control.
  const tap = (x: number, y: number) => {
    const c = cover.current;
    if (!c) return;
    c.style.pointerEvents = 'none';
    const el = document.elementFromPoint(x, y);
    c.style.pointerEvents = '';
    if (!el || !box.current?.contains(el)) return;
    const init = { clientX: x, clientY: y, bubbles: true, cancelable: true, button: 0, pointerId: 1, pointerType: 'mouse', isPrimary: true };
    el.dispatchEvent(new PointerEvent('pointerdown', init));
    el.dispatchEvent(new PointerEvent('pointerup', init));
    el.dispatchEvent(new MouseEvent('click', init));
  };

  useEffect(() => {
    setCoarse(matchMedia('(pointer: coarse)').matches);
    const io = new IntersectionObserver(([e]) => setRunning(e.isIntersecting), { rootMargin: '100px' });
    if (box.current) io.observe(box.current);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={box}
      className={`relative ${canvas.blend ? '' : 'overflow-hidden rounded-lg border border-line bg-[#0a1222]'} ${className}`}
      onPointerDown={() => !coarse && setActive(true)}
      onPointerLeave={() => !coarse && setActive(false)}
    >
      <div className="animate-arrive h-full w-full">
        <BimCanvas {...canvas} active={active} running={running} />
      </div>
      {children}
      {coarse && !active && (
        // Transparent layer so the page keeps scrolling over the model; a small pill turns on touch control.
        <div
          ref={cover}
          className="absolute inset-0 z-20 flex items-end justify-end p-3 [touch-action:pan-y]"
          onPointerDown={(e) => (down.current = e.target === e.currentTarget ? { x: e.clientX, y: e.clientY, t: e.timeStamp } : null)}
          onPointerCancel={() => (down.current = null)}
          onPointerUp={(e) => {
            const d = down.current;
            down.current = null;
            if (d && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 10 && e.timeStamp - d.t < 500) tap(e.clientX, e.clientY);
          }}
        >
          <button
            type="button"
            onClick={() => setActive(true)}
            className="flex items-center gap-1.5 rounded-full border border-line bg-ink/80 px-3 py-1.5 text-xs text-fg backdrop-blur"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
              <path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v4h-4" />
            </svg>
            {t('explore')}
          </button>
        </div>
      )}
      {coarse && active && (
        <button type="button" onClick={() => setActive(false)} className="absolute right-3 bottom-3 z-20 rounded-full bg-grad px-3 py-1.5 text-xs font-medium text-white">
          {t('done')}
        </button>
      )}
    </div>
  );
}
