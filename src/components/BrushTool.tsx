import { useRef, useEffect } from 'react';
import { useStore } from '../store';

// Move this outside the hook
const brushTextures = new Map<string, HTMLImageElement>();

const useBrush = (canvasRef: React.RefObject<HTMLCanvasElement>) => {
    const isDrawing = useRef(false);
    const lastPoint = useRef<{ x: number, y: number } | null>(null);

    const { currentColor, brushSize, brushOpacity, tool, brushTexture } = useStore();

    useEffect(() => {
        // Preload brush textures
        const BRUSH_TEXTURES = [
            'basic',
            'fur',
            'ink',
            'marker'
        ];

        console.log('Starting texture loading...');
        BRUSH_TEXTURES.forEach(texture => {
            console.log(`Attempting to load texture: ${texture}`);
            const img = new Image();
            img.src = `/brushes/${texture}.png`;
            img.onload = () => {
                console.log(`Successfully loaded texture: ${texture}, dimensions:`, img.width, 'x', img.height);
                brushTextures.set(texture, img);
                console.log('Current brushTextures size:', brushTextures.size);
            };
            img.onerror = () => {
                console.error(`Failed to load texture: ${texture}`);
            };
        });
    }, []);

    const drawBrushStroke = (start: { x: number, y: number }, end: { x: number, y: number }) => {
        console.log('Drawing stroke with:', {
            brushTexture,
            currentColor,
            brushSize,
            brushOpacity
        });

        const ctx = canvasRef.current?.getContext('2d');
        console.log('Canvas context:', !!ctx);
        if (!ctx) return;

        const textureImg = brushTextures.get(brushTexture);
        console.log('Found texture:', !!textureImg, 'Complete:', textureImg?.complete);
        if (!textureImg || !textureImg.complete) return;

        // Create temp canvas for colorizing
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) return;
        tempCanvas.width = textureImg.width;
        tempCanvas.height = textureImg.height;

        // Draw and colorize brush texture
        tempCtx.fillStyle = currentColor;
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        tempCtx.globalCompositeOperation = 'destination-in';
        tempCtx.drawImage(textureImg, 0, 0);

        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const spacing = brushSize * 0.2;
        const steps = Math.max(Math.floor(distance / spacing), 1);

        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const x = start.x + dx * t;
            const y = start.y + dy * t;

            ctx.save();
            ctx.translate(x, y);
            ctx.globalAlpha = brushOpacity;
            ctx.drawImage(tempCanvas, -brushSize / 2, -brushSize / 2, brushSize, brushSize);
            ctx.restore();
        }
    };

    const handlePointerDown = (e: React.PointerEvent) => {
        console.log('Pointer down, tool:', tool);
        if (tool !== 'brush' && tool !== 'eraser') return;
        e.preventDefault();

        isDrawing.current = true;
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;

        const x = (e.clientX - rect.left) * (512 / rect.width);
        const y = (e.clientY - rect.top) * (512 / rect.height);

        lastPoint.current = { x, y };
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDrawing.current || !lastPoint.current) return;
        if (tool !== 'brush' && tool !== 'eraser') return;

        console.log('Drawing from:', lastPoint.current, 'Current position:', {
            x: e.clientX,
            y: e.clientY
        });
        e.preventDefault();

        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;

        const x = (e.clientX - rect.left) * (512 / rect.width);
        const y = (e.clientY - rect.top) * (512 / rect.height);

        drawBrushStroke(lastPoint.current, { x, y });
        lastPoint.current = { x, y };
    };

    const handlePointerUpOrLeave = () => {
        isDrawing.current = false;
        lastPoint.current = null;
    };

    return {
        handlePointerDown,
        handlePointerMove,
        handlePointerUpOrLeave
    };
};

export { useBrush };