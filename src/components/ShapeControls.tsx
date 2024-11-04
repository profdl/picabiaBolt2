import React from 'react';
import { RotateCw } from 'lucide-react';
import { useStore } from '../store';
import { Shape } from '../types';

interface ShapeControlsProps {
    shape: Shape;
    isSelected: boolean;
    isEditing: boolean;
    handleResizeStart: (e: React.MouseEvent) => void;
    handleRotateStart: (e: React.MouseEvent) => void;
}

export function ShapeControls({
    shape,
    isSelected,
    isEditing,
    handleResizeStart,
    handleRotateStart
}: ShapeControlsProps) {
    const { updateShape, shapes } = useStore();
    const tool = useStore(state => state.tool);

    if (!isSelected || isEditing || tool !== 'select') return null;

    return (
        <div className="absolute inset-0" style={{ pointerEvents: 'none' }}>
            {/* Resize handle */}
            <div
                className="absolute -right-2 -bottom-2 w-4 h-4 bg-white border-2 border-blue-500 rounded-full cursor-se-resize"
                style={{ zIndex: 101, pointerEvents: 'all' }}
                onMouseDown={handleResizeStart}
            />

            {/* Rotate handle */}
            <div
                className="absolute w-6 h-6 bg-white border-2 border-blue-500 rounded-full cursor-pointer hover:bg-blue-50 flex items-center justify-center"
                style={{
                    left: '50%',
                    top: -32,
                    transform: 'translateX(-50%)',
                    zIndex: 101,
                    pointerEvents: 'all'
                }}
                onMouseDown={handleRotateStart}
            >
                <RotateCw className="w-4 h-4 text-blue-500" />
            </div>

            {/* Color picker */}
            {shape.type !== 'image' && shape.type !== 'canvas' && (
                <input
                    type="color"
                    value={shape.color}
                    onChange={(e) => updateShape(shape.id, { color: e.target.value })}
                    className="absolute -left-8 top-1/2 w-6 h-6 cursor-pointer transform -translate-y-1/2"
                    style={{ zIndex: 101, pointerEvents: 'all' }}
                />
            )}

            {/* Image/Canvas prompt controls */}
            {(shape.type === 'image' || shape.type === 'canvas') && (
                <div
                    className="absolute left-1/2 top-full mt-2 bg-white p-2 rounded border border-gray-200 transform -translate-x-1/2"
                    style={{ zIndex: 101, pointerEvents: 'all', width: '180px' }}
                >
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id={`prompt-${shape.id}`}
                                checked={shape.showPrompt || false}
                                onChange={(e) => {
                                    if (e.target.checked) {
                                        shapes.forEach(otherShape => {
                                            if ((otherShape.type === 'image' || otherShape.type === 'canvas') && otherShape.showPrompt) {
                                                updateShape(otherShape.id, { showPrompt: false });
                                            }
                                        });
                                    }
                                    updateShape(shape.id, { showPrompt: e.target.checked });
                                }}
                                className="cursor-pointer"
                            />
                            <label htmlFor={`prompt-${shape.id}`} className="text-sm text-gray-700 cursor-pointer whitespace-nowrap">
                                Image Prompt
                            </label>
                        </div>

                        {shape.showPrompt && (
                            <div className="space-y-1">
                                <label className="block text-xs text-gray-600">
                                    Prompt Strength ({shape.promptStrength || 0.8})
                                </label>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.05"
                                    value={shape.promptStrength || 0.8}  // Default to 0.8 if undefined
                                    onChange={(e) => updateShape(shape.id, {
                                        promptStrength: parseFloat(e.target.value)
                                    })}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    className="w-full"
                                />
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Sticky note prompt controls */}
            {shape.type === 'sticky' && (
                <div
                    className="absolute left-1/2 top-full mt-2 bg-white p-2 rounded border border-gray-200 transform -translate-x-1/2"
                    style={{ zIndex: 101, pointerEvents: 'all', width: '180px' }}
                >
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id={`prompt-${shape.id}`}
                            checked={shape.showPrompt || false}
                            onChange={(e) => {
                                if (e.target.checked) {
                                    shapes.forEach(otherShape => {
                                        if (otherShape.type === 'sticky' && otherShape.showPrompt) {
                                            updateShape(otherShape.id, { showPrompt: false });
                                        }
                                    });
                                }
                                updateShape(shape.id, { showPrompt: e.target.checked });
                            }}
                            className="cursor-pointer"
                        />
                        <label htmlFor={`prompt-${shape.id}`} className="text-sm text-gray-700 cursor-pointer whitespace-nowrap">
                            Text Prompt
                        </label>
                    </div>
                </div>
            )}
        </div>
    );
}
