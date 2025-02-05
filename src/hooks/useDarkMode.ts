import { useEffect } from 'react';
import { create } from 'zustand';

interface DarkModeStore {
  isDark: boolean;
  toggleDarkMode: () => void;
}

export const useDarkModeStore = create<DarkModeStore>((set) => ({
  // Default to false (light mode) explicitly
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
    // Always initialize to light mode (false) if no preference is set
    if (localStorage.getItem('darkMode') === null) {
      localStorage.setItem('darkMode', 'false');
    }

    // Ensure light mode is applied by default
    const storedDarkMode = localStorage.getItem('darkMode') === 'true';
    if (storedDarkMode !== isDark) {
      useDarkModeStore.setState({ isDark: storedDarkMode });
    }

    const html = document.documentElement;
    if (isDark) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }, [isDark]);

  return { isDark, toggleDarkMode };
};