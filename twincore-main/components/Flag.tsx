import { useId } from 'react';
import type { Lang } from '@/i18n/routing';

// 2:1 flags drawn inline (emoji flags don't render on Windows).
export default function Flag({ lang, className = 'h-3.5 w-7' }: { lang: Lang; className?: string }) {
  const clip = useId();
  if (lang === 'mn') {
    return (
      <svg viewBox="0 0 60 30" className={className} aria-hidden="true">
        <rect width="60" height="30" fill="#da2032" />
        <rect x="20" width="20" height="30" fill="#015197" />
        {/* Simplified Soyombo */}
        <g fill="#ffd900">
          <path d="M10 3.2c.9 1 .9 1.9 0 2.6-.9-.7-.9-1.6 0-2.6z" />
          <circle cx="10" cy="8.6" r="1.7" />
          <path d="M7.4 10.6a2.6 2.6 0 0 0 5.2 0z" />
          <path d="M7.2 12.6h5.6l-2.8 1.9z" />
          <rect x="7.2" y="15" width="5.6" height=".9" />
          <circle cx="10" cy="19.2" r="2.2" />
          <rect x="7.2" y="22.5" width="5.6" height=".9" />
          <rect x="5" y="12.6" width="1.2" height="10.8" />
          <rect x="13.8" y="12.6" width="1.2" height="10.8" />
        </g>
        <path d="M10 17a2.2 2.2 0 0 1 0 4.4 1.1 1.1 0 0 1 0-2.2 1.1 1.1 0 0 0 0-2.2z" fill="#da2032" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 60 30" className={className} aria-hidden="true">
      <clipPath id={clip}>
        <path d="M30 15h30v15zv15H0zH0V0zV0h30z" />
      </clipPath>
      <rect width="60" height="30" fill="#012169" />
      <path d="M0 0l60 30m0-30L0 30" stroke="#fff" strokeWidth="6" />
      <path d="M0 0l60 30m0-30L0 30" clipPath={`url(#${clip})`} stroke="#c8102e" strokeWidth="4" />
      <path d="M30 0v30M0 15h60" stroke="#fff" strokeWidth="10" />
      <path d="M30 0v30M0 15h60" stroke="#c8102e" strokeWidth="6" />
    </svg>
  );
}
