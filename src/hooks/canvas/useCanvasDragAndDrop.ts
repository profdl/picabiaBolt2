// src/hooks/useCanvasDragAndDrop.ts
import { useState } from "react";
import { useStore } from "../../store";
import { useImageUpload } from "../useImageUpload";
import { Position } from "../../types";

interface ImageDimensions {
  width: number;
  height: number;
  aspectRatio: number;
}

export function useCanvasDragAndDrop() {
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const { handleImageUpload } = useImageUpload();
  const { addImageToCanvas, zoom, offset } = useStore();

  const getCanvasPoint = (
    e: React.DragEvent<HTMLDivElement>,
    rect: DOMRect
  ): Position => {
    // Calculate the mouse position relative to the canvas
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Convert to canvas coordinates considering zoom and offset
    return {
      x: (mouseX - offset.x) / zoom,
      y: (mouseY - offset.y) / zoom,
    };
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    setIsDraggingFile(false);

    const rect = e.currentTarget.getBoundingClientRect();
    const point = getCanvasPoint(e, rect);

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
        const dimensions: ImageDimensions = await new Promise(
          (resolve, reject) => {
            img.onload = () => {
              resolve({
                width: img.naturalWidth,
                height: img.naturalHeight,
                aspectRatio: img.naturalWidth / img.naturalHeight,
              });
            };
            img.onerror = () => reject(new Error("Failed to load image"));
            img.src = url;
          }
        );

        // Let useImageUpload handle the shape creation and upload
        await handleImageUpload(file, point, dimensions);
      } catch (err) {
        console.error("Error processing dropped image:", err);
      } finally {
        URL.revokeObjectURL(url);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.stopPropagation();
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setIsDraggingFile(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsDraggingFile(false);
  };

  return {
    isDraggingFile,
    handleDrop,
    handleDragOver,
    handleDragLeave,
  };
}
