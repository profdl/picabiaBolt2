import React, { useState, useRef, useEffect } from 'react';
import { X, ChevronDown, ChevronUp } from 'lucide-react';

interface DraggablePanelProps {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  initialPosition?: 'left' | 'right';
  initialY?: number;
}

export const DraggablePanel: React.FC<DraggablePanelProps> = ({
  title,
  children,
  onClose,
  initialPosition = 'left',
  initialY = 72
}) => {
  const getInitialPosition = () => ({
    x: initialPosition === 'right' ? window.innerWidth - 320 : 0,
    y: initialY
  });

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
    setPosition({
      x: parentRect.left,
      y: parentRect.bottom + 2
    });
  };

  const snapToEdgesAndPanels = (x: number, y: number) => {
    const panel = panelRef.current;
    if (!panel) return { x, y };

    const rect = panel.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const navbarHeight = 64;

    if (x < SNAP_THRESHOLD) x = 0;
    if (x + rect.width > windowWidth - SNAP_THRESHOLD) x = windowWidth - rect.width;
    if (y < navbarHeight + SNAP_THRESHOLD) y = navbarHeight;
    if (y + rect.height > windowHeight - SNAP_THRESHOLD) y = windowHeight - rect.height;

    const otherPanels = Array.from(document.querySelectorAll('.draggable-panel'))
      .filter(el => el !== panel);

    let newStackedTo = null;

    otherPanels.forEach(el => {
      const otherRect = el.getBoundingClientRect();

      if (Math.abs(x - (otherRect.right + 2)) < SNAP_THRESHOLD) {
        x = otherRect.right + 2;
      }
      if (Math.abs(x + rect.width - otherRect.left + 2) < SNAP_THRESHOLD) {
        x = otherRect.left - rect.width - 2;
      }

      if (Math.abs(x - otherRect.left) < SNAP_THRESHOLD) {
        x = otherRect.left;
        if (Math.abs(y - (otherRect.bottom + 2)) < SNAP_THRESHOLD) {
          y = otherRect.bottom + 2;
          newStackedTo = el.getAttribute('data-panel-id');
        }
      }
    });

    setStackedTo(newStackedTo);
    return { x, y };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    if (panelRef.current) {
      const rect = panelRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
      setIsDragging(true);
      document.body.style.userSelect = 'none';
    }
  };

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
    document.body.style.userSelect = '';
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

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

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
            {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-200 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div
        className={`
          transition-all 
          duration-200 
          overflow-y-auto
          ${isMinimized ? 'h-0' : 'max-h-[calc(100vh-200px)]'}
        `}
        style={{
          overflowY: isMinimized ? 'hidden' : 'auto'
        }}
      >
        {children}
      </div>
    </div>
  );
};
