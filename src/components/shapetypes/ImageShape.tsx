import React from 'react';
import { Loader2 } from 'lucide-react';
import { Shape } from '../../types';
import { useStore } from '../../store';

interface ImageShapeProps {
    shape: Shape;
}

export const ImageShape: React.FC<ImageShapeProps> = ({ shape }) => {
    return (
        <div className="relative w-full h-full">
            {/* Base image */}
            <img
                src={shape.imageUrl}
                alt="Original image"
                className="absolute w-full h-full object-cover"
                draggable={false}
            />

            {/* Depth layer */}
            {shape.showDepth && (
                useStore.getState().preprocessingStates[shape.id]?.depth ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100/50">
                        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                    </div>
                ) : (
                    shape.depthPreviewUrl && (
                        <img
                            src={shape.depthPreviewUrl}
                            alt="Depth map"
                            className="absolute w-full h-full object-cover"
                            style={{ opacity: shape.depthStrength || 0.5 }}
                            draggable={false}
                        />
                    )
                )
            )}

            {/* Edges layer */}
            {shape.showEdges && (
                useStore.getState().preprocessingStates[shape.id]?.edge ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100/50">
                        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                    </div>
                ) : (
                    shape.edgePreviewUrl && (
                        <img
                            src={shape.edgePreviewUrl}
                            alt="Edge detection"
                            className="absolute w-full h-full object-cover"
                            style={{ opacity: shape.edgesStrength || 0.5 }}
                            draggable={false}
                        />
                    )
                )
            )}

            {/* Pose layer */}
            {shape.showPose && (
                useStore.getState().preprocessingStates[shape.id]?.pose ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100/50">
                        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                    </div>
                ) : (
                    shape.posePreviewUrl && (
                        <img
                            src={shape.posePreviewUrl}
                            alt="Pose detection"
                            className="absolute w-full h-full object-cover"
                            style={{ opacity: shape.poseStrength || 0.5 }}
                            draggable={false}
                        />
                    )
                )
            )}

            {shape.showScribble && shape.scribblePreviewUrl && (
                <img
                    src={shape.scribblePreviewUrl}
                    alt="Scribble"
                    className="absolute w-full h-full object-cover"
                    style={{ opacity: shape.scribbleStrength || 0.5 }}
                    draggable={false}
                />
            )}

            {shape.showRemix && shape.remixPreviewUrl && (
                <img
                    src={shape.remixPreviewUrl}
                    alt="Remix"
                    className="absolute w-full h-full object-cover"
                    style={{ opacity: shape.remixStrength || 0.5 }}
                    draggable={false}
                />
            )}
        </div>
    );
};
