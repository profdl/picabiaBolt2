// src/hooks/useDarkMode.ts
import { useEffect } from 'react';
import { create } from 'zustand';

interface DarkModeStore {
  isDark: boolean;
  toggleDarkMode: () => void;
}

export const useDarkModeStore = create<DarkModeStore>((set) => ({
  isDark: false,
  toggleDarkMode: () => set((state) => {
    const newIsDark = !state.isDark;
    localStorage.setItem('darkMode', String(newIsDark));
    return { isDark: newIsDark };
  }),
}));

export const useDarkMode = () => {
  const { isDark, toggleDarkMode } = useDarkModeStore();

  useEffect(() => {
    if (localStorage.getItem('darkMode') === null) {
      localStorage.setItem('darkMode', 'false');
    }

    const storedDarkMode = localStorage.getItem('darkMode') === 'true';
    if (storedDarkMode !== isDark) {
      useDarkModeStore.setState({ isDark: storedDarkMode });
    }

    const html = document.documentElement;
    if (isDark) {
      html.classList.add('dark');
      html.style.setProperty('--sticky-green', '#2e7d32');
      html.style.setProperty('--sticky-red', '#c62828');
      html.style.setProperty('--sticky-yellow', '#f9a825');
    } else {
      html.classList.remove('dark');
      html.style.setProperty('--sticky-green', '#90EE90');
      html.style.setProperty('--sticky-red', '#ffcccb');
      html.style.setProperty('--sticky-yellow', '#857341');
    }
  }, [isDark]);

  return { isDark, toggleDarkMode };
};