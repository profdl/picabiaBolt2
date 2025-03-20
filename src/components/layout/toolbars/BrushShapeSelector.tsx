import React, { useState } from 'react';

interface BrushShapeSelectorProps {
    currentTexture: string;
    onTextureSelect: (texture: string) => void;
}

const BRUSH_TEXTURES = [
    'soft', 
    'basic',
    'fur',
    'ink',
    'marker'
];

export const BrushShapeSelector: React.FC<BrushShapeSelectorProps> = ({
    currentTexture,
    onTextureSelect,
}) => {
    const [showMenu, setShowMenu] = useState(false);

    const renderBrushIcon = (texture: string) => {
        if (texture === 'soft') {
            return <div className="w-5 h-5 rounded-full bg-white opacity-75" />;
        }
        return (
            <img
                src={`/brushes/${texture}.png`}
                alt={`${texture} brush`}
                className="w-5 h-5 object-contain opacity-75"
            />
        );
    };

    return (
        <div className="relative">
            <button
                className={`
                    w-7 h-7 
                    rounded-md 
                    transition-all 
                    flex items-center justify-center
                    bg-black
                    hover:bg-neutral-700
                `}
                onClick={() => setShowMenu(!showMenu)}
            >
                {renderBrushIcon(currentTexture)}
            </button>

            {showMenu && (
                <>
                    <div 
                        className="fixed inset-0" 
                        onClick={() => setShowMenu(false)}
                    />
                    <div className="absolute bottom-full mb-1 left-0 bg-black rounded-md shadow-lg border border-neutral-700 p-1 flex flex-col gap-1 min-w-[2.5rem] z-50">
                        {BRUSH_TEXTURES.map((texture) => (
                            <button
                                key={texture}
                                className={`
                                    w-7 h-7 
                                    rounded-md 
                                    transition-all 
                                    flex items-center justify-center
                                    hover:bg-neutral-700
                                    ${currentTexture === texture 
                                        ? 'bg-blue-600 hover:bg-blue-700' 
                                        : ''
                                    }
                                `}
                                onClick={() => {
                                    onTextureSelect(texture);
                                    setShowMenu(false);
                                }}
                            >
                                {renderBrushIcon(texture)}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};