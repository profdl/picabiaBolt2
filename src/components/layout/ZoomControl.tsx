import React, { useState, useEffect } from 'react';
import { useStore } from '../../store';
import { useThemeClass } from '../../styles/useThemeClass';

export function ZoomControl() {
  const styles = {
    container: useThemeClass(['zoomControl', 'container']),
    button: useThemeClass(['zoomControl', 'button']),
    input: useThemeClass(['zoomControl', 'input'])
  };

  const { zoom, setZoom, offset, setOffset, showGallery } = useStore();
  const [inputValue, setInputValue] = useState(Math.round(zoom * 100).toString());

  useEffect(() => {
    setInputValue(Math.round(zoom * 100).toString());
  }, [zoom]);

  const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^\d]/g, '');
    setInputValue(value);
    
    if (!value) return;
    const numberValue = parseInt(value, 10);
    if (numberValue < 10 || numberValue > 500) return;
    
    const newZoom = numberValue / 100;
    applyZoomWithCenter(newZoom);
  };

  const handleBlur = () => {
    setInputValue(Math.round(zoom * 100).toString());
  };

  const applyZoomWithCenter = (newZoom: number) => {
    const canvas = document.querySelector('#canvas-container') as HTMLDivElement;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const mouseCanvasX = (centerX - offset.x) / zoom;
    const mouseCanvasY = (centerY - offset.y) / zoom;

    setZoom(newZoom);
    setOffset({
      x: centerX - mouseCanvasX * newZoom,
      y: centerY - mouseCanvasY * newZoom,
    });
  };

  const handleZoomButton = (direction: 'in' | 'out') => {
    const delta = direction === 'in' ? 1.1 : 0.9;
    const newZoom = Math.max(0.1, Math.min(5, zoom * delta));
    applyZoomWithCenter(newZoom);
  };

  return (
    <div 
      className={`absolute top-1 transition-[right] duration-300 ease-in-out ${
        showGallery ? 'right-[321px]' : 'right-1'
      } ${styles.container}`}
    >
      <button
        onClick={() => handleZoomButton('out')}
        className={styles.button}
        title="Zoom out"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-3 h-3"
        >
          <path d="M6.75 9.25a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5z" />
        </svg>
      </button>

      <div className="flex items-center">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={inputValue}
          onChange={handleZoomChange}
          onBlur={handleBlur}
          className={styles.input}
        />
        <span className="text-xs text-neutral-500 dark:text-neutral-400">%</span>
      </div>

      <button
        onClick={() => handleZoomButton('in')}
        className={styles.button}
        title="Zoom in"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-3 h-3"
        >
          <path d="M10.75 6.75a.75.75 0 00-1.5 0v2.5h-2.5a.75.75 0 000 1.5h2.5v2.5a.75.75 0 001.5 0v-2.5h2.5a.75.75 0 000-1.5h-2.5v-2.5z" />
        </svg>
      </button>
    </div>
  );
}