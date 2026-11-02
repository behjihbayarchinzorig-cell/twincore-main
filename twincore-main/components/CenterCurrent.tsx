'use client';

import { useEffect } from 'react';

// Scrolls a horizontal strip ([data-strip]) so its current item sits in the middle — on phones the active
// module would otherwise be off screen.
export default function CenterCurrent() {
  useEffect(() => {
    const strip = document.querySelector<HTMLElement>('[data-strip]');
    const cur = strip?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!strip || !cur || strip.scrollWidth <= strip.clientWidth) return;
    strip.scrollLeft = cur.offsetLeft - (strip.clientWidth - cur.offsetWidth) / 2;
  }, []);
  return null;
}
