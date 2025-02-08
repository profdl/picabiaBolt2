import { Shape } from '../types';

export async function mergeImages(images: Shape[]): Promise<Shape> {
  try {
    // Create new canvases for each image
    const imagePromises = images.map(shape => {
      return new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = reject;
        
        const timestamp = new Date().getTime();
        const imageUrl = shape.imageUrl || '';
        const urlWithTimestamp = imageUrl.includes('?') 
          ? `${imageUrl}&t=${timestamp}` 
          : `${imageUrl}?t=${timestamp}`;
        
        img.src = urlWithTimestamp;
      });
    });

    // Wait for all images to load
    const loadedImages = await Promise.all(imagePromises);

    // Calculate dimensions of the merged image
    const totalWidth = Math.max(...images.map(img => img.width));
    const totalHeight = Math.max(...images.map(img => img.height));

    // Create a canvas to merge the images
    const canvas = document.createElement('canvas');
    canvas.width = totalWidth;
    canvas.height = totalHeight;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Could not get canvas context');
    }

    // Draw each image onto the canvas with full opacity
    loadedImages.forEach((img, index) => {
      const shape = images[index];
      // Scale and position the image relative to its original dimensions
      const scale = Math.min(
        totalWidth / img.width,
        totalHeight / img.height
      );
      
      const x = shape.position.x - images[0].position.x;
      const y = shape.position.y - images[0].position.y;
      
      // Remove the divided opacity, use full opacity instead
      ctx.globalAlpha = 1;
      ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
    });

    // Convert canvas to blob
    const blob = await new Promise<Blob>((resolve, reject) => {
      try {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        }, 'image/png');
      } catch (error) {
        reject(error);
      }
    });

    // Create object URL for the merged image
    const mergedImageUrl = URL.createObjectURL(blob);

    // Calculate position for the new shape
    // Find the rightmost edge of the selected shapes
    const rightmostEdge = Math.max(...images.map(img => img.position.x + img.width));
    const averageY = images.reduce((sum, img) => sum + img.position.y, 0) / images.length;
    
    // Position the new shape to the right of the selected shapes
    const PADDING = 20;
    const newPosition = {
      x: rightmostEdge + PADDING,
      y: averageY,
    };

    // Create new shape for the merged image
    const newShape: Shape = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'image',
      position: newPosition,
      width: totalWidth,
      height: totalHeight,
      rotation: 0,
      imageUrl: mergedImageUrl,
      isUploading: false,
      model: '',
      useSettings: false,
      isEditing: false,
      color: '#ffffff',
      depthStrength: 0.75,
      edgesStrength: 0.75,
      contentStrength: 0.75,
      poseStrength: 0.75,
      sketchStrength: 0.75,
      remixStrength: 0.75,
      mergedFrom: images.map(img => img.id),
      isMerged: true
    };

    return newShape;
  } catch (error) {
    console.error('Error merging images:', error);
    throw error;
  }
}