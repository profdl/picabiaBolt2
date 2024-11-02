import { useRef, useEffect } from 'react';
import { useStore } from '../store';

export const useBrush = (canvasRef: React.RefObject<HTMLCanvasElement>) => {
    const brushTexture = useRef<HTMLImageElement>();
    const isDrawing = useRef(false);
    const lastPoint = useRef<{ x: number, y: number } | null>(null);

    const { currentColor, brushSize, brushOpacity, tool } = useStore();

    useEffect(() => {
        brushTexture.current = new Image();
        brushTexture.current.onload = () => {
            console.log('Brush texture loaded successfully');
        };
        brushTexture.current.src = '/public/brushes/brushDots01.png';  // Update path based on your project structure
    }, []);

    const drawBrushStroke = (start: { x: number, y: number }, end: { x: number, y: number }) => {
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx || !brushTexture.current || !brushTexture.current.complete) return;

        // Create temp canvas for colorizing
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = brushTexture.current.width;
        tempCanvas.height = brushTexture.current.height;

        // Draw and colorize brush texture
        tempCtx.fillStyle = currentColor;
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        tempCtx.globalCompositeOperation = 'destination-in';
        tempCtx.drawImage(brushTexture.current, 0, 0);

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
        if (tool !== 'brush') return;
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
