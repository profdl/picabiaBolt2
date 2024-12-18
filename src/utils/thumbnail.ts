import { Shape } from "../types";

export const generateThumbnail = async (shapes: Shape[]): Promise<string> => {
  if (!shapes.length) return "";

  // Add generous padding to the bounding box calculation
  const PADDING = 100; // Increased padding value

  const bounds = shapes.reduce(
    (acc, shape) => {
      const right = shape.position.x + (shape.width || 0);
      const bottom = shape.position.y + (shape.height || 0);
      return {
        minX: Math.min(acc.minX, shape.position.x),
        minY: Math.min(acc.minY, shape.position.y),
        maxX: Math.max(acc.maxX, right),
        maxY: Math.max(acc.maxY, bottom),
      };
    },
    { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
  );

  const width = bounds.maxX - bounds.minX + PADDING * 3;
  const height = bounds.maxY - bounds.minY + PADDING * 3;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Unable to get 2D rendering context");
  }

  canvas.width = width;
  canvas.height = height;

  // Fill white background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Translate context with the new padding
  ctx.translate(-bounds.minX + PADDING, -bounds.minY + PADDING);

  // Draw all shapes based on their type
  for (const shape of shapes) {
    ctx.save();

    // Apply rotation
    const centerX = shape.position.x + shape.width / 2;
    const centerY = shape.position.y + shape.height / 2;
    ctx.translate(centerX, centerY);
    ctx.rotate(((shape.rotation || 0) * Math.PI) / 180);
    ctx.translate(-centerX, -centerY);

    switch (shape.type) {
      case "image":
        if (shape.imageUrl) {
          const img = new Image();
          img.crossOrigin = "anonymous";
          await new Promise((resolve) => {
            img.onload = resolve;
            img.src = shape.imageUrl!;
          });
          ctx.drawImage(
            img,
            shape.position.x,
            shape.position.y,
            shape.width,
            shape.height
          );
        }
        break;

      case "rectangle":
        ctx.fillStyle = shape.color;
        ctx.fillRect(
          shape.position.x,
          shape.position.y,
          shape.width,
          shape.height
        );
        break;

      case "circle":
        ctx.beginPath();
        ctx.fillStyle = shape.color;
        ctx.ellipse(
          shape.position.x + shape.width / 2,
          shape.position.y + shape.height / 2,
          shape.width / 2,
          shape.height / 2,
          0,
          0,
          2 * Math.PI
        );
        ctx.fill();
        break;

      case "text":
      case "sticky":
        ctx.fillStyle = shape.color;
        ctx.fillRect(
          shape.position.x,
          shape.position.y,
          shape.width,
          shape.height
        );
        ctx.fillStyle = "#000000";
        ctx.font = `${shape.fontSize || 16}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
          shape.content || "",
          shape.position.x + shape.width / 2,
          shape.position.y + shape.height / 2
        );
        break;
      case "sketchpad":
        if (shape.canvasData) {
          const img = new Image();
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = reject;
            img.src = shape.canvasData!;
          });
          ctx.drawImage(
            img,
            shape.position.x,
            shape.position.y,
            shape.width,
            shape.height
          );
        }
        break;

      case "drawing":
        if (shape.points) {
          ctx.beginPath();
          ctx.strokeStyle = shape.color;
          ctx.lineWidth = shape.strokeWidth || 2;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";

          const points = shape.points;
          ctx.moveTo(
            shape.position.x + points[0].x,
            shape.position.y + points[0].y
          );

          for (let i = 1; i < points.length; i++) {
            ctx.lineTo(
              shape.position.x + points[i].x,
              shape.position.y + points[i].y
            );
          }
          ctx.stroke();
        }
        break;
    }

    ctx.restore();
  }

  return canvas.toDataURL("image/jpeg", 0.8);
};
