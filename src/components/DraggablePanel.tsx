import React, { useState, useRef, useEffect } from 'react';
import { X, ChevronDown, ChevronUp } from 'lucide-react';

interface DraggablePanelProps {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  initialPosition?: 'left' | 'right';
}

export const DraggablePanel: React.FC<DraggablePanelProps> = ({ 
  title, 
  children, 
  onClose,
  initialPosition = 'left'
}) => {
  const getInitialPosition = () => {
    const windowWidth = window.innerWidth;
    return {
      x: initialPosition === 'right' ? windowWidth - 384 : 64,
      y: 72
    };
  };

  const [position, setPosition] = useState(getInitialPosition());
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isMinimized, setIsMinimized] = useState(false);
  const [stackedTo, setStackedTo] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useRef(`panel-${Math.random()}`);

  const SNAP_THRESHOLD = 20;

  const updateStackedPosition = () => {
    if (!stackedTo) return;
    
    const parentPanel = document.querySelector(`[data-panel-id="${stackedTo}"]`);
    if (!parentPanel) return;

    const parentRect = parentPanel.getBoundingClientRect();
    setPosition(prev => ({
      x: parentRect.left,
      y: parentRect.bottom + 2
    }));
  };

  useEffect(() => {
    if (stackedTo) {
      const resizeObserver = new ResizeObserver(updateStackedPosition);
      const parentPanel = document.querySelector(`[data-panel-id="${stackedTo}"]`);
      if (parentPanel) {
        resizeObserver.observe(parentPanel);
      }
      return () => resizeObserver.disconnect();
    }
  }, [stackedTo]);

  const snapToEdgesAndPanels = (x: number, y: number) => {
    const panel = panelRef.current;
    if (!panel) return { x, y };

    const rect = panel.getBoundingClientRect();
    const otherPanels = Array.from(document.querySelectorAll('.draggable-panel'))
      .filter(el => el !== panel);

    let newStackedTo = null;

    otherPanels.forEach(el => {
      const otherRect = el.getBoundingClientRect();
      
      // Vertical stacking detection
      if (Math.abs(x - otherRect.left) < SNAP_THRESHOLD) {
        if (Math.abs(y - (otherRect.bottom + 2)) < SNAP_THRESHOLD) {
          x = otherRect.left;
          y = otherRect.bottom + 2;
          newStackedTo = el.getAttribute('data-panel-id');
        }
      }
    });

    setStackedTo(newStackedTo);
    return { x, y };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent text selection
    if (panelRef.current) {
      const rect = panelRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
      setIsDragging(true);
      document.body.style.userSelect = 'none'; // Disable text selection globally while dragging
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newPosition = snapToEdgesAndPanels(
          e.clientX - dragOffset.x,
          e.clientY - dragOffset.y
        );
        setPosition(newPosition);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.body.style.userSelect = ''; // Re-enable text selection when done dragging
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = ''; // Cleanup
    };
  }, [isDragging, dragOffset]);
  return (
    <div
      ref={panelRef}
      data-panel-id={panelId.current}
      className="fixed bg-white rounded-lg shadow-lg draggable-panel"
      style={{
        left: position.x,
        top: position.y,
        width: '320px',
        zIndex: 1000,
        transition: isDragging ? 'none' : 'all 0.2s ease-out'
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