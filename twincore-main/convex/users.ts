import { getAuthUserId } from '@convex-dev/auth/server';
import { ConvexError, v } from 'convex/values';
import { mutation, query } from './_generated/server';

// The signed-in user, or null.
export const viewer = query({
  args: {},
  handler: async (ctx) => {
    const id = await getAuthUserId(ctx);
    if (!id) return null;
    const user = await ctx.db.get(id);
    return user && { name: user.name ?? null, email: user.email ?? null, company: user.company ?? null, verified: user.emailVerificationTime != null };
  },
});

// After a first code sign-in: the name (and optionally the company) that sign-up used to ask for.
export const setProfile = mutation({
  args: { name: v.string(), company: v.optional(v.string()) },
  handler: async (ctx, { name, company }) => {
    const id = await getAuthUserId(ctx);
    if (!id) throw new ConvexError('NOT_SIGNED_IN');
    const n = name.trim();
    if (!n) throw new ConvexError('MISSING_NAME');
    const c = company?.trim();
    await ctx.db.patch(id, { name: n, company: c || undefined });
  },
});
