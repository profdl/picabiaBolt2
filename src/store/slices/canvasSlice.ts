import { StateCreator } from 'zustand';
import { Position, Shape } from '../../types';

export interface CanvasState {
    shapes: Shape[];
    setOffset: (offset: Position) => void;
    addShape: (shape: Shape) => void;

}

interface CanvasSlice {
    zoom: number;
    offset: Position;
    gridEnabled: boolean;
    gridSize: number;
    isDragging: boolean;
    setZoom: (newZoom: number, center?: Position) => void;
    setOffset: (offset: Position) => void;
    setIsDragging: (isDragging: boolean) => void;
    toggleGrid: () => void;
    centerOnShape: (shapeId: string) => void;
    addShape: (shape: Shape) => void;

}

export const canvasSlice: StateCreator<
    CanvasState & CanvasSlice,
    [],
    [],
    CanvasSlice
> = (set, get) => ({
    zoom: 1,
    offset: { x: 0, y: 0 },
    gridEnabled: true,
    gridSize: 20,
    isDragging: false,
    addShape: (shape: Shape) =>
        set(state => ({
            shapes: [...state.shapes, shape]
        })),
    setZoom: (newZoom: number, center?: Position) =>
        set(state => {
            if (!center) return { zoom: newZoom };

            const scale = newZoom / state.zoom;
            return {
                zoom: newZoom,
                offset: {
                    x: center.x - (center.x - state.offset.x) * scale,
                    y: center.y - (center.y - state.offset.y) * scale
                }
            };
        }),

    setOffset: (offset: Position) => set({ offset }),

    setIsDragging: (isDragging: boolean) => set({ isDragging }),

    toggleGrid: () => set(state => ({ gridEnabled: !state.gridEnabled })),

    centerOnShape: (shapeId: string) => {
        const shape = get().shapes.find(s => s.id === shapeId);
        if (!shape) return;

        const targetX = -(shape.position.x + shape.width / 2) * get().zoom + window.innerWidth / 2;
        const targetY = -(shape.position.y + shape.height / 2) * get().zoom + window.innerHeight / 2;
        const startOffset = get().offset;

        const animate = (progress: number) => {
            get().setOffset({
                x: startOffset.x + (targetX - startOffset.x) * progress,
                y: startOffset.y + (targetY - startOffset.y) * progress
            });
        };

        const duration = 500;
        const start = performance.now();

        const step = (currentTime: number) => {
            const progress = Math.min((currentTime - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);

            animate(eased);

            if (progress < 1) requestAnimationFrame(step);
        };

        requestAnimationFrame(step);
    }
});