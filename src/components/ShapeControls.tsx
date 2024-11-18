import { useEffect } from 'react';
import { Eye, Loader2 } from 'lucide-react';
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

    useEffect(() => {
        const channel = supabase
            .channel('preprocessed_images')
            .on('postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'preprocessed_images' },
                (payload) => {
                    if (payload.new.status === 'completed') {
                        updateShape(payload.new.shapeId, {
                            [`${payload.new.processType}PreviewUrl`]: payload.new[`${payload.new.processType}Url`]
                        });
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);
    if (isEditing || tool !== 'select') return null;

    const showManipulationControls = isSelected;
    const anyCheckboxChecked = shape.showDepth || shape.showEdges || shape.showContent || shape.showPose || shape.showPrompt;
    const showControlPanel = isSelected || anyCheckboxChecked;

    if (!showControlPanel) return null;

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
            isProcessing: shape.isDepthProcessing,
            processType: 'depth' as const,
        },
        {
            type: 'Edges',
            preview: shape.edgePreviewUrl,
            showKey: 'showEdges',
            strengthKey: 'edgesStrength',
            isProcessing: shape.isEdgeProcessing,
            processType: 'edge' as const,
        },
        {
            type: 'Pose',
            preview: shape.posePreviewUrl,
            showKey: 'showPose',
            strengthKey: 'poseStrength',
            isProcessing: shape.isPoseProcessing,
            processType: 'pose' as const,
        }
    ];

    return (
        <div className="absolute inset-0" style={{ pointerEvents: 'none' }}>
            {/* Resize handle */}
            {showManipulationControls && (
                <div
                    className="absolute -right-1.5 -bottom-1.5 w-3 h-3 bg-white border border-blue-500 rounded-full cursor-se-resize"
                    style={{ zIndex: 101, pointerEvents: 'all' }}
                    onMouseDown={handleResizeStart}
                />
            )}

            {/* Side Controls Panel */}
            {(shape.type === 'image' || shape.type === 'canvas') && showControlPanel && (
                <div
                    className="absolute left-full ml-2 top-0 bg-white rounded-md border border-gray-200 shadow-sm"
                    style={{ zIndex: 101, pointerEvents: 'all', width: '200px' }}
                >
                    <style>
                        {`
                        .mini-slider {
                            height: 8px;
                            -webkit-appearance: none;
                            width: 100%;
                            background: transparent;
                            cursor: pointer;
                        }
                        
                        .mini-slider::-webkit-slider-runnable-track {
                            width: 100%;
                            height: 4px;
                            background: #e5e7eb;
                            border-radius: 4px;
                        }
                        
                        .mini-slider::-webkit-slider-thumb {
                            -webkit-appearance: none;
                            height: 12px;
                            width: 12px;
                            border-radius: 50%;
                            background: #3b82f6;
                            margin-top: -4px;
                            border: 1px solid white;
                        }
                        
                        .mini-slider::-moz-range-track {
                            width: 100%;
                            height: 4px;
                            background: #e5e7eb;
                            border-radius: 4px;
                        }
                        
                        .mini-slider::-moz-range-thumb {
                            height: 8px;
                            width: 8px;
                            border-radius: 50%;
                            background: #3b82f6;
                            border: 1px solid white;
                        }
                        
                        .mini-slider:focus {
                            outline: none;
                        }
                        
                        .mini-slider:focus::-webkit-slider-thumb {
                            box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
                        }
                        
                        .mini-slider:focus::-moz-range-thumb {
                            box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
                        }
                        `}
                    </style>
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
                                        {/* Eye Icon and Type Label */}
                                        <div className="flex items-center gap-1">
                                            <Eye className="w-3 h-3 text-gray-600" />
                                            <span className="text-xs font-medium text-gray-700 truncate">
                                                {control.type}
                                            </span>
                                        </div>

                                        {/* Checkbox */}
                                        {control.showKey && (
                                            <input
                                                type="checkbox"
                                                checked={shape[control.showKey] || false}
                                                onChange={async (e) => {
                                                    if (e.target.checked) {
                                                        try {
                                                            await generatePreprocessedImage(shape.id, control.processType);
                                                        } catch (error) {
                                                            console.error('Failed to generate and save preprocessed image:', error);
                                                            // Uncheck the box if processing failed
                                                            updateShape(shape.id, { [control.showKey]: false });
                                                        }
                                                    }
                                                    updateShape(shape.id, { [control.showKey]: e.target.checked });
                                                }}

                                                className="w-3 h-3 rounded border-gray-300 text-blue-600 focus:ring-1 focus:ring-blue-500"
                                            />
                                        )}
                                    </div>

                                    {/* Strength Slider */}
                                    {control.strengthKey && (
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
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Color picker for non-image/canvas shapes */}
            {shape.type !== 'image' && shape.type !== 'canvas' && shape.type !== 'group' && (
                <input
                    type="color"
                    value={shape.color}
                    onChange={(e) => updateShape(shape.id, { color: e.target.value })}
                    className="absolute -left-6 top-1/2 w-4 h-4 cursor-pointer transform -translate-y-1/2"
                    style={{ zIndex: 101, pointerEvents: 'all' }}
                />
            )}

            {/* Sticky note controls */}
            {shape.type === 'sticky' && (
                <div className="absolute left-1/2 top-full mt-1 bg-white p-1.5 rounded border border-gray-200 transform -translate-x-1/2"
                    style={{ zIndex: 101, pointerEvents: 'all', width: '140px' }}>
                    <div className="flex items-center gap-1.5">
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
                            className="w-3 h-3 cursor-pointer"
                        />
                        <label htmlFor={`prompt-${shape.id}`} className="text-xs text-gray-700 cursor-pointer whitespace-nowrap">
                            Text Prompt
                        </label>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ShapeControls;