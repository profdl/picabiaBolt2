import React, { useEffect, useState } from 'react';
import { useStore } from '../../store';
import { isComfyUIAvailable } from '../../lib/comfyui';
import { GenerationService } from '../../store/slices/generationHandlerSlice';

export const ServiceSelector: React.FC = () => {
  const [comfyAvailable, setComfyAvailable] = useState(false);
  const { generationService, setGenerationService } = useStore();

  useEffect(() => {
    const checkComfyUI = async () => {
      const available = await isComfyUIAvailable();
      setComfyAvailable(available);
    };
    checkComfyUI();

    // Check availability every 5 seconds
    const interval = setInterval(checkComfyUI, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleServiceChange = (service: GenerationService) => {
    setGenerationService(service);
  };

  return (
    <div className="fixed top-4 right-4 z-50 bg-gray-900 rounded-lg shadow-lg p-3 text-white border border-gray-700">
      <div className="flex flex-col space-y-2">
        <div className="flex items-center justify-between space-x-3">
          <label htmlFor="service-select" className="text-sm whitespace-nowrap">Service:</label>
          <select
            id="service-select"
            value={generationService}
            onChange={(e) => handleServiceChange(e.target.value as GenerationService)}
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="replicate">Replicate</option>
            <option value="comfyui" disabled={!comfyAvailable}>ComfyUI</option>
          </select>
        </div>
        <div className="flex items-center justify-between space-x-3">
          <span className="text-sm">ComfyUI:</span>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${comfyAvailable ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm">{comfyAvailable ? 'Connected' : 'Not Connected'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}; 