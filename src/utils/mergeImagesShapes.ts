import { Shape } from '../types';

export async function mergeImages(images: Shape[]): Promise<Shape> {
  try {
    // Find the top-left most position among all images
    const minX = Math.min(...images.map(img => img.position.x));
    const minY = Math.min(...images.map(img => img.position.y));

    // Create new canvases for each image
    const imagePromises = images.map(shape => {
      return new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = (e) => {
          console.error('Image load error:', e);
          reject(new Error(`Failed to load image`));
        };
        
        if (!shape.imageUrl) {
          reject(new Error('Image URL is missing'));
          return;
        }

        if (shape.imageUrl.startsWith('data:image')) {
          img.src = shape.imageUrl;
        } else {
          const cleanUrl = shape.imageUrl.split('?')[0];
          const timestamp = new Date().getTime();
          const urlWithTimestamp = `${cleanUrl}?t=${timestamp}`;
          img.src = urlWithTimestamp;
        }
      });
    });

    const loadedImages = await Promise.all(imagePromises);

    // Calculate canvas dimensions based on the relative positions and sizes of all images
    const maxRight = Math.max(...images.map(img => img.position.x + img.width)) - minX;
    const maxBottom = Math.max(...images.map(img => img.position.y + img.height)) - minY;

    // Create a canvas large enough to fit all images
    const canvas = document.createElement('canvas');
    canvas.width = maxRight;
    canvas.height = maxBottom;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Could not get canvas context');
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw each image at its relative position
    loadedImages.forEach((img, index) => {
      const shape = images[index];
      
      // Calculate position relative to the top-left most image
      const relativeX = shape.position.x - minX;
      const relativeY = shape.position.y - minY;
      
      ctx.globalAlpha = 1;
      ctx.drawImage(
        img,
        relativeX,
        relativeY,
        shape.width,
        shape.height
      );
    });

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        },
        'image/png',
        1.0
      );
    });

    const mergedImageUrl = URL.createObjectURL(blob);

    // Calculate position for the new shape
    const rightmostEdge = Math.max(...images.map(img => img.position.x + img.width));
    const averageY = images.reduce((sum, img) => sum + img.position.y, 0) / images.length;
    
    const PADDING = 20;
    const newPosition = {
      x: rightmostEdge + PADDING,
      y: averageY,
    };

    const newShape: Shape = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'image',
      position: newPosition,
      width: maxRight,
      height: maxBottom,
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