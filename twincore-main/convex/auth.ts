import { Email } from '@convex-dev/auth/providers/Email';
import { convexAuth } from '@convex-dev/auth/server';
import { ConvexError } from 'convex/values';
import type { Id } from './_generated/dataModel';
import type { MutationCtx } from './_generated/server';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_MINUTES = 15;

// Passwordless sign-in: the visitor types their email, gets a 6-digit code, and entering it signs them in — the code
// is what verifies the address. One flow serves sign-up and sign-in alike; a new user is asked for their name after.
// Emails go out through Resend (AUTH_RESEND_KEY, sender AUTH_EMAIL_FROM). Without a key — local development — the
// code is written to the Convex log instead, so the flow can still be tried.
const emailCode = Email({
  id: 'email-code',
  maxAge: CODE_MINUTES * 60,
  async generateVerificationToken() {
    const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
    return String(n).padStart(6, '0');
  },
  async sendVerificationRequest({ identifier: email, token }) {
    if (!EMAIL.test(email)) throw new ConvexError('INVALID_EMAIL');
    const key = process.env.AUTH_RESEND_KEY;
    if (!key) {
      console.log(`[auth] no AUTH_RESEND_KEY set — sign-in code for ${email}: ${token}`);
      return;
    }
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.AUTH_EMAIL_FROM ?? 'TwinCore <onboarding@resend.dev>',
        to: [email],
        subject: `TwinCore нэвтрэх код: ${token}`,
        text: `Таны TwinCore-д нэвтрэх код: ${token}\n\nКод ${CODE_MINUTES} минутын дараа хүчингүй болно. Та өөрөө хүсээгүй бол энэ имэйлийг үл тоомсорлоорой.\n\nYour TwinCore sign-in code: ${token} (valid for ${CODE_MINUTES} minutes).`,
        html: `<div style="font-family:system-ui,sans-serif;max-width:420px;margin:auto;padding:24px;color:#0b1426">
  <p style="font-size:15px">Таны TwinCore-д нэвтрэх код:</p>
  <p style="font-size:34px;font-weight:700;letter-spacing:8px;margin:12px 0;color:#2563eb">${token}</p>
  <p style="font-size:13px;color:#53627d">Код ${CODE_MINUTES} минутын дараа хүчингүй болно. Та өөрөө хүсээгүй бол энэ имэйлийг үл тоомсорлоорой.</p>
  <p style="font-size:12px;color:#8ea6cc">Your TwinCore sign-in code, valid for ${CODE_MINUTES} minutes.</p>
</div>`,
      }),
    });
    if (!res.ok) {
      console.error('[auth] Resend refused the email', res.status, await res.text());
      throw new ConvexError('EMAIL_SEND_FAILED');
    }
  },
});

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [emailCode],
  callbacks: {
    // One user per email. Convex Auth would only link a code sign-in to a user whose email is already verified, and
    // the accounts made with the old email + password form never were — so match on the address itself. The user is
    // marked verified only once the code has been checked ("verification"), not when it is merely sent ("email").
    async createOrUpdateUser(anyCtx, { existingUserId, type, profile }) {
      const ctx = anyCtx as unknown as MutationCtx; // the callback is typed for any schema; this one is ours
      const verified = type === 'verification' ? { emailVerificationTime: Date.now() } : {};
      if (existingUserId) {
        if (type === 'verification') await ctx.db.patch(existingUserId as Id<'users'>, verified);
        return existingUserId;
      }
      const email = String(profile.email ?? '')
        .trim()
        .toLowerCase();
      if (!EMAIL.test(email)) throw new ConvexError('INVALID_EMAIL');
      const known = await ctx.db
        .query('users')
        .withIndex('email', (q) => q.eq('email', email))
        .first();
      if (known) {
        if (type === 'verification') await ctx.db.patch(known._id, verified);
        return known._id;
      }
      return await ctx.db.insert('users', { email, ...verified });
    },
  },
});
