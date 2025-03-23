import { useState, useCallback, useEffect } from 'react';
import { useStore } from '../../store';
import { useProjects } from './useProjects';
import { generateThumbnail } from '../../utils/thumbnail';
import { supabase } from '../../lib/supabase';
import { Shape } from '../../types';

async function saveCanvasLayers(shape: Shape) {
  if (shape.type !== 'image') return null;

  const canvasData: Record<string, string | null> = {};
  
  // Only save stroke data for permanent and active layers
  if (shape.permanentCanvasData) {
    // Parse the stroke data to ensure it's valid
    try {
      const strokeData = JSON.parse(shape.permanentCanvasData);
      if (Array.isArray(strokeData)) {
        // Only keep the last 100 strokes to prevent excessive storage
        const optimizedStrokes = strokeData.slice(-100);
        canvasData.permanentCanvasData = JSON.stringify(optimizedStrokes);
      }
    } catch (e) {
      console.warn('Error parsing permanent canvas data:', e);
      canvasData.permanentCanvasData = null;
    }
  }

  if (shape.activeCanvasData) {
    // Parse the stroke data to ensure it's valid
    try {
      const strokeData = JSON.parse(shape.activeCanvasData);
      if (Array.isArray(strokeData)) {
        // Only keep the last 50 strokes to prevent excessive storage
        const optimizedStrokes = strokeData.slice(-50);
        canvasData.activeCanvasData = JSON.stringify(optimizedStrokes);
      }
    } catch (e) {
      console.warn('Error parsing active canvas data:', e);
      canvasData.activeCanvasData = null;
    }
  }

  // For other layers, we don't need to save their data as they can be reconstructed
  canvasData.backgroundCanvasData = null;
  canvasData.previewCanvasData = null;
  canvasData.maskCanvasData = null;
  canvasData.redBackgroundCanvasData = null;

  return canvasData;
}

export function useProjectSave(boardId: string | null) {
  const [isSaving, setIsSaving] = useState(false);
  const shapes = useStore((state) => state.shapes);
  const { updateProject } = useProjects();

  const handleSave = useCallback(async () => {
    if (!boardId) return;
    setIsSaving(true);
    try {
      const thumbnailBase64 = await generateThumbnail(shapes);
      const fileName = `${boardId}-${Date.now()}.webp`;
      const base64Data = thumbnailBase64.replace(/^data:image\/\w+;base64,/, "");
      const binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

      const { error: uploadError } = await supabase.storage
        .from("assets")
        .upload(fileName, binaryData, {
          contentType: "image/webp",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("assets")
        .getPublicUrl(fileName);

      const updatedShapes = await Promise.all(
        shapes.map(async (shape) => {
          if (shape.type === 'image') {
            const canvasData = await saveCanvasLayers(shape);
            return { ...shape, ...canvasData };
          }
          return shape;
        })
      );

      await updateProject(boardId, {
        shapes: updatedShapes,
        thumbnail: publicUrl,
      });
    } catch (error) {
      console.error("Failed to save project:", error);
    } finally {
      setIsSaving(false);
    }
  }, [boardId, shapes, updateProject]);

  useEffect(() => {
    if (!boardId || !shapes.length) return;

    const autoSaveInterval = setInterval(async () => {
      await handleSave();
    }, 30000);

    return () => clearInterval(autoSaveInterval);
  }, [boardId, handleSave, shapes]);

  return {
    isSaving,
    handleSave
  };
}