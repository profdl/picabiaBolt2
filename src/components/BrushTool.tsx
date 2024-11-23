import { useRef, useEffect } from 'react';
import { useStore } from '../store';
const brushTextures = new Map<string, HTMLImageElement>();

interface Point {
    x: number;
    y: number;
    angle?: number;

}

const useBrush = (canvasRef: React.RefObject<HTMLCanvasElement>) => {
    const isDrawing = useRef(false);
    const lastPoint = useRef<Point | null>(null);
    const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const strokeCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const accumulatedDistance = useRef(0); // Accumulates distance between points
    const { brushFollowPath,
        currentColor, brushSize, brushOpacity, tool, brushTexture, brushSpacing, brushRotation } = useStore();

    useEffect(() => {
        if (!canvasRef.current) return;

        // Initialize overlay canvas
        overlayCanvasRef.current = document.createElement('canvas');
        overlayCanvasRef.current.width = 512;
        overlayCanvasRef.current.height = 512;

        // Initialize stroke canvas
        strokeCanvasRef.current = document.createElement('canvas');
        strokeCanvasRef.current.width = 512;
        strokeCanvasRef.current.height = 512;

        // Initialize with black background
        const strokeCtx = strokeCanvasRef.current.getContext('2d');
        if (strokeCtx) {
            strokeCtx.fillStyle = '#000000';
            strokeCtx.fillRect(0, 0, 512, 512);
        }

        // Preload brush textures
        const BRUSH_TEXTURES = ['basic', 'fur', 'ink', 'marker'];
        BRUSH_TEXTURES.forEach((texture) => {
            const img = new Image();
            img.src = `/brushes/${texture}.png`;
            img.onload = () => {
                brushTextures.set(texture, img);
            };
            img.onerror = () => {
                console.error(`Failed to load texture: ${texture}`);
            };
        });
    }, []);

    const getScaledPoint = (e: React.PointerEvent<HTMLCanvasElement>): Point | null => {
        const canvas = canvasRef.current;
        if (!canvas) return null;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (tool !== 'brush' && tool !== 'eraser') return;
        e.preventDefault();

        const point = getScaledPoint(e);
        if (!point) return;

        isDrawing.current = true;
        lastPoint.current = point;

        // Clear overlay canvas at the start of a new stroke
        const overlayCtx = overlayCanvasRef.current?.getContext('2d');
        if (overlayCtx) {
            overlayCtx.clearRect(0, 0, 512, 512);
        }

        // Draw initial dot
        drawBrushDot(overlayCanvasRef.current!, point);

        // Update display
        updateMainCanvas();
    };



    // Handle pointer move
    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!isDrawing.current || !lastPoint.current) return;
        if (tool !== 'brush' && tool !== 'eraser') return;
        e.preventDefault();

        const point = getScaledPoint(e);
        if (!point) return;

        const dx = point.x - lastPoint.current.x;
        const dy = point.y - lastPoint.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        accumulatedDistance.current += distance;

        // Determine the number of stamps needed based on accumulated distance and brush spacing
        const spacing = Math.max(brushSize * brushSpacing, 1);
        if (accumulatedDistance.current >= spacing) {
            // Draw the stroke segment directly onto the overlay canvas
            const overlayCtx = overlayCanvasRef.current?.getContext('2d');
            if (overlayCtx && lastPoint.current) {
                // Draw stamps along the accumulated distance path
                drawBrushStroke(overlayCtx, lastPoint.current, point, accumulatedDistance.current, spacing);
            }

            // Reset accumulated distance after drawing
            accumulatedDistance.current = 0;
        }

        // Update main canvas display
        updateMainCanvas();

        lastPoint.current = point;
    };


    const handlePointerUpOrLeave = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!isDrawing.current) return;

        // Merge the complete stroke from overlay to stroke canvas
        const strokeCtx = strokeCanvasRef.current?.getContext('2d');
        if (strokeCtx && overlayCanvasRef.current) {
            // Add these lines to preserve opacity
            strokeCtx.save();
            strokeCtx.globalAlpha = brushOpacity;
            strokeCtx.drawImage(overlayCanvasRef.current, 0, 0);
            strokeCtx.restore();
        }

        // Clear the overlay canvas
        const overlayCtx = overlayCanvasRef.current?.getContext('2d');
        if (overlayCtx) {
            overlayCtx.clearRect(0, 0, 512, 512);
        }

        // Final update to main canvas
        updateMainCanvas();

        isDrawing.current = false;
        lastPoint.current = null;
    };

    const updateMainCanvas = () => {
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx || !strokeCanvasRef.current || !overlayCanvasRef.current) return;

        // Clear main canvas
        ctx.clearRect(0, 0, 512, 512);

        // Draw black background
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, 512, 512);

        // Draw completed strokes
        ctx.drawImage(strokeCanvasRef.current, 0, 0);

        // Draw curre nt stroke with opacity
        ctx.save();
        ctx.globalAlpha = brushOpacity;
        ctx.drawImage(overlayCanvasRef.current, 0, 0);
        ctx.restore();
    };

    // Replace the drawBrushDot function with this updated version
    const drawBrushDot = (canvas: HTMLCanvasElement, point: Point) => {
        const ctx = canvas.getContext('2d');
        const textureImg = brushTextures.get(brushTexture);
        if (!ctx || !textureImg || !textureImg.complete) return;

        ctx.save();
        if (tool === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out';
        } else {
            ctx.globalCompositeOperation = 'source-over';

            // Apply rotation transformation
            ctx.translate(point.x, point.y);
            ctx.rotate(brushRotation * Math.PI / 180);
            ctx.translate(-brushSize / 2, -brushSize / 2);

            // Create temporary canvas for colored texture
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = brushSize;
            tempCanvas.height = brushSize;
            const tempCtx = tempCanvas.getContext('2d');
            if (tempCtx) {
                tempCtx.fillStyle = currentColor;
                tempCtx.fillRect(0, 0, brushSize, brushSize);
                tempCtx.globalCompositeOperation = 'destination-in';
                tempCtx.drawImage(textureImg, 0, 0, brushSize, brushSize);

                // Draw the colored texture to main canvas
                ctx.drawImage(tempCanvas, 0, 0);
            }
        }
        ctx.restore();
    };

    const drawBrushStamp = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
        const textureImg = brushTextures.get(brushTexture);
        if (!textureImg || !textureImg.complete) return;

        // Create temporary canvas for colored texture
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = brushSize;
        tempCanvas.height = brushSize;
        const tempCtx = tempCanvas.getContext('2d');

        if (tempCtx) {
            tempCtx.fillStyle = currentColor;
            tempCtx.fillRect(0, 0, brushSize, brushSize);
            tempCtx.globalCompositeOperation = 'destination-in';
            tempCtx.drawImage(textureImg, 0, 0, brushSize, brushSize);

            // Draw the colored texture to main canvas
            ctx.drawImage(tempCanvas, x, y);
        }
    };
    const drawBrushStroke = (
        ctx: CanvasRenderingContext2D,
        start: Point,
        end: Point
    ) => {
        const textureImg = brushTextures.get(brushTexture);
        if (!textureImg || !textureImg.complete) return;

        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const spacing = Math.max(brushSize * brushSpacing, 1);
        const pathAngle = Math.atan2(dy, dx);
        const steps = Math.ceil(distance / spacing);

        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const x = start.x + dx * t;
            const y = start.y + dy * t;

            ctx.save();
            ctx.translate(x, y);

            // Apply rotation based on mode
            const rotation = brushFollowPath
                ? pathAngle
                : (brushRotation * Math.PI / 180);

            ctx.rotate(rotation);
            ctx.translate(-brushSize / 2, -brushSize / 2);

            drawBrushStamp(ctx, 0, 0);
            ctx.restore();
        }
    };




    return {
        handlePointerDown,
        handlePointerMove,
        handlePointerUpOrLeave,
    };
};

export { useBrush };