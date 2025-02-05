import { theme } from './theme';

type ThemePath = string[];

export const useThemeClass = (path: ThemePath): string => {
  let current: any = theme;
  
  // First try direct path
  for (const key of path) {
    if (current[key] === undefined) {
      // If not found, check if it's a reference string
      if (typeof current === 'string' && current.includes('.')) {
        // Follow the reference path
        const refPath = current.split('.');
        let refValue: any = theme;
        for (const refKey of refPath) {
          if (refValue[refKey] === undefined) {
            console.warn(`Theme path ${refPath.join('.')} not found`);
            return '';
          }
          refValue = refValue[refKey];
        }
        return refValue;
      }
      console.warn(`Theme path ${path.join('.')} not found`);
      return '';
    }
    current = current[key];
  }
  
  return typeof current === 'string' ? current : '';
};