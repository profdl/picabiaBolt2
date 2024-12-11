import { StateCreator } from "zustand";
import { StoreState } from "../../types";

type ImageTrimSliceType = {
  trimTransparentPixels: (shapeId: string) => Promise<void>;
};

type ImageTrimState = ImageTrimSliceType & StoreState;

export const imageTrimSlice: StateCreator<
  ImageTrimState,
  [],
  [],
  ImageTrimSliceType
> = (set, get) => ({
  trimTransparentPixels: async (shapeId: string) => {
    const { shapes, updateShape } = get();
    const shape = shapes.find((s) => s.id === shapeId);

    if (!shape?.imageUrl) return;

    const img = new Image();
    img.src = shape.imageUrl;

    await new Promise((resolve) => {
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        canvas.width = img.width;
        canvas.height = img.height;

        ctx?.drawImage(img, 0, 0);
        const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);

        if (!imageData) return;

        let minX = canvas.width;
        let minY = canvas.height;
        let maxX = 0;
        let maxY = 0;

        // Find bounds of non-transparent pixels
        for (let y = 0; y < canvas.height; y++) {
          for (let x = 0; x < canvas.width; x++) {
            const alpha = imageData.data[(y * canvas.width + x) * 4 + 3];
            if (alpha > 0) {
              minX = Math.min(minX, x);
              minY = Math.min(minY, y);
              maxX = Math.max(maxX, x);
              maxY = Math.max(maxY, y);
            }
          }
        }

        // Create new canvas with trimmed dimensions
        const trimmedCanvas = document.createElement("canvas");
        const trimmedCtx = trimmedCanvas.getContext("2d");

        const trimmedWidth = maxX - minX + 1;
        const trimmedHeight = maxY - minY + 1;

        trimmedCanvas.width = trimmedWidth;
        trimmedCanvas.height = trimmedHeight;

        trimmedCtx?.drawImage(
          canvas,
          minX,
          minY,
          trimmedWidth,
          trimmedHeight,
          0,
          0,
          trimmedWidth,
          trimmedHeight
        );

        // Update shape with trimmed image
        const trimmedImageUrl = trimmedCanvas.toDataURL();
        updateShape(shapeId, {
          imageUrl: trimmedImageUrl,
          width: trimmedWidth,
          height: trimmedHeight,
        });

        resolve(null);
      };
    });
  },
});
