'use client';

import { useAuthActions } from '@convex-dev/auth/react';
import { useConvex } from 'convex/react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useRouter } from '@/i18n/navigation';
import { setProfile, viewer } from '@/lib/account';

type Step = 'email' | 'code' | 'profile';
const PROVIDER = 'email-code'; // convex/auth.ts
const CODE_MINUTES = 15;
const RESEND_AFTER = 30; // seconds before another code can be asked for

// Codes thrown by convex/auth.ts (and Convex Auth itself) mapped to messages. Production deployments hide plain
// error text, so anything unrecognised falls back to the step's generic message.
function errorKey(message: string, step: Step) {
  if (message.includes('INVALID_EMAIL')) return 'errors.email';
  if (message.includes('MISSING_NAME')) return 'errors.name';
  if (message.includes('TooManyFailedAttempts')) return 'errors.tooMany';
  if (/fetch|network/i.test(message)) return 'errors.network';
  return step === 'email' ? 'errors.send' : step === 'code' ? 'errors.code' : 'errors.name';
}

// Passwordless sign-in for the TwinCore platform, backed by Convex Auth: email → a 6-digit code by email → in.
// The first time, the new user is asked for their name. Signing in and signing up are the same flow.
export default function LoginForm() {
  const t = useTranslations('login');
  const { signIn } = useAuthActions();
  const convex = useConvex();
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [wait, setWait] = useState(0); // seconds until "resend" is allowed
  const codeBox = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => setWait((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);
  useEffect(() => {
    if (step === 'code') codeBox.current?.focus();
  }, [step]);

  const fail = (err: unknown, at: Step) => {
    setError(t(errorKey(err instanceof Error ? err.message : String(err), at)));
    setBusy(false);
  };
  const done = () => {
    router.push('/construction');
    router.refresh();
  };

  const sendCode = async (to: string) => {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      await signIn(PROVIDER, { email: to });
      setStep('code');
      setCode('');
      setWait(RESEND_AFTER);
      setBusy(false);
      return true;
    } catch (err) {
      fail(err, 'email');
      return false;
    }
  };

  const submitEmail = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const to = email.trim().toLowerCase();
    setEmail(to);
    await sendCode(to);
  };

  const verify = async (value: string) => {
    if (busy || value.length !== 6) return;
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      await signIn(PROVIDER, { email, code: value });
      const me = await convex.query(viewer, {}).catch(() => null);
      if (me && !me.name) {
        setStep('profile');
        setBusy(false);
      } else done();
    } catch (err) {
      setCode('');
      fail(err, 'code');
      codeBox.current?.focus();
    }
  };

  const submitProfile = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await convex.mutation(setProfile, { name: String(data.get('name') ?? ''), company: String(data.get('company') ?? '') || undefined });
      done();
    } catch (err) {
      fail(err, 'profile');
    }
  };

  const field =
    'mt-1.5 w-full rounded-lg border border-line bg-ink px-3.5 py-2.5 text-fg outline-none transition-colors placeholder:text-mute/60 focus:border-accent';
  const button =
    'bg-grad w-full cursor-pointer rounded-full px-5 py-2.5 text-sm font-medium text-white transition hover:brightness-110 disabled:cursor-wait disabled:opacity-70';
  const link = 'cursor-pointer text-accent-hi underline-offset-4 hover:underline disabled:cursor-default disabled:text-mute disabled:no-underline';

  const message = (
    <p aria-live="polite" className={`rounded-lg px-3.5 py-3 text-sm ${error ? 'bg-red-500/10 text-fg' : 'text-mute'}`}>
      {error ??
        note ?? (
          <>
            {t('help')}{' '}
            <Link href="/contact" className="text-accent-hi underline-offset-4 hover:underline">
              {t('contact')}
            </Link>
          </>
        )}
    </p>
  );

  if (step === 'profile')
    return (
      <form key="profile" onSubmit={submitProfile} className="animate-swap space-y-4">
        <div>
          <p className="text-lg text-fg">{t('profileTitle')}</p>
          <p className="mt-1 text-sm text-mute">{t('profileLead')}</p>
        </div>
        <label className="block text-sm text-mute">
          {t('name')}
          <input type="text" name="name" required autoFocus autoComplete="name" className={field} />
        </label>
        <label className="block text-sm text-mute">
          {t('company')} <span className="text-mute/60">{t('optional')}</span>
          <input type="text" name="company" autoComplete="organization" className={field} />
        </label>
        <button type="submit" disabled={busy} className={button}>
          {busy ? t('busy') : t('save')}
        </button>
        {error && message}
      </form>
    );

  if (step === 'code')
    return (
      <form
        key="code"
        onSubmit={(e) => {
          e.preventDefault();
          verify(code);
        }}
        className="animate-swap space-y-4"
      >
        <p className="text-sm text-mute">{t('codeSent', { email })}</p>
        <label className="block text-sm text-mute">
          {t('code')}
          <input
            ref={codeBox}
            name="code"
            value={code}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, '').slice(0, 6);
              setCode(v);
              if (v.length === 6) verify(v); // pasted or typed in full: go straight in
            }}
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            placeholder="••••••"
            aria-describedby="code-hint"
            className={`${field} text-center font-mono text-2xl tracking-[0.5em] tabular-nums`}
          />
          <span id="code-hint" className="mt-1.5 block text-xs text-mute/70">
            {t('codeHint', { min: CODE_MINUTES })}
          </span>
        </label>
        <button type="submit" disabled={busy || code.length !== 6} className={button}>
          {busy ? t('busy') : t('verify')}
        </button>
        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            className={link}
            onClick={() => {
              setStep('email');
              setError(null);
              setNote(null);
            }}
          >
            ← {t('changeEmail')}
          </button>
          <button
            type="button"
            disabled={busy || wait > 0}
            className={link}
            onClick={async () => {
              if (await sendCode(email)) setNote(t('resent'));
            }}
          >
            {wait > 0 ? t('resendIn', { s: wait }) : t('resend')}
          </button>
        </div>
        {(error || note) && message}
      </form>
    );

  return (
    <form key="email" onSubmit={submitEmail} className="animate-swap space-y-4">
      <label className="block text-sm text-mute">
        {t('email')}
        <input
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
          autoComplete="email"
          placeholder="name@company.mn"
          className={field}
        />
      </label>
      <button type="submit" disabled={busy} className={button}>
        {busy ? t('busy') : t('sendCode')}
      </button>
      {message}
    </form>
  );
}
