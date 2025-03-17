import { useMemo } from 'react';
import { useStore } from '../../store';

export function useToolbarGenerate() {
  const { shapes, generatingPredictions, handleGenerate } = useStore();

  const hasActivePrompt = useMemo(
    () =>
      shapes.some((shape) => {
        // Check if the shape is in an enabled group or not in a group
        const isInEnabledGroup = !shape.groupId || shapes.find(s => s.id === shape.groupId)?.groupEnabled;
        
        if (!isInEnabledGroup) return false;

        // Check for text prompt
        if (shape.type === "sticky" && shape.isTextPrompt && shape.content) {
          return true;
        }

        // Check for image reference, controls, or variations
        if (shape.type === "image" || shape.type === "sketchpad") {
          return shape.showImagePrompt || shape.showDepth || shape.showEdges || 
                 shape.showPose || shape.showSketch || shape.makeVariations;
        }

        // Check for reference shapes (depth, edges, pose)
        if (shape.type === "depth" || shape.type === "edges" || shape.type === "pose") {
          return shape.showDepth || shape.showEdges || shape.showPose;
        }

        return false;
      }),
    [shapes]
  );

  return {
    hasActivePrompt,
    generatingPredictions,
    handleGenerate
  };
}