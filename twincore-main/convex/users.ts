import { getAuthUserId } from '@convex-dev/auth/server';
import { query } from './_generated/server';

// The signed-in user, or null.
export const viewer = query({
  args: {},
  handler: async (ctx) => {
    const id = await getAuthUserId(ctx);
    if (!id) return null;
    const user = await ctx.db.get(id);
    return user && { name: user.name ?? null, email: user.email ?? null, company: user.company ?? null };
  },
});
