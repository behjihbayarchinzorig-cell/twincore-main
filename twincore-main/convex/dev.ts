import { getAuthUserId } from '@convex-dev/auth/server';
import { ConvexError, v } from 'convex/values';
import type { QueryCtx } from './_generated/server';
import { mutation, query } from './_generated/server';

// The developer panel at /dev: only the emails listed (comma separated) in the deployment's DEV_EMAILS variable
// can see accounts or act on them. Set it with `npx convex env set DEV_EMAILS you@company.mn`.
function devEmails() {
  return (process.env.DEV_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

async function devUser(ctx: QueryCtx) {
  const id = await getAuthUserId(ctx);
  if (!id) return null;
  const user = await ctx.db.get(id);
  return user?.email && devEmails().includes(user.email.toLowerCase()) ? user : null;
}

async function requireDev(ctx: QueryCtx) {
  const user = await devUser(ctx);
  if (!user) throw new ConvexError('FORBIDDEN');
  return user;
}

// Whether the signed-in user may open the panel (drives the header menu link).
export const isDev = query({
  args: {},
  handler: async (ctx) => !!(await devUser(ctx)),
});

// Every account with its sign-in activity, newest first, plus totals.
export const accounts = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireDev(ctx);
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const users = await ctx.db.query('users').order('desc').collect();
    const rows = await Promise.all(
      users.map(async (u) => {
        const sessions = await ctx.db
          .query('authSessions')
          .withIndex('userId', (q) => q.eq('userId', u._id))
          .collect();
        const active = sessions.filter((s) => s.expirationTime > now);
        const lastSignIn = sessions.reduce<number | null>((t, s) => Math.max(t ?? 0, s._creationTime), null);
        return {
          id: u._id,
          name: u.name ?? null,
          email: u.email ?? null,
          company: u.company ?? null,
          createdAt: u._creationTime,
          lastSignIn,
          activeSessions: active.length,
          isDev: !!u.email && devEmails().includes(u.email.toLowerCase()),
          isMe: u._id === me._id,
        };
      }),
    );
    return {
      rows,
      totals: {
        users: rows.length,
        online: rows.filter((r) => r.activeSessions > 0).length,
        newThisWeek: rows.filter((r) => now - r.createdAt < 7 * day).length,
        signInsToday: rows.filter((r) => r.lastSignIn && now - r.lastSignIn < day).length,
      },
    };
  },
});

// Signs an account out on every device by ending its sessions and their refresh tokens.
export const revokeSessions = mutation({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }) => {
    await requireDev(ctx);
    const sessions = await ctx.db
      .query('authSessions')
      .withIndex('userId', (q) => q.eq('userId', userId))
      .collect();
    for (const s of sessions) {
      const tokens = await ctx.db
        .query('authRefreshTokens')
        .withIndex('sessionId', (q) => q.eq('sessionId', s._id))
        .collect();
      for (const t of tokens) await ctx.db.delete(t._id);
      await ctx.db.delete(s._id);
    }
    return sessions.length;
  },
});
