import React, { useRef, useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { useStore } from '../store';

export const ImageGeneratePanel: React.FC = () => {
  const {
    advancedSettings,
    setAdvancedSettings,
  } = useStore();

  return (
    <div
      className="absolute bottom-full right-0 mb-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200"
    >
      <div className="p-4 space-y-4">
        <div className="space-y-2">
          <label className="block text-sm text-gray-700">Output Format</label>
          <select
            value={advancedSettings.outputFormat}
            onChange={(e) => setAdvancedSettings({ outputFormat: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
          >
            <option value="webp">WebP</option>
            <option value="jpg">JPG</option>
            <option value="png">PNG</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-sm text-gray-700">
            Output Quality ({advancedSettings.outputQuality})
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={advancedSettings.outputQuality}
            onChange={(e) => setAdvancedSettings({ outputQuality: parseInt(e.target.value) })}
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={advancedSettings.randomiseSeeds}
              onChange={(e) => setAdvancedSettings({ randomiseSeeds: e.target.checked })}
            />
            <span className="text-sm text-gray-700">Randomize Seeds</span>
          </label>
        </div>
      </div>
    </div>
  );
};