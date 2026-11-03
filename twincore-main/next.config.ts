import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

// Old module pages (before the platform was restructured around its three parts) and where they went.
const MOVED: Record<string, string> = { plan: 'data', build: 'control', plat: 'twin', sales: 'twin' };

const nextConfig: NextConfig = {
  // Stray lockfiles in parent folders would otherwise make Turbopack treat them as the workspace root.
  turbopack: { root: import.meta.dirname },
  experimental: { agentUpgrade: 'security' },
  async redirects() {
    return Object.entries(MOVED).flatMap(([from, to]) => [
      { source: `/${from}`, destination: `/system/${to}`, permanent: true },
      { source: `/system/${from}`, destination: `/system/${to}`, permanent: true },
      { source: `/en/${from}`, destination: `/en/system/${to}`, permanent: true },
      { source: `/en/system/${from}`, destination: `/en/system/${to}`, permanent: true },
      { source: `/mn/${from}`, destination: `/system/${to}`, permanent: true },
      { source: `/mn/system/${from}`, destination: `/system/${to}`, permanent: true },
    ]).concat([
      // the pricing page was removed
      { source: '/price', destination: '/contact', permanent: true },
      { source: '/en/price', destination: '/en/contact', permanent: true },
      { source: '/mn/price', destination: '/contact', permanent: true },
      // the overview now lives on the front page
      { source: '/system', destination: '/#overview', permanent: false },
      { source: '/en/system', destination: '/en#overview', permanent: false },
      { source: '/mn/system', destination: '/#overview', permanent: false },
      // the benefits page was removed
      { source: '/benefit', destination: '/', permanent: true },
      { source: '/en/benefit', destination: '/en', permanent: true },
      { source: '/mn/benefit', destination: '/', permanent: true },
    ]);
  },
};
export default createNextIntlPlugin()(nextConfig);
