import { useEffect } from 'react';
import { create } from 'zustand';

interface DarkModeStore {
  isDark: boolean;
  toggleDarkMode: () => void;
}

export const useDarkModeStore = create<DarkModeStore>((set) => ({
  isDark: localStorage.getItem('darkMode') === 'true',
  toggleDarkMode: () => set((state) => {
    const newIsDark = !state.isDark;
    localStorage.setItem('darkMode', String(newIsDark));
    return { isDark: newIsDark };
  }),
}));

export const useDarkMode = () => {
  const { isDark, toggleDarkMode } = useDarkModeStore();

  useEffect(() => {
    const html = document.documentElement;
    if (isDark) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }, [isDark]);

  return { isDark, toggleDarkMode };
};