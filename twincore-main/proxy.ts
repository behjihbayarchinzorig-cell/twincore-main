import { convexAuthNextjsMiddleware } from '@convex-dev/auth/nextjs/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const intl = createMiddleware(routing);

// Convex Auth answers /api/auth (sign-in, sign-up, sign-out, token refresh) and keeps the session cookies fresh;
// every page then gets the /mn or /en prefix (from the visitor's previous choice) and is served localized.
export default convexAuthNextjsMiddleware((request) => intl(request), {
  // stay signed in for 30 days
  cookieConfig: { maxAge: 60 * 60 * 24 * 30 },
});

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)', '/api/auth'],
};
