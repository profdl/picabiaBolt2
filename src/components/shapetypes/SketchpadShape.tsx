import React from 'react';
import { Shape } from '../../types';
import { useStore } from '../../store';

interface SketchpadShapeProps {
    shape: Shape;
    sketchPadRef: React.RefObject<HTMLCanvasElement>;
    handlePointerDown: (e: React.PointerEvent<HTMLCanvasElement>) => void;
    handlePointerMove: (e: React.PointerEvent<HTMLCanvasElement>) => void;
    handlePointerUpOrLeave: (e: React.PointerEvent<HTMLCanvasElement>) => void;
    handleContextMenu: (e: React.MouseEvent) => void;
    tool: 'select' | 'pan' | 'pen' | 'brush' | 'eraser';
}
export const SketchpadShape: React.FC<SketchpadShapeProps> = ({
    shape,
    sketchPadRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUpOrLeave,
    handleContextMenu,
    tool,
}) => {
    const { addShape, deleteShape, setTool } = useStore();

    return (
        <>
            <div className="absolute -top-6 left-0 text-sm text-gray-300 font-medium">
                SketchPad
            </div>
            <canvas
                ref={sketchPadRef}
                width={512}
                height={512}
                className="w-full h-full touch-none"
                onContextMenu={handleContextMenu}
                style={{
                    pointerEvents: (tool === 'select' || tool === 'brush' || tool === 'eraser') ? 'all' : 'none',
                    backgroundColor: '#000000',
                    touchAction: 'none',
                }}
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
                    e.currentTarget.releasePointerCapture(e.pointerId);
                    handlePointerUpOrLeave(e);
                }}
                onPointerLeave={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                        e.currentTarget.releasePointerCapture(e.pointerId);
                    }
                    handlePointerUpOrLeave(e);
                }}
                onPointerCancel={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                        e.currentTarget.releasePointerCapture(e.pointerId);
                    }
                    handlePointerUpOrLeave(e);
                }}
            />
            {tool === 'brush' && (
                <button
                    className="absolute -bottom-6 right-0 text-xs px-1.5 py-0.5 bg-gray-300 text-gray-800 rounded hover:bg-red-600 transition-colors"
                    style={{ pointerEvents: 'all' }}
                    onClick={(e) => {
                        e.stopPropagation();
                        const newId = Math.random().toString(36).substr(2, 9);
                        addShape({
                            id: newId,
                            type: 'sketchpad',
                            position: shape.position,
                            width: shape.width,
                            height: shape.height,
                            color: '#ffffff',
                            rotation: shape.rotation,
                            locked: true,
                            isUploading: false,
                            isEditing: false,
                            model: '',
                            useSettings: false,
                            depthStrength: 0,
                            edgesStrength: 0,
                            contentStrength: 0,
                            poseStrength: 0,
                            scribbleStrength: 0,
                            remixStrength: 0
                        });
                        deleteShape(shape.id);
                        setTool('brush');
                    }}
                >
                    Clear
                </button>
            )}
        </>
    );
};
