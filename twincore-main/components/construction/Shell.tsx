'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Link, usePathname } from '@/i18n/navigation';
import { ROLES, canSee } from '@/lib/construction/perms';
import { GROUPS, SECTIONS, SUBS, UNNUMBERED, useText, type Section } from '@/lib/construction/text';
import { openSub } from './extra';
import type { Role } from '@/lib/construction/types';
import { StoreProvider, useStore } from './Store';

// The construction workspace: its sections in groups down the side (a menu sheet on phones), and over every page
// the reminder that this is demonstration data, with a reset and a "view as" switch for trying the roles.

export const hrefOf = (s: Section) => (s === 'dashboard' ? '/construction' : `/construction/${s}`);

export default function Shell({ children }: { children: ReactNode }) {
  return (
    <StoreProvider>
      <Frame>{children}</Frame>
    </StoreProvider>
  );
}

function Frame({ children }: { children: ReactNode }) {
  const t = useText();
  const path = usePathname();
  const { role, setRole, reset } = useStore();
  const current = SECTIONS.find((s) => path === hrefOf(s)) ?? 'dashboard';
  return (
    <div className="mx-auto max-w-[1520px] px-4 pt-6 pb-16 sm:px-8 lg:px-12">
      {/* demonstration data: said plainly, on every page */}
      <div role="note" className="mb-6 flex flex-col gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/[0.06] px-4 py-3 text-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="font-medium text-amber-700">{t.demo.title}</p>
          <p className="mt-0.5 text-xs text-fg/75">{t.demo.body}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-mute" title={t.demo.viewAsNote}>
            {t.demo.viewAs}
            <select value={role} onChange={(e) => setRole(e.target.value as Role)} className="h-8 rounded-lg border border-line bg-ink px-2 text-xs text-fg">
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {t.role[r]}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={() => confirm(t.demo.resetConfirm) && reset()} className="h-8 cursor-pointer rounded-full border border-line px-3 text-xs text-fg/85 hover:border-mute">
            {t.demo.reset}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-10">
        <SideNav current={current} />
        <main className="min-w-0">
          {canSee(role, current) ? (
            children
          ) : (
            // reached by a link or a typed address: say why, and offer the way back
            <div role="alert" className="rounded-2xl border border-line bg-surface/50 p-6 sm:p-8">
              <p className="text-lg text-fg">{t.nav.noAccess}</p>
              <p className="mt-2 max-w-[560px] text-sm text-mute">
                {t.section[current]} · {t.role[role]}. {t.nav.noAccessBody}
              </p>
              <Link href="/construction" className="mt-5 inline-flex h-10 items-center rounded-full border border-line px-4 text-sm text-fg/85 hover:border-mute">
                {t.nav.back} →
              </Link>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// numbered straight through the groups, as on the paper menu; the document archive and administration carry none
const NUMBER = (() => {
  const out = {} as Record<Section, number | null>;
  let n = 0;
  for (const s of SECTIONS) out[s] = UNNUMBERED.includes(s) ? null : ++n;
  return out;
})();

// the open sub-view (master plan › zoning…), read from the address #hash
function useHash() {
  const [h, setH] = useState('');
  useEffect(() => {
    const read = () => setH(location.hash.slice(1));
    read();
    addEventListener('hashchange', read);
    addEventListener('tc-subview', read);
    return () => {
      removeEventListener('hashchange', read);
      removeEventListener('tc-subview', read);
    };
  }, []);
  return h;
}

// The sections in their groups, with a filter. On large screens it stands beside the page; on phones one button
// says where you are and opens the same list as a sheet.
function SideNav({ current }: { current: Section }) {
  const t = useText();
  const path = usePathname();
  const hash = useHash();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path, hash]);
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    addEventListener('keydown', key);
    document.body.style.overflow = 'hidden';
    return () => {
      removeEventListener('keydown', key);
      document.body.style.overflow = '';
    };
  }, [open]);

  const needle = q.trim().toLowerCase();
  const hit = (s: Section) => !needle || t.section[s].toLowerCase().includes(needle) || (SUBS[s] ?? []).some((v) => t.sub[v].toLowerCase().includes(needle)) || String(NUMBER[s] ?? '').padStart(2, '0').includes(needle);
  const { role } = useStore();
  const groups = GROUPS.map((g) => ({ ...g, items: g.items.filter((s) => canSee(role, s) && hit(s)) })).filter((g) => g.items.length);
  const mine = SECTIONS.filter((s) => canSee(role, s)).length;

  const list = (
    <>
      <p className="mb-2 px-1 text-[11px] text-mute">
        {role === 'admin' ? t.nav.all : t.nav.scope}: <span className="text-fg/80">{t.role[role]}</span> · {mine}/{SECTIONS.length}
      </p>
      <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.nav.find} aria-label={t.nav.find} className="mb-3 h-10 w-full rounded-lg border border-line bg-ink px-3 text-sm text-fg placeholder:text-mute/70 focus:border-accent focus:outline-none lg:h-9" />
      {groups.length === 0 && <p className="px-3 py-2 text-sm text-mute">{t.nav.none}</p>}
      <div className="space-y-4">
        {groups.map((g) => (
          <div key={g.key}>
            <p className="mb-1 px-3 text-[11px] font-medium tracking-wide text-mute/80 uppercase">{t.group[g.key]}</p>
            <ol className="space-y-0.5">
              {g.items.map((s) => {
                const on = s === current;
                const subs = SUBS[s];
                return (
                  <li key={s}>
                    <Link
                      href={hrefOf(s)}
                      aria-current={on ? 'page' : undefined}
                      className={`flex min-h-10 items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm transition-colors lg:min-h-0 ${on ? 'bg-accent/12 text-fg' : 'text-mute hover:bg-surface hover:text-fg'}`}
                    >
                      <span className={`w-5 shrink-0 font-mono text-[10px] ${on ? 'text-accent-hi' : 'text-mute/70'}`}>{NUMBER[s] != null ? String(NUMBER[s]).padStart(2, '0') : '·'}</span>
                      <span className="min-w-0 flex-1">{t.section[s]}</span>
                      {subs && (
                        <span aria-hidden="true" className={`text-xs transition-transform duration-200 ${on || needle ? 'rotate-90' : ''}`}>
                          ›
                        </span>
                      )}
                    </Link>
                    {/* the page's own views, open while you are on it (or when the filter matches one) */}
                    {subs && (on || needle) && (
                      <ol className="mt-0.5 mb-1 ml-[1.9rem] space-y-0.5 border-l border-line pl-2">
                        {subs.filter((v) => !needle || on || t.sub[v].toLowerCase().includes(needle) || t.section[s].toLowerCase().includes(needle)).map((v, k) => {
                          const sel = on && (hash === v || (!subs.includes(hash) && k === 0));
                          return (
                            <li key={v}>
                              <Link
                                href={`${hrefOf(s)}#${v}`}
                                onClick={openSub}
                                aria-current={sel ? 'true' : undefined}
                                className={`flex min-h-9 items-center rounded-md px-2.5 py-1 text-[13px] transition-colors lg:min-h-0 ${sel ? 'text-fg' : 'text-mute hover:text-fg'}`}
                              >
                                {sel && <span aria-hidden="true" className="mr-2 h-1.5 w-1.5 rounded-full bg-accent" />}
                                {t.sub[v]}
                              </Link>
                            </li>
                          );
                        })}
                      </ol>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        ))}
      </div>
    </>
  );

  return (
    <nav aria-label={t.workspace} className="lg:sticky lg:top-24 lg:self-start">
      {/* phones and tablets: where you are, and the menu */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        className="flex h-12 w-full cursor-pointer items-center gap-3 rounded-xl border border-line bg-surface/60 px-4 text-left text-sm lg:hidden"
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0 text-mute" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
          <path d="M3 5h14M3 10h14M3 15h14" />
        </svg>
        <span className="font-mono text-[11px] text-accent-hi">{NUMBER[current] != null ? String(NUMBER[current]).padStart(2, '0') : '·'}</span>
        <span className="min-w-0 flex-1 truncate text-fg">
          {t.section[current]}
          {SUBS[current]?.includes(hash) && <span className="text-mute"> › {t.sub[hash]}</span>}
        </span>
        <span className="text-xs text-mute">{t.nav.menu}</span>
      </button>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label={t.workspace}>
          <div className="absolute inset-0 bg-navy/40" onClick={() => setOpen(false)} />
          <div className="animate-fade-in absolute inset-x-0 bottom-0 flex max-h-[88svh] flex-col rounded-t-2xl border-t border-line bg-ink">
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <p className="text-sm text-fg">
                {t.workspace} <span className="text-mute">· {t.workspaceSub}</span>
              </p>
              <button type="button" onClick={() => setOpen(false)} className="h-10 cursor-pointer rounded-full border border-line px-4 text-xs text-fg/85">
                {t.common.close}
              </button>
            </div>
            <div data-lenis-prevent className="thin-scrollbar overflow-y-auto overscroll-contain px-2 pb-[max(1rem,env(safe-area-inset-bottom))]">{list}</div>
          </div>
        </div>
      )}

      {/* large screens: the full list beside the page, scrolling on its own */}
      <div className="hidden lg:block">
        <p className="mb-3 text-xs text-mute">
          {t.workspace} · {t.workspaceSub}
        </p>
        <div data-lenis-prevent className="thin-scrollbar -mr-3 max-h-[calc(100svh-8rem)] overflow-y-auto overscroll-contain pr-3 pb-6">{list}</div>
      </div>
    </nav>
  );
}
