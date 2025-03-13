import { useState, useCallback, useEffect } from 'react';
import { useStore } from '../../store';
import { useProjects } from './useProjects';
import { generateThumbnail } from '../../utils/thumbnail';
import { supabase } from '../../lib/supabase';

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

      await updateProject(boardId, {
        shapes,
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