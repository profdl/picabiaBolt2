import React from 'react';
import { useStore } from '../../store';

export function ZoomControl() {
  const { zoom, setZoom } = useStore();

  const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newZoom = Math.max(0.1, Math.min(5, Number(e.target.value) / 100));
    setZoom(newZoom);
  };

  return (
    <div className="absolute top-1 right-1 text-gray-500 flex items-center bg-white/50 rounded-md  border border-gray-100 px-2 py-1">
      <input
        type="number"
        value={Math.round(zoom * 100)}
        onChange={handleZoomChange}
        className="text-xs border-none focus:outline-none focus:ring-0"
        min="10"
        max="500"
        step="5"
      />
      <span className="text-xs text-gray-500 ">%</span>
    </div>
  );
}