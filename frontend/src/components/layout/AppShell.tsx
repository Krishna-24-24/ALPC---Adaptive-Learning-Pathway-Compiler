'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { getToken } from '@/lib/api';
import { Sidebar } from './Sidebar';
import Navbar from '@/components/Navbar';

const PUBLIC_PATHS = ['/', '/login', '/register'];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some(p => p === pathname);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [isAuth, setIsAuth] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsAuth(!!getToken());
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved !== null) setCollapsed(saved === 'true');
  }, [pathname]);

  function handleSetCollapsed(v: boolean) {
    setCollapsed(v);
    localStorage.setItem('sidebar-collapsed', String(v));
  }

  const showSidebar = mounted && isAuth && !isPublicPath(pathname);

  if (!showSidebar) {
    // Public layout: gradient background + top navbar
    return (
      <div className="gradient-bg min-h-screen">
        <Navbar />
        <main className="relative z-10">{children}</main>
      </div>
    );
  }

  // Authenticated layout: sidebar + content area (no top navbar)
  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-base)]">
      <Sidebar collapsed={collapsed} setCollapsed={handleSetCollapsed} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <main className="flex-1 overflow-y-auto bg-[var(--bg-base)]">
          {children}
        </main>
      </div>
    </div>
  );
}
