import React from 'react';

interface BrushShapeSelectorProps {
    currentTexture: string;
    onTextureSelect: (texture: string) => void;
}

const BRUSH_TEXTURES = [
    'basic',
    'fur',
    'ink',
    'marker'
];

export const BrushShapeSelector: React.FC<BrushShapeSelectorProps> = ({
    currentTexture,
    onTextureSelect,
}) => {
    return (
        <div className="flex gap-2 bg-black rounded-lg shadow-sm border border-gray-200 p-2">
            {BRUSH_TEXTURES.map((texture) => (
                <button
                    key={texture}
                    className={`w-8 h-8 rounded hover:bg-gray-100 flex items-center justify-center ${currentTexture === texture ? 'bg-gray-100 ring-2 ring-blue-500' : ''
                        }`}
                    onClick={() => onTextureSelect(texture)}
                >
                    <img
                        src={`/brushes/${texture}.png`}
                        alt={`${texture} brush`}
                        className="w-6 h-6 object-contain"
                    />
                </button>
            ))}
        </div>
    );
};