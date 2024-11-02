import React from 'react';
import {
  Square,
  Circle,
  Type,
  ZoomIn,
  ZoomOut,
  StickyNote,
  Hand,
  MousePointer,
  Pencil,
  Sparkles,
  Settings,
  Image as ImageIcon,
  ImagePlus,
  Loader2,
  Upload,
  Grid
} from 'lucide-react';
import { useStore } from '../store';
import { Position } from '../types';
import { useState, useRef } from 'react';
import { ImageGeneratePanel } from './ImageGeneratePanel';


const UploadButton = ({ addShape, getViewportCenter }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageUrl = event.target?.result as string;
        const center = getViewportCenter();
        
        addShape({
          id: Math.random().toString(36).substr(2, 9),
          type: 'image',
          position: {
            x: center.x - 150,
            y: center.y - 100
          },
          width: 300,
          height: 200,
          color: 'transparent',
          imageUrl,
          rotation: 0,
          aspectRatio: 1.5,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        className="p-2 hover:bg-gray-100 rounded-lg flex items-center gap-1"
        title="Upload Image"
      >
        <Upload className="w-5 h-5" />
        <span className="text-sm font-medium">Upload Image</span>
      </button>
    </div>
  );
};

const UnsplashIcon = () => (
  <svg 
    viewBox="0 0 32 32" 
    width="20" 
    height="20" 
    xmlns="http://www.w3.org/2000/svg"
    fill="currentColor"
  >
    <path d="M10 9V0h12v9H10zm12 5h10v18H0V14h10v9h12v-9z" />
  </svg>
);

const SettingsButton = () => {
  const [showPanel, setShowPanel] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setShowPanel(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setShowPanel(false);
    }, 300); // Small delay to allow moving to panel
  };

  return (
    <div 
      ref={buttonRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        className={`p-2 hover:bg-gray-100 rounded-lg flex items-center gap-1 ${
          showPanel ? 'bg-gray-100' : ''
        }`}
        title="Image Generator Settings"
      >
        <Settings className="w-5 h-5" />
        <span className="text-sm font-medium">Settings</span>
      </button>
      
      {showPanel && <ImageGeneratePanel />}
    </div>
  );
};

interface ToolbarProps {
  onShowImageGenerate: () => void;
  onShowUnsplash: () => void;
  onShowGallery: () => void;
  showImageGenerate?: boolean;
  showUnsplash?: boolean;
  showGallery?: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  onShowImageGenerate,
  onShowUnsplash,
  onShowGallery,
  showImageGenerate,
  showUnsplash,
  showGallery
}) => {
  const {
    zoom,
    setZoom,
    addShape,
    tool,
    setTool,
    offset,
    currentColor,
    setCurrentColor,
    strokeWidth,
    setStrokeWidth,
    toggleImageGenerate,
    toggleUnsplash,
    toggleGallery,
    handleGenerate,
    isGenerating,
    shapes
  } = useStore();

  const hasActivePrompt = shapes.some(shape => 
    (shape.type === 'sticky' && shape.showPrompt && shape.content) || 
    (shape.type === 'image' && shape.showPrompt)
  );

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
        aspectRatio: 1.5,
      });
      setTool('select');
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
    <div className="absolute bottom-0 left-0 right-0 bg-white shadow-lg px-4 py-2 border-t border-gray-200">
      <div className="max-w-screen-2xl mx-auto relative flex items-center justify-between">
  {/* Left-aligned buttons */}
  <div className="flex items-center gap-2">
    <UploadButton addShape={addShape} getViewportCenter={getViewportCenter} />
    <div className="w-px bg-gray-200 mx-2" />
    <button
      onClick={toggleUnsplash}
      className={`p-2 hover:bg-gray-100 rounded-lg flex items-center gap-1 ${
        showUnsplash ? 'bg-gray-100' : ''
      }`}
      title="Unsplash Images"
    >
      <UnsplashIcon />
      <span className="text-sm font-medium"></span>
    </button>
  </div>

        {/* Center-aligned toolbar buttons */}
        <div className="flex items-center gap-2">
          {/* Selection Tools */}
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

          {/* Pen Tool Settings */}
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

          {/* Shape Tools */}
          {/* <button
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
          </button> */}
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
            <ImageIcon className="w-5 h-5" />
          </button>

          <div className="w-px bg-gray-200 mx-2" />

          {/* Zoom Controls */}
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

          <div className="w-px bg-gray-200 mx-2" />

          {/* Image Generation Tools (now without Gallery) */}
          <button
            onClick={handleGenerate}
            disabled={!hasActivePrompt || isGenerating}
            className={`p-2 rounded-lg flex items-center gap-1 ${
              hasActivePrompt && !isGenerating
                ? 'hover:bg-blue-50 text-blue-600 hover:text-blue-700'
                : 'opacity-50 cursor-not-allowed text-gray-400'
            }`}
            title={
              !hasActivePrompt
                ? 'Select a sticky note and enable prompting to generate'
                : 'Generate Image'
            }
          >
            {isGenerating ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Sparkles className="w-5 h-5" />
            )}
            <span className="text-sm font-medium">Generate</span>
          </button>

          <SettingsButton />
          </div>
        {/* Right-aligned Gallery button */}
        <div>
          <button
            onClick={toggleGallery}
            className={`p-2 hover:bg-gray-100 rounded-lg flex items-center gap-1 ${showGallery ? 'bg-gray-100' : ''}`}
            title="Generated Images Gallery"
          >
            <Grid className="w-5 h-5" />
            <span className="text-sm font-medium">Gallery</span>
          </button>
        </div>
      </div>
   
  </div>
  );
};

export default Toolbar;