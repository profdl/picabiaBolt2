// src/hooks/useStickyNoteColor.ts
import { useMemo } from 'react';
import { Shape } from '../types';
import { useDarkMode } from './useDarkMode';

export const useStickyNoteColor = ({ type, showPrompt, showNegativePrompt }: Shape) => {
  const { isDark } = useDarkMode();
  
  return useMemo(() => {
    const darkYellow = '#3d3522';
    const lightYellow = '#fff9c4';
    
    // Return default color if not a sticky note
    if (type !== 'sticky') return isDark ? darkYellow : lightYellow;
    
    if (showPrompt) {
      return 'var(--sticky-green)';
    } else if (showNegativePrompt) {
      return 'var(--sticky-red)';
    }
    
    // Return yellow color based on dark/light mode
    return isDark ? darkYellow : lightYellow;
  }, [type, showPrompt, showNegativePrompt, isDark]);
};