import type { ReactNode } from 'react';

// Each page fades in gently as you move between them (the template is re-created on every navigation; the header
// and footer in the layout stay put).
export default function Template({ children }: { children: ReactNode }) {
  return <div className="animate-page">{children}</div>;
}
