'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { getToken } from '@/lib/api';
import { Sidebar } from './Sidebar';
import { SiteHeader, SiteFooter } from './SiteChrome';

// Pages that always use the public layout, signed in or not.
const PUBLIC_PATHS = new Set(['/', '/login', '/register', '/terms', '/privacy']);

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isAuth, setIsAuth] = useState<boolean | null>(null);

  useEffect(() => {
    setIsAuth(!!getToken());
  }, [pathname]);

  const useAppLayout = isAuth === true && !PUBLIC_PATHS.has(pathname);

  if (!useAppLayout) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader signedIn={isAuth === true} />
        <main id="main" className="flex-1">{children}</main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[13.5rem_1fr]">
      <Sidebar />
      <main id="main" className="min-w-0">{children}</main>
    </div>
  );
}
