// src/hooks/useStickyNoteColor.ts
import { useMemo } from 'react';
import { Shape } from '../types';

export const useStickyNoteColor = ({ type, showPrompt, showNegativePrompt }: Shape) => {
  return useMemo(() => {
    // Return default color if not a sticky note
    if (type !== 'sticky') return 'var(--sticky-yellow)';
    
    if (showPrompt) {
      return 'var(--sticky-green)';
    } else if (showNegativePrompt) {
      return 'var(--sticky-red)';
    }
    return 'var(--sticky-yellow)';
  }, [type, showPrompt, showNegativePrompt]);
};