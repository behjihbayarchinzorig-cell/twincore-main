'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { usePathname, useRouter } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { readPersistent, writePersistent } from '@/lib/persist';
import Flag from './Flag';

const SCROLL_KEY = 'lang.scroll';

// One button: shows the current language's flag and switches to the other language on the same page.
// Demo state is kept by usePersistentState; the reading position is kept here.
export default function LangToggle() {
  const t = useTranslations('lang');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const [pending, start] = useTransition();
  const [target, setTarget] = useState(locale);
  // Show the new flag straight away while the page re-renders in the other language.
  const shown = pending ? target : locale;
  const next = routing.locales[(routing.locales.indexOf(locale) + 1) % routing.locales.length];

  // Back at the same reading position after the switch.
  useEffect(() => {
    const y = readPersistent<number | null>(SCROLL_KEY);
    if (y == null) return;
    writePersistent(SCROLL_KEY, null);
    requestAnimationFrame(() => window.scrollTo({ top: y, behavior: 'instant' }));
  }, [locale]);

  const flip = () => {
    setTarget(next);
    writePersistent(SCROLL_KEY, window.scrollY);
    start(() => {
      // @ts-expect-error -- params always match the current pathname
      router.replace({ pathname, params }, { locale: next, scroll: false });
    });
  };

  return (
    <button
      type="button"
      onClick={flip}
      aria-label={t('label')}
      title={t('label')}
      disabled={pending}
      className="group flex shrink-0 cursor-pointer items-center gap-2 rounded-md border border-line bg-surface py-1.5 pr-2.5 pl-2 font-mono text-xs font-medium text-fg transition-colors hover:border-mute disabled:cursor-wait"
    >
      <span key={shown} className="animate-flip block overflow-hidden rounded-[3px] ring-1 ring-black/10">
        <Flag lang={shown} className="block h-4 w-8" />
      </span>
      <span className="uppercase">{shown}</span>
    </button>
  );
}
