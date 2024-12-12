import { useState } from "react";
import { useImageUpload } from "./useImageUpload";
import { Position } from "../types";
import { useStore } from "../store";

export function useCanvasDragAndDrop() {
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const { handleImageUpload } = useImageUpload();

  const handleDrop = async (
    e: React.DragEvent,
    canvasRef: React.RefObject<HTMLDivElement>,
    getCanvasPoint: (
      e: React.DragEvent,
      canvasRef: React.RefObject<HTMLDivElement>
    ) => Position
  ) => {
    e.preventDefault();
    setIsDraggingFile(false);
    const point = getCanvasPoint(e, canvasRef);

    // Handle drawer image drops
    const drawerImageData = e.dataTransfer.getData("application/json");
    if (drawerImageData) {
      try {
        const { image } = JSON.parse(drawerImageData);
        if (image && image.url) {
          await useStore
            .getState()
            .addImageToCanvas({ url: image.url }, { position: point });
          return;
        }
      } catch (err) {
        console.error("Error handling drawer image:", err);
      }
    }

    // Handle local file drops
    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));

    for (const file of imageFiles) {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = async () => {
        await handleImageUpload(file, point, {
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
        URL.revokeObjectURL(url);
      };
      img.src = url;
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(true);
  };

  const handleDragLeave = () => {
    setIsDraggingFile(false);
  };

  return {
    isDraggingFile,
    handleDrop,
    handleDragOver,
    handleDragLeave,
  };
}
