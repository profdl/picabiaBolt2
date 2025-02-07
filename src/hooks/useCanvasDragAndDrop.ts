// src/hooks/useCanvasDragAndDrop.ts
import { useState } from "react";
import { useStore } from "../store";
import { Position } from "../types";
import { useShapeAdder } from "./useShapeAdder";
import { useImageUpload } from "./useImageUpload";

interface ImageDimensions {
  width: number;
  height: number;
  aspectRatio: number;
}

export function useCanvasDragAndDrop() {
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const { handleImageUpload } = useImageUpload();
  const { addNewShape } = useShapeAdder();
  const { addImageToCanvas } = useStore();

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
          await addImageToCanvas({ url: image.url }, { position: point });
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

      try {
        // Create a promise to handle image loading
        const dimensions: ImageDimensions = await new Promise((resolve, reject) => {
          img.onload = () => {
            resolve({
              width: img.naturalWidth,
              height: img.naturalHeight,
              aspectRatio: img.naturalWidth / img.naturalHeight,
            });
          };
          img.onerror = () => reject(new Error("Failed to load image"));
          img.src = url;
        });

        // First, add a placeholder shape with the local URL
        await addNewShape(
          "image",
          {
            imageUrl: url,
            isUploading: true,
            aspectRatio: dimensions.aspectRatio,
            originalWidth: dimensions.width,
            originalHeight: dimensions.height,
          },
          {
            position: point,
            setSelected: true,
            centerOnShape: true,
          }
        );

        // Then start the upload process
        await handleImageUpload(file, point, dimensions);

      } catch (err) {
        console.error("Error processing dropped image:", err);
      } finally {
        URL.revokeObjectURL(url);
      }
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