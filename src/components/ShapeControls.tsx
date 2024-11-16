import React from 'react';
import { RotateCw } from 'lucide-react';
import { useStore } from '../store';
import { Shape } from '../types';

interface ShapeControlsProps {
    shape: Shape;
    isSelected: boolean;
    isEditing: boolean;
    handleResizeStart: (e: React.MouseEvent<HTMLDivElement>) => void;
    handleRotateStart: (e: React.MouseEvent<HTMLDivElement>) => void;
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

    // Hide controls if editing or wrong tool
    if (isEditing || tool !== 'select') return null;

    // Show resize/rotate controls only when selected
    const showManipulationControls = isSelected;

    const anyCheckboxChecked = shape.showDepth || shape.showEdges || shape.showContent || shape.showPose || shape.showPrompt;
    const showControlPanel = isSelected || anyCheckboxChecked;

    // Show controls if selected OR if any checkbox is checked
    if (!showControlPanel) return null;

    return (
        <div className="absolute inset-0" style={{ pointerEvents: 'none' }}>
            {/* Resize handle */}
            {showManipulationControls && (
                <div
                    className="absolute -right-2 -bottom-2 w-4 h-4 bg-white border-2 border-blue-500 rounded-full cursor-se-resize"
                    style={{ zIndex: 101, pointerEvents: 'all' }}
                    onMouseDown={handleResizeStart}
                />
            )}

            {/* Rotate handle - hide for groups */}
            {showManipulationControls && shape.type !== 'sticky' && shape.type !== 'group' && (
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
            )}

            {/* Color picker - hide for groups */}
            {shape.type !== 'image' && shape.type !== 'canvas' && shape.type !== 'group' && (
                <input
                    type="color"
                    value={shape.color}
                    onChange={(e) => updateShape(shape.id, { color: e.target.value })}
                    className="absolute -left-8 top-1/2 w-6 h-6 cursor-pointer transform -translate-y-1/2"
                    style={{ zIndex: 101, pointerEvents: 'all' }}
                />
            )}

            {/* Image/Canvas controls */}
            {(shape.type === 'image' || shape.type === 'canvas') && showControlPanel && (
                <div
                    className="absolute left-1/2 top-full mt-2 bg-white p-2 rounded border border-gray-200 transform -translate-x-1/2"
                    style={{ zIndex: 101, pointerEvents: 'all', width: '220px' }}
                >
                    <div className="flex flex-col gap-2">
                        {['Depth', 'Edges', 'Content', 'Pose'].map((controlType) => (
                            <div key={controlType} className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id={`${controlType.toLowerCase()}-${shape.id}`}
                                    checked={controlType === 'Depth' ? shape.showPrompt : shape[`show${controlType}`] || false}
                                    onChange={(e) => {
                                        if (e.target.checked && controlType !== 'Content') {
                                            shapes.forEach(otherShape => {
                                                if ((otherShape.type === 'image' || otherShape.type === 'canvas') &&
                                                    otherShape.id !== shape.id) {
                                                    if (controlType === 'Depth') {
                                                        if (otherShape.showPrompt) {
                                                            updateShape(otherShape.id, { showPrompt: false });
                                                        }
                                                    } else if (otherShape[`show${controlType}`]) {
                                                        updateShape(otherShape.id, { [`show${controlType}`]: false });
                                                    }
                                                }
                                            });
                                        }

                                        if (controlType === 'Depth') {
                                            updateShape(shape.id, { showPrompt: e.target.checked });
                                        } else {
                                            updateShape(shape.id, { [`show${controlType}`]: e.target.checked });
                                        }
                                    }}
                                    className="cursor-pointer"
                                />
                                <label
                                    htmlFor={`${controlType.toLowerCase()}-${shape.id}`}
                                    className="text-sm text-gray-700 cursor-pointer whitespace-nowrap flex-grow"
                                >
                                    {controlType}
                                </label>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.05"
                                    value={shape[`${controlType.toLowerCase()}Strength`] ?? 0.5}
                                    onChange={(e) => updateShape(shape.id, {
                                        [`${controlType.toLowerCase()}Strength`]: parseFloat(e.target.value)
                                    })}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    className="w-16"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {/* Sticky note prompt controls */}
            {shape.type === 'sticky' && (
                <div className="absolute left-1/2 top-full mt-2 bg-white p-2 rounded border border-gray-200 transform -translate-x-1/2"
                    style={{ zIndex: 101, pointerEvents: 'all', width: '180px' }}>
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