'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { Link, usePathname } from '@/i18n/navigation';
import { ProductPanel } from './ProductMenu';

export default function Nav() {
  const t = useTranslations('nav');
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const show = () => {
    clearTimeout(timer.current);
    setOpen(true);
  };
  const hide = (now = false) => {
    clearTimeout(timer.current);
    if (now) setOpen(false);
    else timer.current = setTimeout(() => setOpen(false), 140);
  };

  // close on navigation and on Escape
  useEffect(() => hide(true), [path]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === 'Escape' && hide(true);
    addEventListener('keydown', key);
    return () => removeEventListener('keydown', key);
  }, []);

  const pill = (active: boolean) =>
    `block rounded-full px-4 py-1.5 transition-colors ${active ? 'bg-surface text-fg' : 'text-mute hover:bg-surface/60 hover:text-fg'}`;

  return (
    <nav className="flex items-center gap-x-1 text-sm whitespace-nowrap">
      <Link className={pill(path === '/')} href="/">
        {t('home')}
      </Link>
      <div onMouseEnter={show} onMouseLeave={() => hide()} onFocus={show} onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && hide()}>
        <Link className={pill(path.startsWith('/system') || open)} href="/#overview" aria-expanded={open} aria-haspopup="true">
          {t('products.label')}
          <span aria-hidden="true" className={`ml-1 inline-block text-[10px] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
            ▾
          </span>
        </Link>

        {/* the panel, full width under the header */}
        <div
          className={`fixed inset-x-0 top-16 z-30 border-b border-line/70 bg-ink/95 backdrop-blur-xl transition-[opacity,transform,visibility] duration-200 ease-out ${
            open ? 'visible translate-y-0 opacity-100' : 'invisible -translate-y-2 opacity-0'
          }`}
        >
          <ProductPanel onNavigate={() => hide(true)} />
        </div>
        {/* the page behind dims while the panel is open */}
        <div
          aria-hidden="true"
          onMouseEnter={() => hide(true)}
          className={`fixed inset-x-0 top-16 z-20 h-[100svh] bg-ink/50 backdrop-blur-[2px] transition-opacity duration-200 ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        />
      </div>
      <Link className={pill(path === '/contact')} href="/contact">
        {t('contact')}
      </Link>
    </nav>
  );
}
