'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, LayoutDashboard, Zap, Cpu, LogOut,
  ChevronLeft, ChevronRight, Sun, Moon,
  GitBranch, FlaskConical
} from 'lucide-react';
import { clearToken, getUser } from '@/lib/api';

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Learning',
    items: [
      { href: '/quiz/adaptive', label: 'Practice Quiz', icon: Zap },
      { href: '/quiz/diagnostic', label: 'Diagnostic', icon: FlaskConical },
    ],
  },
  {
    label: 'Adaptive System',
    items: [
      { href: '/pathway-builder', label: 'Pathway Builder', icon: GitBranch },
    ],
  },
  {
    label: 'Compiler',
    items: [
      { href: '/compiler', label: 'Playground', icon: Cpu },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
}

export function Sidebar({ collapsed, setCollapsed }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [isDark, setIsDark] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const user = getUser();
    setUserName(user?.name || '');
    setUserEmail(user?.email || '');
    const saved = localStorage.getItem('ls-theme');
    setIsDark(saved !== 'light');
  }, [pathname]);

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.remove('light');
      document.body.classList.remove('light');
      localStorage.setItem('ls-theme', 'dark');
    } else {
      document.documentElement.classList.add('light');
      document.body.classList.add('light');
      localStorage.setItem('ls-theme', 'light');
    }
  }

  function logout() {
    clearToken();
    router.push('/');
  }

  const initials = userName
    ? userName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  const isActive = (href: string) =>
    pathname === href || (href !== '/dashboard' && pathname.startsWith(href + '/'));

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      className="relative flex flex-col h-full bg-[var(--bg-surface)] border-r border-[var(--border-subtle)] overflow-hidden flex-shrink-0"
    >
      {/* Header / Logo */}
      <div className="flex items-center h-16 px-4 border-b border-[var(--border-subtle)] flex-shrink-0">
        <Link href="/dashboard" className="flex items-center gap-3 min-w-0">
          <div className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-violet-600" />
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent" />
            <Brain className="relative z-10 h-4 w-4 text-white" />
          </div>
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -4 }}
                transition={{ duration: 0.15 }}
                className="flex flex-col -space-y-0.5 min-w-0"
              >
                <span className="text-sm font-bold text-[var(--text-primary)] leading-none tracking-tight whitespace-nowrap">
                  ALPC
                </span>
                <span className="text-[9px] text-[var(--text-muted)] leading-none tracking-widest uppercase">
                  LearnSmart
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </Link>
      </div>

      {/* Nav Groups */}
      <div className="flex-1 overflow-y-auto py-4 space-y-6 overflow-x-hidden">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <AnimatePresence mode="wait">
              {!collapsed && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.1 }}
                  className="px-4 mb-1.5 text-[9px] font-semibold tracking-widest uppercase text-[var(--text-muted)]"
                >
                  {group.label}
                </motion.p>
              )}
            </AnimatePresence>
            <nav className="space-y-0.5 px-2">
              {group.items.map(({ href, label, icon: Icon, badge }) => {
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    title={collapsed ? label : undefined}
                    className={`relative flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm font-medium transition-all duration-150 group ${
                      active
                        ? 'bg-indigo-500/15 text-[var(--brand-secondary)]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/[0.05]'
                    }`}
                  >
                    {active && (
                      <motion.div
                        layoutId="sidebar-active"
                        className="absolute inset-0 rounded-lg bg-indigo-500/12 border border-indigo-500/20"
                        transition={{ type: 'spring', bounce: 0.15, duration: 0.35 }}
                      />
                    )}
                    <Icon className={`relative z-10 flex-shrink-0 h-4 w-4 ${
                      active ? 'text-indigo-400' : ''
                    }`} />
                    <AnimatePresence mode="wait">
                      {!collapsed && (
                        <motion.span
                          initial={{ opacity: 0, x: -4 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.12 }}
                          className="relative z-10 whitespace-nowrap"
                        >
                          {label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                    {badge && !collapsed && (
                      <span className="ml-auto relative z-10 text-[9px] font-bold bg-indigo-500/20 text-indigo-300 rounded px-1.5 py-0.5">
                        {badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="border-t border-[var(--border-subtle)] p-2 flex-shrink-0 space-y-1">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title={collapsed ? (isDark ? 'Light mode' : 'Dark mode') : undefined}
          className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/[0.05] transition-all"
        >
          {mounted ? (
            isDark ? <Sun className="flex-shrink-0 h-4 w-4" /> : <Moon className="flex-shrink-0 h-4 w-4" />
          ) : (
            <div className="h-4 w-4" />
          )}
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
                className="whitespace-nowrap text-xs"
              >
                {isDark ? 'Light Mode' : 'Dark Mode'}
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        {/* User info */}
        <div className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 ${
          !collapsed ? 'border border-[var(--border-subtle)] bg-[var(--bg-overlay)]' : ''
        }`}>
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-[10px] font-bold text-white">
            {initials}
          </div>
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
                className="min-w-0 flex-1"
              >
                <p className="text-[12px] font-semibold text-[var(--text-primary)] truncate">{userName}</p>
                <p className="text-[10px] text-[var(--text-muted)] truncate">{userEmail}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          title={collapsed ? 'Sign out' : undefined}
          className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm text-[var(--text-secondary)] hover:text-rose-400 hover:bg-rose-500/10 transition-all"
        >
          <LogOut className="flex-shrink-0 h-4 w-4" />
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
                className="whitespace-nowrap text-xs"
              >
                Sign out
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--bg-elevated)] border border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-all shadow-md"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>
    </motion.aside>
  );
}
