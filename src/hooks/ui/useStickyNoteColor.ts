// src/hooks/useStickyNoteColor.ts
import { useMemo } from 'react';
import { Shape } from '../types';
import { useDarkMode } from './useDarkMode';

const DARK_YELLOW = '#3d3522';
const LIGHT_YELLOW = '#fff9c4';

export const useStickyNoteColor = ({ type, isTextPrompt, isNegativePrompt }: Shape) => {
  const { isDark } = useDarkMode();
  
  return useMemo(() => {
    // Return default color if not a sticky note
    if (type !== 'sticky') return isDark ? DARK_YELLOW : LIGHT_YELLOW;
    
    // Return appropriate color based on prompt type
    if (isTextPrompt) return 'var(--sticky-green)';
    if (isNegativePrompt) return 'var(--sticky-red)';
    
    // Return yellow color based on dark/light mode
    return isDark ? DARK_YELLOW : LIGHT_YELLOW;
  }, [type, isTextPrompt, isNegativePrompt, isDark]);
};