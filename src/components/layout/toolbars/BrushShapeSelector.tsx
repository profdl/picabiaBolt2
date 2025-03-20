import React, { useState } from 'react';
import { NumberInput } from "../../shared/NumberInput";

interface BrushSettingsPanelProps {
    currentTexture: string;
    rotation?: number;
    spacing?: number;
    followPath?: boolean;
    onTextureSelect: (texture: string) => void;
    onPropertyChange: (property: string, value: unknown) => void;
}

const BRUSH_TEXTURES = [
    'soft', 
    'basic',
    'fur',
    'ink',
    'marker'
];

export const BrushSettingsPanel: React.FC<BrushSettingsPanelProps> = ({
    currentTexture,
    rotation = 0,
    spacing = 0,
    followPath = false,
    onTextureSelect,
    onPropertyChange,
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

    const styles = {
        controlGroup: {
            container: "flex items-center gap-1 px-2 py-1",
            label: "text-[10px] font-medium text-neutral-400 uppercase whitespace-nowrap",
        },
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
                    <div className="absolute bottom-full mb-1 left-0 bg-black rounded-md shadow-lg border border-neutral-700 p-1 flex flex-col gap-1 min-w-[200px] z-50">
                        <div className="p-1 grid grid-cols-5 gap-1">
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
                                    }}
                                >
                                    {renderBrushIcon(texture)}
                                </button>
                            ))}
                        </div>

                        <div className="border-t border-neutral-700 mt-1">
                            <div className={styles.controlGroup.container}>
                                <span className={styles.controlGroup.label}>Angle</span>
                                <NumberInput
                                    value={rotation}
                                    onChange={(value) => onPropertyChange("rotation", value)}
                                    min={0}
                                    max={360}
                                    step={1}
                                    formatValue={(v) => `${Math.round(v)}°`}
                                />
                            </div>

                            <div className={styles.controlGroup.container}>
                                <span className={styles.controlGroup.label}>Spacing</span>
                                <NumberInput
                                    value={spacing * 100}
                                    onChange={(value) => onPropertyChange("spacing", value / 100)}
                                    min={5}
                                    max={100}
                                    step={1}
                                    formatValue={(v) => `${Math.round(v)}%`}
                                />
                            </div>

                            <div className={styles.controlGroup.container}>
                                <span className={styles.controlGroup.label}>Rotate Tip</span>
                                <input
                                    type="checkbox"
                                    checked={followPath}
                                    onChange={(e) => onPropertyChange("followPath", e.target.checked)}
                                    className="w-3 h-3 text-neutral-600 dark:text-neutral-400 rounded border-neutral-300 dark:border-neutral-700"
                                />
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};