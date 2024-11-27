import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useStore } from '../store';
import { Shape } from '../types';
import { supabase } from '../lib/supabase';

interface ShapeControlsProps {
    shape: Shape;
    isSelected: boolean;
    isEditing: boolean;
    handleResizeStart: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export function ShapeControls({
    shape,
    isSelected,
    isEditing,
    handleResizeStart,
}: ShapeControlsProps) {
    const { updateShape, shapes } = useStore();
    const tool = useStore(state => state.tool);
    const generatePreprocessedImage = useStore(state => state.generatePreprocessedImage);
    const depthProcessing = useStore(state => state.preprocessingStates[shape.id]?.depth);
    const edgeProcessing = useStore(state => state.preprocessingStates[shape.id]?.edge);
    const poseProcessing = useStore(state => state.preprocessingStates[shape.id]?.pose);
    const scribbleProcessing = useStore(state => state.preprocessingStates[shape.id]?.scribble);

    // Define controls array
    const controls = [
        {
            type: 'Original',
            preview: shape.imageUrl,
            showKey: null,
            strengthKey: null,
        },
        {
            type: 'Depth',
            preview: shape.depthPreviewUrl,
            showKey: 'showDepth',
            strengthKey: 'depthStrength',
            isProcessing: depthProcessing,
            processType: 'depth',
            preprocessor: 'MiDaS'
        },
        {
            type: 'Edges',
            preview: shape.edgePreviewUrl,
            showKey: 'showEdges',
            strengthKey: 'edgesStrength',
            isProcessing: edgeProcessing,
            processType: 'edge',
            preprocessor: 'Canny'
        },
        {
            type: 'Pose',
            preview: shape.posePreviewUrl,
            showKey: 'showPose',
            strengthKey: 'poseStrength',
            isProcessing: poseProcessing,
            processType: 'pose',
            preprocessor: 'OpenPose'
        },
        {
            type: 'Scribble',
            preview: shape.scribblePreviewUrl,
            showKey: 'showScribble',
            strengthKey: 'scribbleStrength',
            isProcessing: scribbleProcessing,
            processType: 'scribble',
            preprocessor: 'Scribble'
        }
    ];

    const showManipulationControls = isSelected;
    const anyCheckboxChecked = shape.showDepth ||
        shape.showEdges ||
        shape.showContent ||
        shape.showPose ||
        shape.showPrompt ||
        shape.showNegativePrompt ||
        shape.showScribble;
    const showControlPanel = isSelected || anyCheckboxChecked || shape.useSettings;

    if (!showControlPanel) return null;

    const handleCheckboxChange = async (control: typeof controls[0], e: React.ChangeEvent<HTMLInputElement>) => {
        e.stopPropagation();
        if (!control.showKey || !control.processType) return;

        const previewUrl = shape[`${control.processType}PreviewUrl`];
        const isChecked = e.target.checked;

        if (isChecked) {
            // Uncheck other images' same control
            shapes.forEach(otherShape => {
                if (otherShape.id !== shape.id && (otherShape.type === 'image' || otherShape.type === 'canvas')) {
                    const showKey = control.showKey as keyof Shape;
                    if (otherShape[showKey]) {
                        updateShape(otherShape.id, { [control.showKey]: false });
                    }
                }
            });
        }

        // Handle scribble specially
        if (control.processType === 'scribble') {
            updateShape(shape.id, {
                [control.showKey]: isChecked,
                scribblePreviewUrl: isChecked ? shape.imageUrl : null
            });
            return;
        }

        // Update the checkbox state immediately
        updateShape(shape.id, { [control.showKey]: isChecked });

        // Generate preview if needed
        if (isChecked && !previewUrl) {
            try {
                await generatePreprocessedImage(shape.id, control.processType);
            } catch (error) {
                console.error('Failed to generate preprocessed image:', error);
                updateShape(shape.id, { [control.showKey]: false });
            }
        }
    };

    return (
        <div className="absolute inset-0" style={{ pointerEvents: 'none' }}>
            {/* Side Controls Panel */}
            {(shape.type === 'image' || shape.type === 'sketchpad') && showControlPanel && (
                <div
                    className="absolute left-full ml-2 top-0 bg-white rounded-md border border-gray-200 shadow-sm"
                    style={{ zIndex: 101, pointerEvents: 'all', width: '200px' }}
                >
                    {controls.map((control) => (
                        <div key={control.type} className="p-1.5 border-b border-gray-100 last:border-b-0">
                            <div className="flex items-center gap-2">
                                {/* Preview Image */}
                                <div className="w-8 h-8 bg-gray-50 rounded overflow-hidden flex-shrink-0">
                                    {control.isProcessing ? (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                                        </div>
                                    ) : control.preview ? (
                                        <img
                                            src={control.preview}
                                            alt={`${control.type} preview`}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : null}
                                </div>

                                <div className="flex-grow min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-1">
                                            <span className="text-xs font-medium text-gray-700 truncate">
                                                {control.type}
                                            </span>
                                        </div>

                                        {control.showKey && (
                                            <div
                                                onClick={(e) => e.stopPropagation()}
                                                style={{ pointerEvents: 'all' }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={shape[control.showKey] || false}
                                                    onChange={(e) => handleCheckboxChange(control, e)}
                                                    className="w-3 h-3 rounded border-gray-300 text-blue-600 focus:ring-1 focus:ring-blue-500"
                                                    style={{ pointerEvents: 'all' }}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {control.strengthKey && (
                                        <div onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="range"
                                                min="0"
                                                max="1"
                                                step="0.05"
                                                value={shape[control.strengthKey] ?? 0.5}
                                                onChange={(e) => updateShape(shape.id, {
                                                    [control.strengthKey]: parseFloat(e.target.value)
                                                })}
                                                className="mini-slider"
                                                style={{ pointerEvents: 'all' }}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Resize handle */}
            {showManipulationControls && (
                <div
                    className="absolute -right-1.5 -bottom-1.5 w-3 h-3 bg-white border border-blue-500 rounded-full cursor-se-resize"
                    style={{ zIndex: 101, pointerEvents: 'all' }}
                    onMouseDown={handleResizeStart}
                />
            )}

            {/* Color picker for non-image/canvas/sticky shapes */}
            {shape.type !== 'image' &&
                shape.type !== 'sketchpad' &&
                shape.type !== 'group' &&
                shape.type !== 'sticky' && (
                    <input
                        type="color"
                        value={shape.color}
                        onChange={(e) => updateShape(shape.id, { color: e.target.value })}
                        className="absolute -left-6 top-1/2 w-4 h-4 cursor-pointer transform -translate-y-1/2"
                        style={{ zIndex: 101, pointerEvents: 'all' }}
                    />
                )}

            {/* Color picker for sketchpad shapes */}
            {shape.type === 'sketchpad' && (
                <input
                    type="color"
                    value={shape.color || '#000000'}
                    onChange={(e) => updateShape(shape.id, { color: e.target.value })}
                    className="absolute -left-6 top-1/2 w-4 h-4 cursor-pointer transform -translate-y-1/2"
                    style={{ zIndex: 101, pointerEvents: 'all' }}
                />
            )}

            {/* Diffusion Settings controls */}
            {shape.type === 'diffusionSettings' && (
                <div
                    className="absolute left-1/2 top-full mt-1 bg-white p-1.5 rounded border border-gray-200 transform -translate-x-1/2"
                    style={{ zIndex: 101, pointerEvents: 'all', width: '160px' }}
                >
                    <div className="flex items-center gap-1.5">
                        <input
                            type="checkbox"
                            id={`use-settings-${shape.id}`}
                            checked={shape.useSettings || false}
                            onChange={(e) => {
                                if (e.target.checked) {
                                    // Uncheck other diffusionSettings shapes
                                    shapes.forEach(otherShape => {
                                        if (otherShape.type === 'diffusionSettings' && otherShape.id !== shape.id) {
                                            updateShape(otherShape.id, { useSettings: false });
                                        }
                                    });
                                }
                                updateShape(shape.id, { useSettings: e.target.checked });
                            }}
                            className="w-3 h-3 cursor-pointer"
                        />
                        <label htmlFor={`use-settings-${shape.id}`} className="text-xs text-gray-700 cursor-pointer whitespace-nowrap">
                            Use Settings
                        </label>
                    </div>
                </div>
            )}

            {/* Sticky note controls */}
            {shape.type === 'sticky' && (
                <div
                    className="absolute left-1/2 top-full mt-1 bg-white p-1.5 rounded border border-gray-200 transform -translate-x-1/2"
                    style={{ zIndex: 101, pointerEvents: 'all', width: '160px' }}
                >
                    <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5">
                            <input
                                type="checkbox"
                                id={`prompt-${shape.id}`}
                                checked={shape.showPrompt || false}
                                onChange={(e) => {
                                    if (e.target.checked) {
                                        if (shape.showNegativePrompt) {
                                            updateShape(shape.id, { showNegativePrompt: false });
                                        }
                                        shapes.forEach(otherShape => {
                                            if (otherShape.type === 'sticky' && otherShape.showPrompt) {
                                                updateShape(otherShape.id, {
                                                    showPrompt: false,
                                                    color: otherShape.showNegativePrompt ? '#ffcccb' : '#fff9c4'
                                                });
                                            }
                                        });
                                        updateShape(shape.id, {
                                            showPrompt: true,
                                            color: '#90EE90'
                                        });
                                    } else {
                                        updateShape(shape.id, {
                                            showPrompt: false,
                                            color: shape.showNegativePrompt ? '#ffcccb' : '#fff9c4'
                                        });
                                    }
                                }}
                                className="w-3 h-3 cursor-pointer"
                            />
                            <label htmlFor={`prompt-${shape.id}`} className="text-xs text-gray-700 cursor-pointer whitespace-nowrap">
                                Text Prompt
                            </label>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <input
                                type="checkbox"
                                id={`negative-${shape.id}`}
                                checked={shape.showNegativePrompt || false}
                                onChange={(e) => {
                                    if (e.target.checked) {
                                        if (shape.showPrompt) {
                                            updateShape(shape.id, { showPrompt: false });
                                        }
                                        shapes.forEach(otherShape => {
                                            if (otherShape.type === 'sticky' && otherShape.showNegativePrompt) {
                                                updateShape(otherShape.id, {
                                                    showNegativePrompt: false,
                                                    color: otherShape.showPrompt ? '#90EE90' : '#fff9c4'
                                                });
                                            }
                                        });
                                        updateShape(shape.id, {
                                            showNegativePrompt: true,
                                            color: '#ffcccb'
                                        });
                                    } else {
                                        updateShape(shape.id, {
                                            showNegativePrompt: false,
                                            color: shape.showPrompt ? '#90EE90' : '#fff9c4'
                                        });
                                    }
                                }}
                                className="w-3 h-3 cursor-pointer"
                            />
                            <label htmlFor={`negative-${shape.id}`} className="text-xs text-gray-700 cursor-pointer whitespace-nowrap">
                                Negative Prompt
                            </label>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}