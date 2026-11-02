import { authTables } from '@convex-dev/auth/server';
import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

// Convex Auth's own tables (sessions, accounts, refresh tokens…), with the users table extended by the name and
// company asked for at sign-up.
export default defineSchema({
  ...authTables,
  users: defineTable({
    name: v.optional(v.string()),
    company: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
  }).index('email', ['email']),
});
