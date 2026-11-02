import { Password } from '@convex-dev/auth/providers/Password';
import { convexAuth } from '@convex-dev/auth/server';
import { ConvexError } from 'convex/values';
import type { DataModel } from './_generated/dataModel';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Email + password accounts. Errors are ConvexErrors carrying a short code, which the sign-in form translates.
const password = Password<DataModel>({
  profile(params) {
    const email = String(params.email ?? '')
      .trim()
      .toLowerCase();
    if (!EMAIL.test(email)) throw new ConvexError('INVALID_EMAIL');
    if (params.flow !== 'signUp') return { email };
    const name = String(params.name ?? '').trim();
    if (!name) throw new ConvexError('MISSING_NAME');
    const company = String(params.company ?? '').trim();
    return { email, name, ...(company && { company }) };
  },
  validatePasswordRequirements(pw) {
    if (pw.length < 8) throw new ConvexError('WEAK_PASSWORD');
  },
});

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({ providers: [password] });
