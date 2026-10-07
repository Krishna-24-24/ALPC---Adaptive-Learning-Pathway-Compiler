'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/lib/theme';

const REPO_URL = 'https://github.com/chakshurohilla007-design/ALPC---Adaptive-Learning-Pathway-Compiler';

export function Wordmark() {
  return (
    <span className="text-[1.0625rem] font-semibold tracking-tight">
      ALPC
      <span className="ml-2 hidden text-sm font-normal t-graphite sm:inline">Adaptive Learning Pathway Compiler</span>
    </span>
  );
}

export function ThemeButton({ className = '' }: { className?: string }) {
  const [theme, toggle] = useTheme();
  return (
    <button type="button" onClick={toggle} className={`btn btn-quiet btn-sm ${className}`}>
      {theme === null ? 'Theme' : theme === 'dark' ? 'Light theme' : 'Dark theme'}
    </button>
  );
}

export function SiteHeader({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();
  const nav = [
    { href: '/compiler', label: 'Playground' },
    { href: '/#how-it-works', label: 'How it works' },
    { href: '/#path-lang', label: 'Path-Lang' },
  ];

  return (
    <header className="border-b border-[var(--rule)]">
      <div className="mx-auto flex min-h-14 max-w-[70rem] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2 sm:px-6">
        <Link href="/" className="no-underline">
          <Wordmark />
        </Link>
        <nav aria-label="Main" className="order-3 flex w-full gap-5 text-sm sm:order-none sm:w-auto">
          {nav.map(item => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={pathname === item.href ? 'page' : undefined}
              className={`no-underline hover:underline hover:underline-offset-4 ${pathname === item.href ? 'font-medium' : 't-graphite'}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ThemeButton />
          {signedIn ? (
            <Link href="/dashboard" className="btn btn-primary btn-sm">Go to dashboard</Link>
          ) : (
            <>
              <Link href="/login" className="btn btn-quiet btn-sm">Sign in</Link>
              <Link href="/register" className="btn btn-primary btn-sm">Create account</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-[var(--rule)]">
      <div className="mx-auto flex max-w-[70rem] flex-wrap items-baseline gap-x-6 gap-y-2 px-4 py-6 text-sm t-graphite sm:px-6">
        <span>ALPC is a Compiler Design course project.</span>
        <a href={REPO_URL} className="link">Source code</a>
        <Link href="/terms" className="link">Terms</Link>
        <Link href="/privacy" className="link">Privacy</Link>
      </div>
    </footer>
  );
}
