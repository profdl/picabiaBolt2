import { theme } from './theme';

type ThemePath = string[];

export const useThemeClass = (path: ThemePath): string => {
  let current: any = theme;
  for (const key of path) {
    if (current[key] === undefined) {
      console.warn(`Theme path ${path.join('.')} not found`);
      return '';
    }
    current = current[key];
  }
  
  return typeof current === 'string' ? current : '';
};