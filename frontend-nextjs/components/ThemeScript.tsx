'use client';

import { useEffect } from 'react';
import { useTheme } from '@/lib/theme-context';

export default function ThemeScript() {
  const { theme } = useTheme();

  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
  }, [theme]);

  return null;
}
