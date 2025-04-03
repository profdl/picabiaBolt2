import { useState, useRef } from "react";
import { Button } from "../../shared/Button";
import ReactDOM from "react-dom";
import { useStore } from "../../../store";
import { Shape } from "../../../types";
import { ImageShape as ImageShapeType } from "../../../types/shapes";

interface ImageEditorProps {
  shape: Shape;
  updateShape: (id: string, updates: Partial<Shape>) => void;
}

export interface Asset {
  id: string;
  url: string;
  created_at: string;
  user_id: string;
}

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const ImageEditor: React.FC<ImageEditorProps> = ({
  shape,
  updateShape,
}) => {
  const [cropArea, setCropArea] = useState<CropArea>({
    x: 0,
    y: 0,
    width: 100,
    height: 100,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeCorner, setResizeCorner] = useState<'nw' | 'ne' | 'sw' | 'se' | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [averageColor, setAverageColor] = useState<string>("#ffffff");
  const { uploadAsset, addShape, shapes } = useStore();
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Type check and cast the shape
  const imageShape = shape.type === "image" ? (shape as ImageShapeType) : null;
  if (!imageShape) return null;

  // Handle image load and calculate average color
  const handleImageLoad = () => {
    if (!imageRef.current) return;
    const img = imageRef.current;

    // Calculate average color
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(img, 0, 0);

    try {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      let r = 0, g = 0, b = 0;
      let count = 0;

      // Sample every 10th pixel for performance
      for (let i = 0; i < data.length; i += 40) {
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        count++;
      }

      const avgR = Math.round(r / count);
      const avgG = Math.round(g / count);
      const avgB = Math.round(b / count);

      setAverageColor(`rgb(${avgR}, ${avgG}, ${avgB})`);
    } catch (error) {
      console.error('Error calculating average color:', error);
      // Keep the default white color if calculation fails
    }

    // Center the crop area initially
    const containerWidth = containerRef.current?.clientWidth || 600;
    const containerHeight = containerRef.current?.clientHeight || 400;
    const initialSize = Math.min(containerWidth, containerHeight) * 0.8;
    
    setCropArea({
      x: (containerWidth - initialSize) / 2,
      y: (containerHeight - initialSize) / 2,
      width: initialSize,
      height: initialSize,
    });
  };

  // Handle crop area dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - containerRect.left - cropArea.x,
      y: e.clientY - containerRect.top - cropArea.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging && !isResizing) return;
    if (!containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - containerRect.left;
    const mouseY = e.clientY - containerRect.top;

    if (isDragging) {
      setCropArea(prev => ({
        ...prev,
        x: mouseX - dragStart.x,
        y: mouseY - dragStart.y,
      }));
    } else if (isResizing && resizeCorner) {
      setCropArea(prev => {
        const newArea = { ...prev };

        switch (resizeCorner) {
          case 'nw':
            newArea.width = prev.x + prev.width - mouseX;
            newArea.height = prev.y + prev.height - mouseY;
            newArea.x = mouseX;
            newArea.y = mouseY;
            break;
          case 'ne':
            newArea.width = mouseX - prev.x;
            newArea.height = prev.y + prev.height - mouseY;
            newArea.y = mouseY;
            break;
          case 'sw':
            newArea.width = prev.x + prev.width - mouseX;
            newArea.height = mouseY - prev.y;
            newArea.x = mouseX;
            break;
          case 'se':
            newArea.width = mouseX - prev.x;
            newArea.height = mouseY - prev.y;
            break;
        }

        // Ensure minimum size and adjust position if needed
        if (newArea.width < 20) {
          if (resizeCorner === 'nw' || resizeCorner === 'sw') {
            newArea.x = prev.x + prev.width - 20;
          }
          newArea.width = 20;
        }
        if (newArea.height < 20) {
          if (resizeCorner === 'nw' || resizeCorner === 'ne') {
            newArea.y = prev.y + prev.height - 20;
          }
          newArea.height = 20;
        }

        return newArea;
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
    setResizeCorner(null);
  };

  // Handle crop area resizing
  const handleResizeStart = (e: React.MouseEvent, corner: 'nw' | 'ne' | 'sw' | 'se') => {
    e.stopPropagation();
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    setIsResizing(true);
    setResizeCorner(corner);
    setDragStart({
      x: e.clientX - containerRect.left,
      y: e.clientY - containerRect.top,
    });
  };

  const getCroppedImg = () => {
    if (!imageRef.current || !containerRef.current) return;
    const img = imageRef.current;
    const containerRect = containerRef.current.getBoundingClientRect();

    // Create a canvas for the cropped image
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size to crop area
    canvas.width = Math.abs(cropArea.width);
    canvas.height = Math.abs(cropArea.height);

    // Fill with average color first
    ctx.fillStyle = averageColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Calculate the scale factors between natural image size and displayed size
    const imgRect = img.getBoundingClientRect();
    const scaleX = img.naturalWidth / imgRect.width;
    const scaleY = img.naturalHeight / imgRect.height;

    // Calculate the position of the crop area relative to the image
    const relativeX = cropArea.x - (imgRect.left - containerRect.left);
    const relativeY = cropArea.y - (imgRect.top - containerRect.top);

    // Calculate source coordinates in the original image
    const sourceX = Math.max(0, relativeX * scaleX);
    const sourceY = Math.max(0, relativeY * scaleY);
    const sourceWidth = Math.min(img.naturalWidth - sourceX, cropArea.width * scaleX);
    const sourceHeight = Math.min(img.naturalHeight - sourceY, cropArea.height * scaleY);

    // Calculate destination coordinates
    const destX = Math.max(0, -relativeX);
    const destY = Math.max(0, -relativeY);
    const destWidth = sourceWidth / scaleX;
    const destHeight = sourceHeight / scaleY;

    // Draw the image portion
    ctx.drawImage(
      img,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      destX,
      destY,
      destWidth,
      destHeight
    );

    return canvas.toDataURL("image/jpeg");
  };

  const handleCancel = () => {
    // Restore the saved state and clear it
    updateShape(imageShape.id, { 
      isImageEditing: false,
      savedCanvasState: undefined  // Clear the saved state
    });
  };

  const handleSave = async () => {
    const croppedImageUrl = getCroppedImg();
    if (!croppedImageUrl) return;

    const response = await fetch(croppedImageUrl);
    const blob = await response.blob();
    const file = new File([blob], "cropped-image.jpg", { type: "image/jpeg" });

    try {
      const asset = await uploadAsset(file) as unknown as Asset | null;
      if (asset && asset.url) {
        const cropAspectRatio = cropArea.width / cropArea.height;
        let newWidth = imageShape.width;
        let newHeight = imageShape.height;

        if (cropAspectRatio > 1) {
          newHeight = imageShape.width / cropAspectRatio;
        } else {
          newWidth = imageShape.height * cropAspectRatio;
        }

        const rightmostX = Math.max(
          ...shapes.map((s) => s.position.x + s.width)
        );
        const spacing = 20;

        const newShapePosition = {
          x: rightmostX + spacing,
          y: imageShape.position.y,
        };

        const newShape: ImageShapeType = {
          id: Math.random().toString(36).substr(2, 9),
          type: "image",
          position: newShapePosition,
          width: newWidth,
          height: newHeight,
          color: "#ffffff",
          rotation: 0,
          imageUrl: asset.url as string,
          model: "",
          useSettings: false,
          isUploading: false,
          isEditing: false,
          depthStrength: 0.25,
          edgesStrength: 0.25,
          contentStrength: 0.25,
          poseStrength: 0.25,
          sketchStrength: 0.25,
          imagePromptStrength: 0.25,
        };

        addShape(newShape);

        window.scrollTo({
          left: newShapePosition.x + newWidth / 2 - window.innerWidth / 2,
          top: newShapePosition.y + newHeight / 2 - window.innerHeight / 2,
          behavior: "smooth",
        });
      }
    } catch (error) {
      console.error("Error uploading cropped image:", error);
    }

    // Clear the saved state when saving
    updateShape(imageShape.id, { 
      isImageEditing: false,
      savedCanvasState: undefined
    });
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[1000] bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 flex flex-col">
        <div 
          ref={containerRef}
          className="w-[600px] h-[400px] flex items-center justify-center overflow-hidden relative"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div 
            className="absolute inset-0"
            style={{ backgroundColor: averageColor }}
          />
          <div className="relative w-full h-full flex items-center justify-center">
            <img
              ref={imageRef}
              src={imageShape.imageUrl}
              alt="Edit"
              crossOrigin="anonymous"
              className="max-h-[350px] w-auto object-contain"
              style={{ maxHeight: "350px" }}
              onLoad={handleImageLoad}
            />
          </div>
          <div
            className="absolute border-2 border-blue-500 cursor-move"
            style={{
              left: cropArea.x,
              top: cropArea.y,
              width: cropArea.width,
              height: cropArea.height,
            }}
            onMouseDown={handleMouseDown}
          >
            {/* Resize handles */}
            <div
              className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 cursor-nw-resize"
              onMouseDown={(e) => handleResizeStart(e, 'nw')}
            />
            <div
              className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 cursor-ne-resize"
              onMouseDown={(e) => handleResizeStart(e, 'ne')}
            />
            <div
              className="absolute -bottom-1 -left-1 w-3 h-3 bg-blue-500 cursor-sw-resize"
              onMouseDown={(e) => handleResizeStart(e, 'sw')}
            />
            <div
              className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 cursor-se-resize"
              onMouseDown={(e) => handleResizeStart(e, 'se')}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button
            variant="outline"
            onClick={handleCancel}
          >
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </div>
      </div>
    </div>,
    document.body
  );
};
