import React, { useEffect, useState } from 'react';
import { Position, Shape } from '../types';
import { useStore } from '../store';

interface DragStartState {
    x: number;
    y: number;
    initialPositions: Map<string, Position>;
}

export function useShapeDrag(shape: Shape) {
    const { selectedShapes, setSelectedShapes, updateShape, shapes, zoom } = useStore();
    const [dragStart, setDragStart] = useState<DragStartState | null>(null);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0) return; // Only handle left click
        e.stopPropagation();

        // Store initial positions of all selected shapes
        const initialPositions = new Map<string, Position>();
        if (Array.isArray(selectedShapes)) {
            selectedShapes.forEach(id => {
                const shape = shapes.find(s => s.id === id);
                if (shape) {
                    initialPositions.set(id, { ...shape.position });
                }
            });
        }

        // Handle selection
        const currentSelected = Array.isArray(selectedShapes) ? selectedShapes : [];
        if (e.shiftKey) {
            const newSelection = currentSelected.includes(shape.id)
                ? currentSelected.filter(id => id !== shape.id)
                : [...currentSelected, shape.id];
            setSelectedShapes(newSelection);

            // Only set dragStart if the shape is in the new selection
            if (newSelection.includes(shape.id)) {
                setDragStart({
                    x: e.clientX,
                    y: e.clientY,
                    initialPositions
                });
            }
        } else {
            if (!currentSelected.includes(shape.id)) {
                setSelectedShapes([shape.id]);
            }
            setDragStart({
                x: e.clientX,
                y: e.clientY,
                initialPositions
            });
        }
    };

    useEffect(() => {
        if (!dragStart) return;

        const handleMouseMove = (e: MouseEvent) => {
            // Calculate the delta in screen coordinates
            const dx = (e.clientX - dragStart.x);
            const dy = (e.clientY - dragStart.y);

            // Apply the zoom factor to convert screen coordinates to canvas coordinates
            const scaledDx = dx / zoom;
            const scaledDy = dy / zoom;

            // Update all selected shapes
            if (Array.isArray(selectedShapes)) {
                selectedShapes.forEach(id => {
                    const initialPos = dragStart.initialPositions.get(id);
                    if (initialPos) {
                        updateShape(id, {
                            position: {
                                x: initialPos.x + scaledDx,
                                y: initialPos.y + scaledDy
                            }
                        });
                    }
                });
            }
        };

        const handleMouseUp = () => {
            setDragStart(null);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [dragStart, selectedShapes, updateShape, zoom]);

    return { handleMouseDown };
}