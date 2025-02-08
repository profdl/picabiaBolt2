import React, { useRef, useEffect, useState } from 'react';
import { useThemeClass } from '../../styles/useThemeClass';
import ReactDOM from 'react-dom';

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
    const [isDark, setIsDark] = useState(document.documentElement.classList.contains('dark'));
    
    // Theme styles - will update when isDark changes
    const styles = {
        menu: useThemeClass(['contextMenu', 'container', isDark ? 'dark' : 'light']),
        menuItem: useThemeClass(['contextMenu', 'item', isDark ? 'dark' : 'light']),
        menuItemHover: useThemeClass(['contextMenu', 'itemHover', isDark ? 'dark' : 'light'])
    };

    // Position adjustment effect
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

    // Theme change observer
    useEffect(() => {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'class') {
                    setIsDark(document.documentElement.classList.contains('dark'));
                }
            });
        });

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class']
        });

        return () => observer.disconnect();
    }, []);

    // Click outside handler
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClose]);

    return ReactDOM.createPortal(
        <div
            ref={menuRef}
            className={`fixed rounded-lg shadow-lg py-0.5 min-w-[140px] z-[10000] ${styles.menu}`} // Changed py-1 to py-0.5 and min-w-[160px] to min-w-[140px]
            style={{ left: x, top: y, isolation: 'isolate' }}
        >
            {items.map((item, index) => (
                <button
                    key={index}
                    className={`w-full px-3 py-1 text-left flex items-center gap-2 text-sm ${styles.menuItem}`} // Changed px-4 to px-3, py-2 to py-1, and added text-sm
                    onClick={() => {
                        item.action();
                        onClose();
                    }}
                >
                    {item.icon && <span className="w-4 h-4 flex items-center">{item.icon}</span>} {/* Added fixed width for icons */}
                    <span className="whitespace-nowrap">{item.label}</span>
                </button>
            ))}
        </div>,
        document.body
    );
}