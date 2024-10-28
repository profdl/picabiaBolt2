import { Shape } from '../types';

export async function generateThumbnail(shapes: Shape[]): Promise<string> {
  // Create an offscreen canvas
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  
  // Set thumbnail size (16:9 aspect ratio)
  canvas.width = 640;
  canvas.height = 360;
  
  // Set white background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  if (shapes.length === 0) {
    return canvas.toDataURL('image/jpeg', 0.8);
  }

  // Calculate bounding box of all shapes
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  shapes.forEach(shape => {
    const left = shape.position.x;
    const top = shape.position.y;
    const right = left + shape.width;
    const bottom = top + shape.height;
    
    minX = Math.min(minX, left);
    minY = Math.min(minY, top);
    maxX = Math.max(maxX, right);
    maxY = Math.max(maxY, bottom);
  });

  // Add padding
  const padding = 20;
  minX -= padding;
  minY -= padding;
  maxX += padding;
  maxY += padding;

  // Calculate scale to fit content
  const contentWidth = maxX - minX;
  const contentHeight = maxY - minY;
  const scale = Math.min(
    canvas.width / contentWidth,
    canvas.height / contentHeight,
    1 // Don't scale up if content is smaller than canvas
  );

  // Center the content
  const translateX = (canvas.width - contentWidth * scale) / 2 - minX * scale;
  const translateY = (canvas.height - contentHeight * scale) / 2 - minY * scale;

  // Apply transform
  ctx.translate(translateX, translateY);
  ctx.scale(scale, scale);

  // Draw shapes
  shapes.forEach(shape => {
    ctx.save();
    
    // Apply shape rotation
    if (shape.rotation) {
      ctx.translate(
        shape.position.x + shape.width / 2,
        shape.position.y + shape.height / 2
      );
      ctx.rotate((shape.rotation * Math.PI) / 180);
      ctx.translate(
        -(shape.position.x + shape.width / 2),
        -(shape.position.y + shape.height / 2)
      );
    }

    switch (shape.type) {
      case 'rectangle':
        ctx.fillStyle = shape.color;
        ctx.fillRect(
          shape.position.x,
          shape.position.y,
          shape.width,
          shape.height
        );
        break;

      case 'circle':
        ctx.beginPath();
        ctx.fillStyle = shape.color;
        ctx.ellipse(
          shape.position.x + shape.width / 2,
          shape.position.y + shape.height / 2,
          shape.width / 2,
          shape.height / 2,
          0,
          0,
          Math.PI * 2
        );
        ctx.fill();
        break;

      case 'text':
      case 'sticky':
        ctx.fillStyle = shape.color;
        ctx.fillRect(
          shape.position.x,
          shape.position.y,
          shape.width,
          shape.height
        );
        if (shape.content) {
          ctx.fillStyle = shape.type === 'sticky' ? '#000' : '#fff';
          ctx.font = `${shape.fontSize || 16}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(
            shape.content,
            shape.position.x + shape.width / 2,
            shape.position.y + shape.height / 2
          );
        }
        break;

      case 'drawing':
        if (shape.points && shape.points.length > 1) {
          ctx.beginPath();
          ctx.strokeStyle = shape.color;
          ctx.lineWidth = shape.strokeWidth || 2;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          
          const firstPoint = shape.points[0];
          ctx.moveTo(
            shape.position.x + firstPoint.x,
            shape.position.y + firstPoint.y
          );
          
          shape.points.slice(1).forEach(point => {
            ctx.lineTo(
              shape.position.x + point.x,
              shape.position.y + point.y
            );
          });
          
          ctx.stroke();
        }
        break;

      case 'image':
        if (shape.imageUrl) {
          // For thumbnails, we'll just show a placeholder for images
          ctx.fillStyle = '#f3f4f6';
          ctx.fillRect(
            shape.position.x,
            shape.position.y,
            shape.width,
            shape.height
          );
          ctx.strokeStyle = '#d1d5db';
          ctx.strokeRect(
            shape.position.x,
            shape.position.y,
            shape.width,
            shape.height
          );
        }
        break;
    }

    ctx.restore();
  });

  // Convert canvas to data URL
  return canvas.toDataURL('image/jpeg', 0.8);
}