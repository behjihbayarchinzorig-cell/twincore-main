'use client';

import Lenis from 'lenis';
import { useEffect } from 'react';

// Smooth, inertial page scrolling (Lenis). The 3D view, the maps and anything marked data-lenis-prevent keep the wheel
// for themselves (zooming), and people who prefer reduced motion get the browser's own scrolling.
export default function SmoothScroll() {
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const lenis = new Lenis({
      autoRaf: true,
      lerp: 0.1,
      prevent: (node) => !!node.closest?.('canvas, .leaflet-container, [data-lenis-prevent]'),
    });
    // in-page links (#section) glide there too
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest?.('a[href^="#"]') as HTMLAnchorElement | null;
      if (!a) return;
      const el = document.getElementById(decodeURIComponent(a.hash.slice(1)));
      if (!el) return;
      e.preventDefault();
      lenis.scrollTo(el, { offset: -80 });
    };
    document.addEventListener('click', onClick);
    return () => {
      document.removeEventListener('click', onClick);
      lenis.destroy();
    };
  }, []);
  return null;
}
