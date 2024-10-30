import React, { useState, useRef, useEffect } from 'react';
import { X, ChevronDown, ChevronUp } from 'lucide-react';

interface DraggablePanelProps {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}

export const DraggablePanel: React.FC<DraggablePanelProps> = ({ title, children, onClose }) => {
  const [position, setPosition] = useState({ x: 64, y: 72 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isMinimized, setIsMinimized] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const SNAP_THRESHOLD = 20; // Distance in pixels to trigger snapping

  const snapToEdges = (x: number, y: number) => {
    const panel = panelRef.current;
    if (!panel) return { x, y };

    const rect = panel.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const navbarHeight = 64; // Adjust to match your navbar height

    // Snap to left edge
    if (x < SNAP_THRESHOLD) x = 0;
    // Snap to right edge
    if (x + rect.width > windowWidth - SNAP_THRESHOLD) x = windowWidth - rect.width;
    // Snap to top (navbar)
    if (y < navbarHeight + SNAP_THRESHOLD) y = navbarHeight;
    // Snap to bottom
    if (y + rect.height > windowHeight - SNAP_THRESHOLD) y = windowHeight - rect.height;

    return { x, y };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (panelRef.current) {
      const rect = panelRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
      setIsDragging(true);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newPosition = snapToEdges(
          e.clientX - dragOffset.x,
          e.clientY - dragOffset.y
        );
        setPosition(newPosition);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  return (
    <div
      ref={panelRef}
      className="fixed bg-white rounded-lg shadow-lg"
      style={{
        left: position.x,
        top: position.y,
        width: '320px',
        zIndex: 1000
      }}
    >
      <div 
        className="px-4 py-3 cursor-move bg-gray-50 rounded-t-lg flex justify-between items-center"
        onMouseDown={handleMouseDown}
      >
        <h3 className="font-medium text-gray-700">{title}</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:bg-gray-200 rounded-lg"
          >
            {isMinimized ? 
              <ChevronUp className="w-4 h-4" /> : 
              <ChevronDown className="w-4 h-4" />
            }
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-200 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className={`transition-all duration-200 overflow-hidden ${isMinimized ? 'h-0' : 'h-auto'}`}>
        {children}
      </div>
    </div>
  );
};