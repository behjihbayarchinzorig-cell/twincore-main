import { makeFunctionReference } from 'convex/server';

// Convex functions behind the header's account button, shared by the server layout (first paint) and the client.
export type Viewer = { name: string | null; email: string | null; company: string | null; verified?: boolean } | null;
export const viewer = makeFunctionReference<'query', Record<string, never>, Viewer>('users:viewer');
export const isDev = makeFunctionReference<'query', Record<string, never>, boolean>('dev:isDev');
export const setProfile = makeFunctionReference<'mutation', { name: string; company?: string }, null>('users:setProfile');
