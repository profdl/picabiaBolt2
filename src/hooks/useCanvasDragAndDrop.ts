import { useState } from "react";
import { useImageUpload } from "./useImageUpload";
import { Position } from "../types";

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

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));
    const point = getCanvasPoint(e, canvasRef);

    for (const file of imageFiles) {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = async () => {
        const ratio = img.naturalWidth / img.naturalHeight;
        const baseWidth = 512;
        await handleImageUpload(file, point, {
          width: baseWidth,
          height: baseWidth / ratio,
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
