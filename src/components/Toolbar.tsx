import React from 'react';
import { Square, Circle, Type, ZoomIn, ZoomOut, Move, StickyNote, Hand, MousePointer, Image, Pencil } from 'lucide-react';
import { useStore } from '../store';

export const Toolbar: React.FC = () => {
  const { zoom, setZoom, addShape, tool, setTool, offset, currentColor, setCurrentColor, strokeWidth, setStrokeWidth } = useStore();

  const getViewportCenter = () => {
    const rect = document.querySelector('#root')?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    
    return {
      x: (rect.width / 2 - offset.x) / zoom,
      y: (rect.height / 2 - offset.y) / zoom
    };
  };

  const handleAddShape = (type: 'rectangle' | 'circle' | 'text' | 'sticky' | 'image') => {
    const baseColor = type === 'sticky' ? '#fff9c4' : '#' + Math.floor(Math.random()*16777215).toString(16);
    const center = getViewportCenter();
    
    if (type === 'image') {
      const url = window.prompt('Enter image URL:');
      if (!url) return;

      addShape({
        id: Math.random().toString(36).substr(2, 9),
        type,
        position: {
          x: center.x - 150,
          y: center.y - 100
        },
        width: 300,
        height: 200,
        color: 'transparent',
        imageUrl: url,
        rotation: 0,
      });
      return;
    }

    const size = type === 'sticky' ? 200 : 100;
    addShape({
      id: Math.random().toString(36).substr(2, 9),
      type,
      position: {
        x: center.x - size / 2,
        y: center.y - size / 2
      },
      width: size,
      height: size,
      color: baseColor,
      content: type === 'text' || type === 'sticky' ? 'Double click to edit' : undefined,
      fontSize: 16,
      rotation: 0,
    });
  };

  return (
    <>
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg p-2 flex gap-2">
        <button
          onClick={() => setTool('select')}
          className={`p-2 hover:bg-gray-100 rounded-lg ${tool === 'select' ? 'bg-gray-100' : ''}`}
          title="Select Tool (V)"
        >
          <MousePointer className="w-5 h-5" />
        </button>
        <button
          onClick={() => setTool('pan')}
          className={`p-2 hover:bg-gray-100 rounded-lg ${tool === 'pan' ? 'bg-gray-100' : ''}`}
          title="Pan Tool (Space)"
        >
          <Hand className="w-5 h-5" />
        </button>
        <button
          onClick={() => setTool('pen')}
          className={`p-2 hover:bg-gray-100 rounded-lg ${tool === 'pen' ? 'bg-gray-100' : ''}`}
          title="Pen Tool"
        >
          <Pencil className="w-5 h-5" />
        </button>
        <div className="w-px bg-gray-200 mx-2" />
        {tool === 'pen' && (
          <>
            <input
              type="color"
              value={currentColor}
              onChange={(e) => setCurrentColor(e.target.value)}
              className="w-8 h-8 p-0 cursor-pointer"
              title="Stroke Color"
            />
            <select
              value={strokeWidth}
              onChange={(e) => setStrokeWidth(Number(e.target.value))}
              className="p-1 border rounded"
              title="Stroke Width"
            >
              {[1, 2, 4, 6, 8, 12].map((width) => (
                <option key={width} value={width}>{width}px</option>
              ))}
            </select>
            <div className="w-px bg-gray-200 mx-2" />
          </>
        )}
        <button
          onClick={() => handleAddShape('rectangle')}
          className="p-2 hover:bg-gray-100 rounded-lg"
          title="Add Rectangle"
        >
          <Square className="w-5 h-5" />
        </button>
        <button
          onClick={() => handleAddShape('circle')}
          className="p-2 hover:bg-gray-100 rounded-lg"
          title="Add Circle"
        >
          <Circle className="w-5 h-5" />
        </button>
        <button
          onClick={() => handleAddShape('text')}
          className="p-2 hover:bg-gray-100 rounded-lg"
          title="Add Text"
        >
          <Type className="w-5 h-5" />
        </button>
        <button
          onClick={() => handleAddShape('sticky')}
          className="p-2 hover:bg-gray-100 rounded-lg"
          title="Add Sticky Note"
        >
          <StickyNote className="w-5 h-5" />
        </button>
        <button
          onClick={() => handleAddShape('image')}
          className="p-2 hover:bg-gray-100 rounded-lg"
          title="Add Image"
        >
          <Image className="w-5 h-5" />
        </button>
        <div className="w-px bg-gray-200 mx-2" />
        <button
          onClick={() => setZoom(zoom * 1.1)}
          className="p-2 hover:bg-gray-100 rounded-lg"
          title="Zoom In"
        >
          <ZoomIn className="w-5 h-5" />
        </button>
        <button
          onClick={() => setZoom(zoom * 0.9)}
          className="p-2 hover:bg-gray-100 rounded-lg"
          title="Zoom Out"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
        <div className="px-2 flex items-center text-sm text-gray-600">
          {Math.round(zoom * 100)}%
        </div>
      </div>
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white/80 backdrop-blur-sm rounded-lg shadow-lg p-2 text-sm text-gray-600">
        <kbd className="px-2 py-1 bg-gray-100 rounded">V</kbd> select tool &nbsp;•&nbsp;
        <kbd className="px-2 py-1 bg-gray-100 rounded">Space + Drag</kbd> or <kbd className="px-2 py-1 bg-gray-100 rounded">MMB</kbd> to pan &nbsp;•&nbsp; 
        <kbd className="px-2 py-1 bg-gray-100 rounded">Ctrl + Wheel</kbd> to zoom &nbsp;•&nbsp; 
        <kbd className="px-2 py-1 bg-gray-100 rounded">Delete</kbd> to remove selected &nbsp;•&nbsp;
        <kbd className="px-2 py-1 bg-gray-100 rounded">Shift</kbd> while resizing to maintain ratio &nbsp;•&nbsp;
        <kbd className="px-2 py-1 bg-gray-100 rounded">Ctrl/⌘ + C</kbd> copy &nbsp;•&nbsp;
        <kbd className="px-2 py-1 bg-gray-100 rounded">Ctrl/⌘ + V</kbd> paste &nbsp;•&nbsp;
        <kbd className="px-2 py-1 bg-gray-100 rounded">Ctrl/⌘ + X</kbd> cut &nbsp;•&nbsp;
        <kbd className="px-2 py-1 bg-gray-100 rounded">Ctrl/⌘ + A</kbd> select all &nbsp;•&nbsp;
        <kbd className="px-2 py-1 bg-gray-100 rounded">Ctrl/⌘ + Z</kbd> undo &nbsp;•&nbsp;
        <kbd className="px-2 py-1 bg-gray-100 rounded">Ctrl/⌘ + Shift + Z</kbd> redo
      </div>
    </>
  );
};