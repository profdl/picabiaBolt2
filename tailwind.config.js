/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        blue: {
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        neutral: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
          950: '#0a0a0a',
        },
        // Replace existing color system with neutral-based theme
        primary: {
          light: '#fafafa', // neutral-50
          dark: '#171717',  // neutral-900
        },
        secondary: {
          light: '#f5f5f5', // neutral-100
          dark: '#262626',  // neutral-800
        },
        text: {
          light: '#262626', // neutral-800
          dark: '#f5f5f5',  // neutral-100
        }
      },
    },
  },
  plugins: [],
};