import React from 'react';
import { useStore } from '../store';

export const ShortcutsPanel = () => {
  const showShortcuts = useStore(state => state.showShortcuts);

  if (!showShortcuts) return null;

  return (
    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white/80 backdrop-blur-sm rounded-lg shadow-lg p-2 text-sm text-gray-600">
      <kbd className="px-2 py-1 bg-gray-100 rounded">V</kbd> select tool  •
      <kbd className="px-2 py-1 bg-gray-100 rounded">Space + Drag</kbd> or <kbd className="px-2 py-1 bg-gray-100 rounded">MMB</kbd> to pan  •
      <kbd className="px-2 py-1 bg-gray-100 rounded">Ctrl + Wheel</kbd> to zoom  •
      <kbd className="px-2 py-1 bg-gray-100 rounded">Delete</kbd> to remove selected  •
      <kbd className="px-2 py-1 bg-gray-100 rounded">Shift</kbd> while resizing to maintain ratio  •
      <kbd className="px-2 py-1 bg-gray-100 rounded">Ctrl/⌘ + C</kbd> copy  •
      <kbd className="px-2 py-1 bg-gray-100 rounded">Ctrl/⌘ + V</kbd> paste  •
      <kbd className="px-2 py-1 bg-gray-100 rounded">Ctrl/⌘ + X</kbd> cut  •
      <kbd className="px-2 py-1 bg-gray-100 rounded">Ctrl/⌘ + A</kbd> select all  •
      <kbd className="px-2 py-1 bg-gray-100 rounded">Ctrl/⌘ + Z</kbd> undo  •
      <kbd className="px-2 py-1 bg-gray-100 rounded">Ctrl/⌘ + Shift + Z</kbd> redo
    </div>
  );
};