import React from 'react';
import { RotateCw } from 'lucide-react';
import { Shape } from '../types';

interface DrawingShapeProps {
    shape: Shape;
    isSelected: boolean;
    tool: string;
    handleMouseDown: (e: React.MouseEvent) => void;
    handleContextMenu: (e: React.MouseEvent) => void;
    handleResizeStart: (e: React.MouseEvent) => void;
    handleRotateStart: (e: React.MouseEvent) => void;
}

export const DrawingShape: React.FC<DrawingShapeProps> = ({
    shape,
    isSelected,
    tool,
    handleMouseDown,
    handleContextMenu,
    handleResizeStart,
    handleRotateStart,
}) => {
    return (
        <div
            id={shape.id}
            style={{
                position: 'absolute',
                left: shape.position.x,
                top: shape.position.y,
                width: shape.width,
                height: shape.height,
                cursor: tool === 'select' ? 'move' : 'default',
                transform: `rotate(${shape.rotation || 0}deg)`,
                transformOrigin: 'center center',
                zIndex: isSelected ? 100 : 1,
                pointerEvents: tool === 'select' ? 'all' : 'none',
            }}
            onMouseDown={handleMouseDown}
            onContextMenu={handleContextMenu}
            className={isSelected ? 'selected' : ''}
        >
            <svg
                width="100%"
                height="100%"
                style={{
                    overflow: 'visible',
                }}
            >
                <path
                    d={`M ${shape.points?.map(p => `${p.x},${p.y}`).join(' L ')}`}
                    stroke={shape.color}
                    strokeWidth={shape.strokeWidth}
                    fill="none"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                />
            </svg>
            {isSelected && tool === 'select' && (
                <div className="absolute inset-0" style={{ pointerEvents: 'none' }}>
                    <div
                        className="absolute -right-2 -bottom-2 w-4 h-4 bg-white border-2 border-blue-500 rounded-full cursor-se-resize"
                        style={{ zIndex: 101, pointerEvents: 'all' }}
                        onMouseDown={handleResizeStart}
                    />
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
                </div>
            )}
        </div>
    );
};
