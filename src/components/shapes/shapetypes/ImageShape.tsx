import { useEffect, useRef } from "react";
import { useStore } from "../../../store";
import { Shape } from "../../../types";
import { supabase } from "../../../lib/supabase";
import { ImageEditor } from "./ImageEditor";
import { useBrush } from "../../layout/toolbars/BrushTool";

interface ImageShapeProps {
  shape: Shape;
  tool: "select" | "pan" | "pen" | "brush" | "eraser";
  handleContextMenu: (e: React.MouseEvent) => void;
}

interface PreprocessedImagePayload {
  new: {
    status: string;
    processType: string;
    shapeId: string;
    [key: string]: string | number | boolean | null;
  };
}

export const ImageShape: React.FC<ImageShapeProps> = ({ shape, tool, handleContextMenu }) => {
  const updateShape = useStore((state) => state.updateShape);
  
  // Create refs for our canvas layers
  const backgroundCanvasRef = useRef<HTMLCanvasElement>(null);
  const permanentStrokesCanvasRef = useRef<HTMLCanvasElement>(null);
  const activeStrokeCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const subscriptionRef = useRef<{
    [key: string]: ReturnType<typeof supabase.channel>;
  }>({});

  const { handlePointerDown, handlePointerMove, handlePointerUpOrLeave } = useBrush({
    backgroundCanvasRef,
    permanentStrokesCanvasRef,
    activeStrokeCanvasRef,
    previewCanvasRef,
    maskCanvasRef
  });

  // Initialize canvases with image
  useEffect(() => {
    console.log('ImageShape initialization started:', {
      hasImageUrl: !!shape.imageUrl,
      canvasRefs: {
        background: !!backgroundCanvasRef.current,
        permanent: !!permanentStrokesCanvasRef.current,
        active: !!activeStrokeCanvasRef.current,
        preview: !!previewCanvasRef.current,
        mask: !!maskCanvasRef.current
      }
    });

    if (!backgroundCanvasRef.current || !permanentStrokesCanvasRef.current || 
        !activeStrokeCanvasRef.current || !previewCanvasRef.current || !maskCanvasRef.current || !shape.imageUrl) return;

    const backgroundCanvas = backgroundCanvasRef.current;
    const permanentCanvas = permanentStrokesCanvasRef.current;
    const activeCanvas = activeStrokeCanvasRef.current;
    const previewCanvas = previewCanvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    
    const bgCtx = backgroundCanvas.getContext('2d', { willReadFrequently: true });
    const permanentCtx = permanentCanvas.getContext('2d', { willReadFrequently: true });
    const activeCtx = activeCanvas.getContext('2d', { willReadFrequently: true });
    const previewCtx = previewCanvas.getContext('2d', { willReadFrequently: true });
    const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
    
    if (!bgCtx || !permanentCtx || !activeCtx || !previewCtx || !maskCtx) return;

    // Clear all canvases first
    [backgroundCanvas, permanentCanvas, activeCanvas, previewCanvas, maskCanvas].forEach(canvas => {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    });

    // Load and draw the image
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      console.log('Image loaded:', {
        originalWidth: img.width,
        originalHeight: img.height
      });

      // Set canvas dimensions to match the image's aspect ratio
      const aspectRatio = img.width / img.height;
      const width = 512;
      const height = 512 / aspectRatio;

      console.log('Setting canvas dimensions:', {
        width,
        height,
        aspectRatio
      });

      // Set dimensions for all canvases
      [backgroundCanvas, permanentCanvas, activeCanvas, previewCanvas, maskCanvas].forEach(canvas => {
        canvas.width = width;
        canvas.height = height;
      });

      // Draw image on background canvas
      if (!bgCtx || !maskCtx || !previewCtx || !permanentCtx) return;

      bgCtx.drawImage(img, 0, 0, width, height);
      console.log('Background canvas drawn');

      // Initialize mask canvas with white circle on black background
      maskCtx.fillStyle = 'black';
      maskCtx.fillRect(0, 0, width, height);
      maskCtx.fillStyle = 'white';
      maskCtx.beginPath();
      maskCtx.arc(width/2, height/2, width/4, 0, Math.PI * 2);
      maskCtx.fill();
      console.log('Mask canvas initialized with circle');

      // Clear preview canvas
      previewCtx.clearRect(0, 0, width, height);
      
      // Draw the background image to preview canvas
      previewCtx.drawImage(backgroundCanvas, 0, 0);
      console.log('Preview canvas: background image drawn');

      // Create an SVG element that will contain our mask
      const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svgElement.setAttribute('width', '100%');
      svgElement.setAttribute('height', '100%');
      svgElement.setAttribute('viewBox', `0 0 ${width} ${height}`);
      svgElement.style.position = 'absolute';
      svgElement.style.top = '0';
      svgElement.style.left = '0';
      svgElement.style.width = '100%';
      svgElement.style.height = '100%';
      svgElement.style.pointerEvents = 'none';
      svgElement.style.zIndex = '1';
      
      // Create the mask element
      const maskElement = document.createElementNS('http://www.w3.org/2000/svg', 'mask');
      maskElement.id = `mask-${shape.id}`;
      
      // Create a white rectangle as the base of the mask
      const whiteRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      whiteRect.setAttribute('width', '100%');
      whiteRect.setAttribute('height', '100%');
      whiteRect.setAttribute('fill', 'white');
      maskElement.appendChild(whiteRect);
      
      // Create a black circle to mask out the area
      const blackCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      blackCircle.setAttribute('cx', '50%');
      blackCircle.setAttribute('cy', '50%');
      blackCircle.setAttribute('r', '25%');
      blackCircle.setAttribute('fill', 'black');
      maskElement.appendChild(blackCircle);
      
      // Add the mask to the SVG
      const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      defs.appendChild(maskElement);
      svgElement.appendChild(defs);
      
      // Find the shape's container and append the SVG to it
      const shapeContainer = previewCanvas.parentElement;
      if (shapeContainer) {
        shapeContainer.appendChild(svgElement);
      }
      
      // Apply the mask to the preview canvas
      previewCanvas.style.mask = `url(#mask-${shape.id})`;
      previewCanvas.style.webkitMask = `url(#mask-${shape.id})`;
      console.log('Preview canvas: SVG mask applied');

      // Clean up any existing SVG masks with the same ID
      return () => {
        const existingSvg = document.querySelector(`svg:has(#mask-${shape.id})`);
        if (existingSvg) {
          existingSvg.remove();
        }
      };

      // Log canvas states
      console.log('Canvas states:', {
        background: {
          width: backgroundCanvas.width,
          height: backgroundCanvas.height,
          hasContent: bgCtx.getImageData(0, 0, width, height).data.some(pixel => pixel !== 0)
        },
        mask: {
          width: maskCanvas.width,
          height: maskCanvas.height,
          hasContent: maskCtx.getImageData(0, 0, width, height).data.some(pixel => pixel !== 0)
        },
        preview: {
          width: previewCanvas.width,
          height: previewCanvas.height,
          hasContent: previewCtx.getImageData(0, 0, width, height).data.some(pixel => pixel !== 0),
          style: {
            visibility: previewCanvas.style.visibility,
            mask: previewCanvas.style.mask,
            webkitMask: previewCanvas.style.webkitMask,
            position: previewCanvas.style.position,
            top: previewCanvas.style.top,
            left: previewCanvas.style.left
          }
        },
        svg: {
          width: svgElement.getAttribute('width'),
          height: svgElement.getAttribute('height'),
          position: svgElement.style.position,
          top: svgElement.style.top,
          left: svgElement.style.left
        }
      });

      // If we have existing canvas data, restore it to the permanent canvas
      if (shape.canvasData) {
        console.log('Restoring existing canvas data');
        const savedImg = new Image();
        savedImg.onload = () => {
          if (!permanentCtx || !previewCtx) return;
          permanentCtx.drawImage(savedImg, 0, 0);
          previewCtx.drawImage(savedImg, 0, 0);
          console.log('Existing canvas data restored');
        };
        savedImg.src = shape.canvasData || '';
      }
    };
    img.src = shape.imageUrl;
  }, [shape.imageUrl, updateShape, shape.id, shape.canvasData, shape.isImageEditing]);

  // Handle clearing strokes
  const handleClear = () => {
    if (!permanentStrokesCanvasRef.current || !previewCanvasRef.current) return;
    const ctx = permanentStrokesCanvasRef.current.getContext('2d', { willReadFrequently: true });
    const previewCtx = previewCanvasRef.current.getContext('2d', { willReadFrequently: true });
    if (!ctx || !previewCtx) return;
    
    ctx.clearRect(0, 0, permanentStrokesCanvasRef.current.width, permanentStrokesCanvasRef.current.height);
    previewCtx.clearRect(0, 0, previewCanvasRef.current.width, previewCanvasRef.current.height);
    
    // When clearing strokes, set canvasData to undefined
    updateShape(shape.id, { canvasData: undefined });
  };

  // Set up subscriptions for each process type
  useEffect(() => {
    const processTypes = ["depth", "edge", "pose", "sketch"];

    processTypes.forEach((processType) => {
      if (shape[`show${processType.charAt(0).toUpperCase() + processType.slice(1)}` as keyof Shape]) {
        const channelName = `preprocessing_${shape.id}_${processType}`;

        if (!subscriptionRef.current[channelName]) {
          const subscription = supabase
            .channel(channelName)
            .on(
              "postgres_changes",
              {
                event: "UPDATE",
                schema: "public",
                table: "preprocessed_images",
                filter: `shapeId=eq.${shape.id}`,
              },
              (payload: PreprocessedImagePayload) => {
                if (
                  payload.new.status === "completed" &&
                  payload.new.processType === processType
                ) {
                  const urlKey = `${processType}Url`;
                  const previewUrlKey = `${processType}PreviewUrl`;

                  updateShape(shape.id, {
                    [previewUrlKey]: payload.new[urlKey],
                  });
                }
              }
            )
            .subscribe();

          subscriptionRef.current[channelName] = subscription;
        }
      }
    });

    return () => {
      Object.values(subscriptionRef.current).forEach((subscription) => {
        if (subscription && typeof subscription.unsubscribe === 'function') {
          subscription.unsubscribe();
        }
      });
      subscriptionRef.current = {};
    };
  }, [shape, updateShape]);

  return (
    <div className="relative w-full h-full">
      {shape.isImageEditing ? (
        <ImageEditor shape={shape} updateShape={updateShape} />
      ) : (
        <>
          <canvas
            ref={backgroundCanvasRef}
            className="absolute w-full h-full object-cover"
            style={{
              touchAction: "none",
              pointerEvents: "none",
              visibility: "hidden"
            }}
          />
          <canvas
            ref={permanentStrokesCanvasRef}
            className="absolute w-full h-full object-cover"
            style={{
              touchAction: "none",
              pointerEvents: "none",
              visibility: "hidden"
            }}
          />
          <canvas
            ref={activeStrokeCanvasRef}
            className="absolute w-full h-full object-cover"
            style={{
              touchAction: "none",
              pointerEvents: "none",
              visibility: "hidden"
            }}
          />
          <canvas
            ref={maskCanvasRef}
            className="absolute w-full h-full object-cover"
            style={{
              touchAction: "none",
              pointerEvents: "none",
              visibility: "hidden"
            }}
          />
          <canvas
            ref={previewCanvasRef}
            data-shape-id={shape.id}
            className="absolute w-full h-full object-cover"
            style={{
              touchAction: "none",
              pointerEvents: tool === "select" ? "none" : "all",
              visibility: "visible"
            }}
            onContextMenu={handleContextMenu}
            onPointerDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              e.currentTarget.setPointerCapture(e.pointerId);
              handlePointerDown(e);
            }}
            onPointerMove={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handlePointerMove(e);
            }}
            onPointerUp={(e) => {
              e.stopPropagation();
              e.preventDefault();
              if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                e.currentTarget.releasePointerCapture(e.pointerId);
              }
              handlePointerUpOrLeave();
            }}
            onPointerLeave={(e) => {
              e.stopPropagation();
              e.preventDefault();
              if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                e.currentTarget.releasePointerCapture(e.pointerId);
              }
              handlePointerUpOrLeave();
            }}
            onPointerCancel={(e) => {
              e.stopPropagation();
              e.preventDefault();
              if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                e.currentTarget.releasePointerCapture(e.pointerId);
              }
              handlePointerUpOrLeave();
            }}
          />
          {/* Processed layers (depth, edge, pose, etc.) */}
          {shape.showSketch && shape.sketchPreviewUrl && (
            <img
              src={shape.sketchPreviewUrl}
              alt="Sketch"
              className="absolute w-full h-full object-cover"
              style={{ opacity: shape.sketchStrength || 0.5 }}
              draggable={false}
            />
          )}
          {(tool === "brush" || tool === "eraser") && (
            <button
              className="absolute -bottom-6 right-0 text-xs px-1.5 py-0.5 bg-gray-300 text-gray-800 rounded hover:bg-red-600 transition-colors"
              style={{ pointerEvents: "all" }}
              onClick={handleClear}
            >
              Reset
            </button>
          )}
        </>
      )}
    </div>
  );
};
