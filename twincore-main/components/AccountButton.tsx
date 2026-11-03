'use client';

import { useAuthActions } from '@convex-dev/auth/react';
import { useConvexAuth, useQuery } from 'convex/react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { isDev, viewer, type Viewer } from '@/lib/account';

// The header's right corner: "Log in" for visitors; for signed-in users a round initial that opens their name,
// email, the workspace link and sign-out. `initial` is what the server read from the session cookie: it is shown
// while the browser re-checks the session after a page load, so a refresh doesn't flash "Log in".
export default function AccountButton({ initial }: { initial: { user: Viewer; dev: boolean } }) {
  const t = useTranslations('nav');
  const { isAuthenticated, isLoading } = useConvexAuth();
  const signedIn = isLoading ? !!initial.user : isAuthenticated;
  const user = useQuery(viewer, isAuthenticated ? {} : 'skip') ?? (signedIn ? initial.user : null);
  const dev = useQuery(isDev, isAuthenticated ? {} : 'skip') ?? (signedIn && initial.dev);
  const { signOut } = useAuthActions();
  const router = useRouter();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    addEventListener('pointerdown', away);
    addEventListener('keydown', key);
    return () => {
      removeEventListener('pointerdown', away);
      removeEventListener('keydown', key);
    };
  }, [open]);

  if (!signedIn) {
    return (
      <Link
        href="/login"
        aria-busy={isLoading}
        className="bg-grad inline-flex h-9 items-center rounded-md px-3.5 text-sm font-medium text-white transition-colors hover:bg-accent-deep"
      >
        {t('login')}
      </Link>
    );
  }

  const label = user?.name || user?.email || '';
  const out = async () => {
    setOpen(false);
    await signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t('account')}
        className="grid h-9 w-9 cursor-pointer place-items-center rounded-full bg-navy text-sm font-medium text-white uppercase transition-colors hover:bg-accent-deep"
      >
        {label.charAt(0) || '·'}
      </button>
      {open && (
        <div
          role="menu"
          className="animate-fade-in absolute right-0 mt-2 w-64 rounded-lg border border-line bg-surface p-1.5 shadow-[var(--shadow-pop)]"
        >
          <div className="px-3 py-2.5">
            <p className="truncate text-sm text-fg">{user?.name}</p>
            <p className="truncate text-xs text-mute">{user?.email}</p>
            {user?.company && <p className="truncate text-xs text-mute">{user.company}</p>}
          </div>
          <div className="my-1 border-t border-line" />
          <Link role="menuitem" href="/construction" className="block rounded-md px-3 py-2 text-sm text-fg/90 hover:bg-raised">
            {t('workspace')}
          </Link>
          {dev && (
            <Link role="menuitem" href="/dev" className="block rounded-md px-3 py-2 text-sm text-fg/90 hover:bg-raised">
              {t('dev')}
            </Link>
          )}
          <div className="my-1 border-t border-line" />
          <button
            role="menuitem"
            type="button"
            onClick={out}
            className="flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50"
          >
            <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
            {t('logout')}
          </button>
        </div>
      )}
    </div>
  );
}
