import React, { useEffect, useState } from 'react';
import { useStore } from '../../store';
import { GenerationService } from '../../store/slices/generationSettingsSlice';
import { isComfyUIAvailable } from '../../lib/comfyui';

export const GenerationServiceToggle: React.FC = () => {
  const { generationService, setGenerationService } = useStore();
  const [isComfyAvailable, setIsComfyAvailable] = useState(false);

  useEffect(() => {
    // Check if ComfyUI is available
    const checkComfyUI = async () => {
      const available = await isComfyUIAvailable();
      setIsComfyAvailable(available);
    };
    checkComfyUI();
  }, []);

  const handleServiceChange = (service: GenerationService) => {
    setGenerationService(service);
  };

  return (
    <div className="flex items-center space-x-4 p-4">
      <span className="text-sm font-medium">Generation Service:</span>
      <div className="flex space-x-2">
        <button
          onClick={() => handleServiceChange('replicate')}
          className={`px-3 py-1 rounded-md text-sm ${
            generationService === 'replicate'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Replicate
        </button>
        <button
          onClick={() => handleServiceChange('comfyui')}
          disabled={!isComfyAvailable}
          className={`px-3 py-1 rounded-md text-sm ${
            !isComfyAvailable
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : generationService === 'comfyui'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          ComfyUI {!isComfyAvailable && '(Not Available)'}
        </button>
      </div>
    </div>
  );
}; 