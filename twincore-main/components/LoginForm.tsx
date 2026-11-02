'use client';

import { useAuthActions } from '@convex-dev/auth/react';
import { useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';
import { Link, useRouter } from '@/i18n/navigation';

type Flow = 'signIn' | 'signUp';

// Codes thrown by convex/auth.ts (and Convex Auth itself) mapped to messages. Production deployments hide plain
// error text, so anything unrecognised falls back to the flow's generic message.
function errorKey(message: string, flow: Flow) {
  if (message.includes('INVALID_EMAIL')) return 'errors.email';
  if (message.includes('MISSING_NAME')) return 'errors.name';
  if (message.includes('WEAK_PASSWORD')) return 'errors.password';
  if (message.includes('already exists')) return 'errors.taken';
  if (message.includes('TooManyFailedAttempts')) return 'errors.tooMany';
  if (/fetch|network/i.test(message)) return 'errors.network';
  return flow === 'signIn' ? 'errors.credentials' : 'errors.signUp';
}

// Sign-in and sign-up for the TwinCore platform, backed by Convex Auth (email + password).
export default function LoginForm() {
  const t = useTranslations('login');
  const { signIn } = useAuthActions();
  const router = useRouter();
  const [flow, setFlow] = useState<Flow>('signIn');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    data.set('flow', flow);
    setBusy(true);
    setError(null);
    try {
      await signIn('password', data);
      router.push('/construction');
      router.refresh();
    } catch (err) {
      setError(t(errorKey(err instanceof Error ? err.message : String(err), flow)));
      setBusy(false);
    }
  };
  const switchTo = (next: Flow) => {
    setFlow(next);
    setError(null);
  };

  const field =
    'mt-1.5 w-full rounded-lg border border-line bg-ink px-3.5 py-2.5 text-fg outline-none transition-colors placeholder:text-mute/60 focus:border-accent';
  const tab = (active: boolean) =>
    `flex-1 cursor-pointer rounded-full px-4 py-1.5 text-sm transition-colors ${active ? 'bg-surface text-fg' : 'text-mute hover:text-fg'}`;

  return (
    <div className="space-y-5">
      <div className="flex rounded-full border border-line p-1" role="tablist">
        <button type="button" role="tab" aria-selected={flow === 'signIn'} className={tab(flow === 'signIn')} onClick={() => switchTo('signIn')}>
          {t('signInTab')}
        </button>
        <button type="button" role="tab" aria-selected={flow === 'signUp'} className={tab(flow === 'signUp')} onClick={() => switchTo('signUp')}>
          {t('signUpTab')}
        </button>
      </div>

      <form onSubmit={submit} className="space-y-4">
        {flow === 'signUp' && (
          <>
            <label className="block text-sm text-mute">
              {t('name')}
              <input type="text" name="name" required autoComplete="name" className={field} />
            </label>
            <label className="block text-sm text-mute">
              {t('company')} <span className="text-mute/60">{t('optional')}</span>
              <input type="text" name="company" autoComplete="organization" className={field} />
            </label>
          </>
        )}
        <label className="block text-sm text-mute">
          {t('email')}
          <input type="email" name="email" required autoComplete="email" placeholder="name@company.mn" className={field} />
        </label>
        <label className="block text-sm text-mute">
          {t('password')}
          <input
            type="password"
            name="password"
            required
            minLength={flow === 'signUp' ? 8 : undefined}
            autoComplete={flow === 'signUp' ? 'new-password' : 'current-password'}
            className={field}
          />
          {flow === 'signUp' && <span className="mt-1 block text-xs text-mute/70">{t('passwordHint')}</span>}
        </label>
        <button
          type="submit"
          disabled={busy}
          className="bg-grad w-full cursor-pointer rounded-full px-5 py-2.5 text-sm font-medium text-white transition hover:brightness-110 disabled:cursor-wait disabled:opacity-70"
        >
          {busy ? t('busy') : flow === 'signIn' ? t('submit') : t('signUpSubmit')}
        </button>
        <p aria-live="polite" className={`rounded-lg px-3.5 py-3 text-sm ${error ? 'bg-red-500/10 text-fg' : 'text-mute'}`}>
          {error ?? (
            <>
              {t('help')}{' '}
              <Link href="/contact" className="text-accent-hi underline-offset-4 hover:underline">
                {t('contact')}
              </Link>
            </>
          )}
        </p>
      </form>
    </div>
  );
}
