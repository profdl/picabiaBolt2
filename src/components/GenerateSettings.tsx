import React, { useRef, useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { useStore } from '../store';

export const ImageGeneratePanel: React.FC = () => {
  const {
    aspectRatio,
    setAspectRatio,
    advancedSettings,
    setAdvancedSettings,
    isGenerating,
    shapes
  } = useStore();

  const [error, setError] = React.useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const updateAdvancedSetting = (key: keyof typeof advancedSettings, value: any) => {
    setAdvancedSettings({ [key]: value });
  };

  return (
    <div 
      ref={panelRef}
      className="absolute bottom-full right-0 mb-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200"
    >
      <div className="p-4 space-y-4">
        {error && (
          <div className="p-2 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
        
        <div className="space-y-2">
          <label className="block text-sm text-gray-700">Aspect Ratio</label>
          <select
            value={aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isGenerating}
          >
            <option value="1:1">Square (1:1)</option>
            <option value="16:9">Landscape (16:9)</option>
            <option value="9:16">Portrait (9:16)</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-sm text-gray-700">Negative Prompt</label>
          <textarea
            value={advancedSettings.negativePrompt}
            onChange={(e) => updateAdvancedSetting('negativePrompt', e.target.value)}
            className="w-full h-20 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            placeholder="Elements to exclude from the generation..."
            disabled={isGenerating}
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm text-gray-700">Steps ({advancedSettings.steps})</label>
          <input
            type="range"
            min="10"
            max="150"
            value={advancedSettings.steps}
            onChange={(e) => updateAdvancedSetting('steps', parseInt(e.target.value))}
            className="w-full"
            disabled={isGenerating}
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm text-gray-700">
            Guidance Scale ({advancedSettings.guidanceScale})
          </label>
          <input
            type="range"
            min="1"
            max="20"
            step="0.1"
            value={advancedSettings.guidanceScale}
            onChange={(e) => updateAdvancedSetting('guidanceScale', parseFloat(e.target.value))}
            className="w-full"
            disabled={isGenerating}
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm text-gray-700">Scheduler</label>
          <select
            value={advancedSettings.scheduler}
            onChange={(e) => updateAdvancedSetting('scheduler', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isGenerating}
          >
            <option value="DPMSolverMultistep">DPM Solver Multistep</option>
            <option value="DDIM">DDIM</option>
            <option value="K_EULER">K Euler</option>
            <option value="K_EULER_ANCESTRAL">K Euler Ancestral</option>
            <option value="PNDM">PNDM</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-sm text-gray-700">Seed</label>
          <div className="flex gap-2">
            <input
              type="number"
              value={advancedSettings.seed}
              onChange={(e) => updateAdvancedSetting('seed', parseInt(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isGenerating}
            />
            <button
              onClick={() => updateAdvancedSetting('seed', Math.floor(Math.random() * 1000000))}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
              disabled={isGenerating}
            >
              🎲
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};