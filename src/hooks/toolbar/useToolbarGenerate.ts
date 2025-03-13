import { useMemo } from 'react';
import { useStore } from '../../store';

export function useToolbarGenerate() {
  const { shapes, generatingPredictions, handleGenerate } = useStore();

  const hasActivePrompt = useMemo(
    () =>
      shapes.some(
        (shape) =>
          (shape.type === "sticky" && shape.isTextPrompt && shape.content) ||
          (shape.type === "image" &&
            (shape.enableDepthPrompt ||
              shape.enableEdgesPrompt ||
              shape.enablePosePrompt ||
              shape.showSketch ||
              shape.showRemix))
      ),
    [shapes]
  );

  return {
    hasActivePrompt,
    generatingPredictions,
    handleGenerate
  };
}