'use client';

import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

/** Reads the theme set by the inline script in layout.tsx and lets the user switch it. */
export function useTheme(): [Theme | null, () => void] {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
  }, []);

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.classList.toggle('dark', next === 'dark');
    try { localStorage.setItem('ls-theme', next); } catch { /* storage blocked */ }
    setTheme(next);
  }

  return [theme, toggle];
}
