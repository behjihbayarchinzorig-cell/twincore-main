'use client';

import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import { makeFunctionReference } from 'convex/server';
import { useFormatter, useNow, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { Link } from '@/i18n/navigation';

type Row = {
  id: string;
  name: string | null;
  email: string | null;
  company: string | null;
  createdAt: number;
  lastSignIn: number | null;
  activeSessions: number;
  isDev: boolean;
  isMe: boolean;
};
type Accounts = { rows: Row[]; totals: { users: number; online: number; newThisWeek: number; signInsToday: number } };

const isDev = makeFunctionReference<'query', Record<string, never>, boolean>('dev:isDev');
const accounts = makeFunctionReference<'query', Record<string, never>, Accounts>('dev:accounts');
const revokeSessions = makeFunctionReference<'mutation', { userId: string }, number>('dev:revokeSessions');

// The developer's account monitor: live totals and every account with its sign-in activity. Convex queries are
// reactive, so new sign-ups and sign-ins appear without reloading.
export default function DevPanel() {
  const t = useTranslations('dev');
  const { isAuthenticated, isLoading } = useConvexAuth();
  const allowed = useQuery(isDev, isAuthenticated ? {} : 'skip');
  const data = useQuery(accounts, allowed ? {} : 'skip');
  const revoke = useMutation(revokeSessions);
  const format = useFormatter();
  const now = useNow({ updateInterval: 30_000 });
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!data || !q) return data?.rows ?? [];
    return data.rows.filter((r) => [r.name, r.email, r.company].some((f) => f?.toLowerCase().includes(q)));
  }, [data, search]);

  if (isLoading || (isAuthenticated && allowed === undefined)) return <p className="text-mute">{t('loading')}</p>;
  if (!isAuthenticated)
    return (
      <p className="text-mute">
        {t('signedOut')}{' '}
        <Link href="/login" className="text-accent-hi underline-offset-4 hover:underline">
          {t('login')}
        </Link>
      </p>
    );
  if (!allowed) return <p className="max-w-[60ch] text-mute">{t('forbidden')}</p>;

  const ago = (ts: number | null) => (ts ? format.relativeTime(ts, now) : '—');
  const out = async (r: Row) => {
    if (!confirm(t('revokeConfirm', { who: r.email ?? r.name ?? '' }))) return;
    setBusy(r.id);
    try {
      await revoke({ userId: r.id });
    } finally {
      setBusy(null);
    }
  };

  const stats: [string, number | undefined][] = [
    [t('stats.users'), data?.totals.users],
    [t('stats.online'), data?.totals.online],
    [t('stats.newThisWeek'), data?.totals.newThisWeek],
    [t('stats.signInsToday'), data?.totals.signInsToday],
  ];

  return (
    <div className="space-y-8">
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-line bg-surface/70 px-5 py-4">
            <dt className="font-mono text-xs text-mute">{label}</dt>
            <dd className="mt-1 text-3xl font-medium tabular-nums">{value ?? '·'}</dd>
          </div>
        ))}
      </dl>

      <div className="space-y-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('search')}
          className="w-full max-w-sm rounded-lg border border-line bg-ink px-3.5 py-2.5 text-sm text-fg outline-none placeholder:text-mute/60 focus:border-accent"
        />
        <div className="overflow-x-auto rounded-2xl border border-line">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-line font-mono text-xs text-mute">
              <tr>
                <th className="px-4 py-3 font-normal">{t('cols.account')}</th>
                <th className="px-4 py-3 font-normal">{t('cols.company')}</th>
                <th className="px-4 py-3 font-normal">{t('cols.joined')}</th>
                <th className="px-4 py-3 font-normal">{t('cols.lastSignIn')}</th>
                <th className="px-4 py-3 font-normal">{t('cols.sessions')}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {!data && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-mute">
                    {t('loading')}
                  </td>
                </tr>
              )}
              {data && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-mute">
                    {t('empty')}
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-line/60 last:border-0">
                  <td className="px-4 py-3">
                    <p className="flex items-center gap-2 text-fg">
                      {r.name ?? '—'}
                      {r.isDev && <span className="rounded-full bg-accent/15 px-2 py-0.5 font-mono text-[10px] text-accent-hi">dev</span>}
                      {r.isMe && <span className="font-mono text-[10px] text-mute">{t('you')}</span>}
                    </p>
                    <p className="text-xs text-mute">{r.email}</p>
                  </td>
                  <td className="px-4 py-3 text-mute">{r.company ?? '—'}</td>
                  <td className="px-4 py-3 text-mute" title={new Date(r.createdAt).toLocaleString()}>
                    {ago(r.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-mute" title={r.lastSignIn ? new Date(r.lastSignIn).toLocaleString() : undefined}>
                    {ago(r.lastSignIn)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-2 tabular-nums">
                      <span className={`h-2 w-2 rounded-full ${r.activeSessions ? 'bg-emerald-600' : 'bg-mute/40'}`} />
                      {r.activeSessions}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {r.activeSessions > 0 && !r.isMe && (
                      <button
                        type="button"
                        disabled={busy === r.id}
                        onClick={() => out(r)}
                        className="cursor-pointer rounded-full border border-line px-3 py-1 text-xs text-fg/90 hover:bg-surface disabled:cursor-wait disabled:opacity-60"
                      >
                        {t('revoke')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
