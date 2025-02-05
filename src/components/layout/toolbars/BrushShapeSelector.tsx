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
        <div className="inline-flex items-center rounded-md p-1 gap-1">
            {BRUSH_TEXTURES.map((texture) => (
                <button
                    key={texture}
                    className={`
                        w-7 h-7 
                        rounded-md 
                        transition-all 
                        flex items-center justify-center
                        bg-black
                        hover:bg-neutral-700
                        ${currentTexture === texture 
                            ? 'bg-blue-600 hover:bg-blue-700' 
                            : ''
                        }
                    `}
                    onClick={() => onTextureSelect(texture)}
                >
                    <img
                        src={`/brushes/${texture}.png`}
                        alt={`${texture} brush`}
                        className="w-5 h-5 object-contain opacity-75"
                    />
                </button>
            ))}
        </div>
    );
};