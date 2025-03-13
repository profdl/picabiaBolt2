import { useMemo } from 'react';
import { useStore } from '../../store';

export function useToolbarGenerate() {
  const { shapes, generatingPredictions, handleGenerate } = useStore();

  const hasActivePrompt = useMemo(
    () =>
      shapes.some(
        (shape) =>
          (shape.type === "sticky" && shape.showPrompt && shape.content) ||
          (shape.type === "image" &&
            (shape.showDepth ||
              shape.showEdges ||
              shape.showPose ||
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