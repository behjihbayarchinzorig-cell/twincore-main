import type { MetadataRoute } from 'next';

// Lets phones add TwinCore to the home screen and open it full screen, like an app. Mongolian first.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'TwinCore',
    short_name: 'TwinCore',
    description: 'Барилгын төслөө нэг BIM загвар дээр удирд',
    lang: 'mn',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#060b18',
    theme_color: '#060b18',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
