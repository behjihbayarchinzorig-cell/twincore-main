import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

// Locale-aware versions of Next's navigation APIs: links keep the current /mn or /en prefix.
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
