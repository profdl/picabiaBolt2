interface Bounds {
  width: number;
  height: number;
  top: number;
  left: number;
}

export async function trimTransparentPixels(imageUrl: string): Promise<{ url: string; bounds: Bounds }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Set canvas to image size
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Draw image to canvas
      ctx.drawImage(img, 0, 0);
      
      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Find bounds of non-transparent pixels
      let minX = canvas.width;
      let minY = canvas.height;
      let maxX = 0;
      let maxY = 0;
      
      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const alpha = data[((y * canvas.width + x) * 4) + 3];
          if (alpha > 0) { // If pixel is not completely transparent
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          }
        }
      }
      
      // Add small padding
      const padding = 10;
      minX = Math.max(0, minX - padding);
      minY = Math.max(0, minY - padding);
      maxX = Math.min(canvas.width, maxX + padding);
      maxY = Math.min(canvas.height, maxY + padding);
      
      // Get dimensions of trimmed content
      const trimmedWidth = maxX - minX;
      const trimmedHeight = maxY - minY;
      
      // Calculate scale to match original aspect ratio
      const originalAspectRatio = img.width / img.height;
      const trimmedAspectRatio = trimmedWidth / trimmedHeight;
      
      // Scale dimensions to match original image size while maintaining aspect ratio
      let finalWidth = img.width;
      let finalHeight = img.height;
      
      if (trimmedAspectRatio > originalAspectRatio) {
        // Width is limiting factor
        finalHeight = finalWidth / trimmedAspectRatio;
      } else {
        // Height is limiting factor
        finalWidth = finalHeight * trimmedAspectRatio;
      }
      
      // Create final canvas with scaled dimensions
      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = finalWidth;
      finalCanvas.height = finalHeight;
      
      const finalCtx = finalCanvas.getContext('2d');
      if (!finalCtx) {
        reject(new Error('Could not get final canvas context'));
        return;
      }
      
      // Draw trimmed image scaled to final dimensions
      finalCtx.drawImage(
        canvas,
        minX, minY, trimmedWidth, trimmedHeight,
        0, 0, finalWidth, finalHeight
      );
      
      // Convert to URL
      const trimmedUrl = finalCanvas.toDataURL('image/png');
      
      resolve({
        url: trimmedUrl,
        bounds: {
          width: finalWidth,
          height: finalHeight,
          top: minY,
          left: minX
        }
      });
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    
    img.src = imageUrl;
  });
}