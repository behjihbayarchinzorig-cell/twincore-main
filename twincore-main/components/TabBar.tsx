'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState, type ReactNode } from 'react';
import { Link, usePathname } from '@/i18n/navigation';
import { ProductAccordion } from './ProductMenu';

// Phone navigation: a bottom tab bar within thumb reach, as in a native app. Hidden from the md breakpoint up.
// The system tab opens the products menu as a sheet (the phone form of the header's Mapbox-style menu).
const ICON: Record<string, ReactNode> = {
  home: <path d="M4 11.5 12 5l8 6.5V20h-5.5v-5h-5v5H4z" />,
  system: <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12v9M12 12L4 7.5" />,
  contact: <path d="M6.5 4h3l1.5 4-2 1.2a10 10 0 0 0 5.8 5.8L16 13l4 1.5v3A2.5 2.5 0 0 1 17.5 20 13.5 13.5 0 0 1 4 6.5 2.5 2.5 0 0 1 6.5 4z" />,
};

const TABS = [
  { key: 'home', href: '/' },
  { key: 'system', href: '/#overview' },
  { key: 'contact', href: '/contact' },
] as const;

export default function TabBar() {
  const t = useTranslations('tabs');
  const tp = useTranslations('nav.products');
  const tc = useTranslations('bim');
  const path = usePathname();
  const [menu, setMenu] = useState(false);
  useEffect(() => setMenu(false), [path]);
  useEffect(() => {
    if (!menu) return;
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false);
    addEventListener('keydown', key);
    document.body.style.overflow = 'hidden';
    return () => {
      removeEventListener('keydown', key);
      document.body.style.overflow = '';
    };
  }, [menu]);

  return (
    <>
      {menu && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label={tp('label')}>
          <div className="absolute inset-0 bg-navy/40" onClick={() => setMenu(false)} />
          <div className="animate-fade-in absolute inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] flex max-h-[80svh] flex-col rounded-t-3xl border-t border-line bg-ink shadow-[0_-20px_60px_-20px_rgba(37,99,235,0.35)]">
            {/* the handle, the title, a round close button */}
            <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-line" aria-hidden="true" />
            <div className="flex items-center justify-between px-4 pt-3 pb-3">
              <p className="text-base font-medium text-fg">{tp('label')}</p>
              <button type="button" onClick={() => setMenu(false)} aria-label={tc('props.clear')} className="grid h-10 w-10 cursor-pointer place-items-center rounded-full border border-line text-fg/85">
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
                  <path d="M3 3l10 10M13 3L3 13" />
                </svg>
              </button>
            </div>
            <div data-lenis-prevent className="no-scrollbar overflow-y-auto overscroll-contain px-4 pb-4">
              <ProductAccordion onNavigate={() => setMenu(false)} />
            </div>
          </div>
        </div>
      )}
      <nav
        aria-label={t('label')}
        className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-ink/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
      >
        <ul className="grid grid-cols-3">
          {TABS.map(({ key, href }) => {
            const on =
              key === 'home' ? path === '/' : key === 'system' ? path.startsWith('/system') || path.startsWith('/construction') : path.startsWith(href);
            return (
              <li key={key}>
                {key === 'system' ? (
                  <button
                    type="button"
                    onClick={() => setMenu((m) => !m)}
                    aria-expanded={menu}
                    aria-current={on ? 'page' : undefined}
                    className={`flex h-16 w-full flex-col items-center justify-center gap-1 text-[11px] transition-colors ${on || (key === 'system' && menu) ? 'text-accent' : 'text-mute active:text-fg'}`}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="h-6 w-6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.7}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      {ICON[key]}
                    </svg>
                    {t(key)}
                  </button>
                ) : (
                  <Link
                    href={href}
                    aria-current={on ? 'page' : undefined}
                    className={`flex h-16 w-full flex-col items-center justify-center gap-1 text-[11px] transition-colors ${on ? 'text-accent' : 'text-mute active:text-fg'}`}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="h-6 w-6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.7}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      {ICON[key]}
                    </svg>
                    {t(key)}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
