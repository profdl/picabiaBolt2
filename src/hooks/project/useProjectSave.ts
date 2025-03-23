import { useState, useCallback, useEffect } from 'react';
import { useStore } from '../../store';
import { useProjects } from './useProjects';
import { generateThumbnail } from '../../utils/thumbnail';
import { supabase } from '../../lib/supabase';
import { Shape } from '../../types';

async function saveCanvasLayers(shape: Shape) {
  if (shape.type !== 'image') return null;

  const canvasRefs = {
    background: document.querySelector(`canvas[data-shape-id="${shape.id}"][data-layer="background"]`) as HTMLCanvasElement,
    permanent: document.querySelector(`canvas[data-shape-id="${shape.id}"][data-layer="permanent"]`) as HTMLCanvasElement,
    active: document.querySelector(`canvas[data-shape-id="${shape.id}"][data-layer="active"]`) as HTMLCanvasElement,
    preview: document.querySelector(`canvas[data-shape-id="${shape.id}"][data-layer="preview"]`) as HTMLCanvasElement,
    mask: document.querySelector(`canvas[data-shape-id="${shape.id}"][data-layer="mask"]`) as HTMLCanvasElement,
    redBackground: document.querySelector(`canvas[data-shape-id="${shape.id}"][data-layer="redBackground"]`) as HTMLCanvasElement
  };

  const canvasData: Record<string, string | null> = {};
  
  for (const [layer, canvas] of Object.entries(canvasRefs)) {
    if (canvas) {
      // Create a temporary canvas for compression
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) continue;

      // Set dimensions to match original
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;

      // Draw original canvas to temp canvas
      tempCtx.drawImage(canvas, 0, 0);

      // Use PNG for layers that need transparency (mask, active, permanent)
      // Use JPEG for layers that don't need transparency (background, preview, redBackground)
      const format = ['mask', 'active', 'permanent'].includes(layer) ? 'image/png' : 'image/jpeg';
      const quality = format === 'image/jpeg' ? 0.7 : undefined;
      
      canvasData[`${layer}CanvasData`] = tempCanvas.toDataURL(format, quality);
    } else {
      canvasData[`${layer}CanvasData`] = null;
    }
  }

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