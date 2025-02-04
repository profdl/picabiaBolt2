import React, { useRef, useEffect } from 'react';

interface ContextMenuProps {
    x: number;
    y: number;
    onClose: () => void;
    items: {
        label: string;
        action: () => void;
        icon?: React.ReactNode;
    }[];
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, onClose, items }) => {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (menuRef.current) {
            const rect = menuRef.current.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            if (x + rect.width > viewportWidth) {
                menuRef.current.style.left = `${viewportWidth - rect.width}px`;
            }

            if (y + rect.height > viewportHeight) {
                menuRef.current.style.top = `${viewportHeight - rect.height}px`;
            }
        }
    }, [x, y]);
    return (
        <>
            <div
                className="fixed inset-0 z-[1000]"
                onClick={onClose}
            />
            <div
                ref={menuRef}
                className="fixed bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[160px] z-[1001]"
                style={{ left: x, top: y }}
            >
                {items.map((item, index) => (
                    <button
                        key={index}
                        className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2"
                        onClick={() => {
                            item.action();
                            onClose();
                        }}
                    >
                        {item.icon}
                        {item.label}
                    </button>
                ))}
            </div>
        </>
    );
};