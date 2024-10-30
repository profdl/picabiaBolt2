import React, { useState } from 'react';
import { DraggablePanel } from './DraggablePanel';
import { generateImage } from '../lib/replicate';
import { Sparkles, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { useStore } from '../store';
import { saveGeneratedImage } from '../lib/supabase';


export const ImageGeneratePanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [galleryRefresh, setGalleryRefresh] = useState(0);
  const [advancedSettings, setAdvancedSettings] = useState({
    negativePrompt: '',
    numInferenceSteps: 50,
    guidanceScale: 7.5,
    scheduler: 'DPMSolverMultistep',
    seed: Math.floor(Math.random() * 1000000),
    steps: 30
  });

  const { addShape, setTool, zoom, offset } = useStore((state) => ({
    addShape: state.addShape,
    setTool: state.setTool,
    zoom: state.zoom,
    offset: state.offset
  }));

  const ASPECT_RATIOS = [
    { label: 'Square (1:1)', value: '1:1' },
    { label: 'Landscape (16:9)', value: '16:9' },
    { label: 'Portrait (9:16)', value: '9:16' },
  ];

  const getViewportCenter = () => {
    const rect = document.querySelector('#root')?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    
    return {
      x: (rect.width / 2 - offset.x) / zoom,
      y: (rect.height / 2 - offset.y) / zoom
    };
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    
    setIsGenerating(true);
    setError(null);

    try {
      console.log('Starting image generation with Replicate...');
      const imageUrl = await generateImage(
        prompt.trim(),
        aspectRatio,
        advancedSettings.steps,
        advancedSettings.negativePrompt,
        advancedSettings.guidanceScale,
        advancedSettings.scheduler,
        advancedSettings.seed
      );
      console.log('Replicate generation successful:', imageUrl);
      
      console.log('Saving to Supabase...');
      await saveGeneratedImage(imageUrl, prompt.trim(), aspectRatio);
      console.log('Supabase save successful');
      
      setPreviewUrl(imageUrl);
      
      let width = 512;
      let height = 512;
      
      const [w, h] = aspectRatio.split(':').map(Number);
      if (w > h) {
        height = (512 * h) / w;
      } else if (h > w) {
        width = (512 * w) / h;
      }

      const center = getViewportCenter();

      addShape({
        id: Math.random().toString(36).substr(2, 9),
        type: 'image',
        position: {
          x: center.x - width / 2,
          y: center.y - height / 2,
        },
        width,
        height,
        color: 'transparent',
        imageUrl,
        rotation: 0,
        aspectRatio: width / height,
      });
      setTool('select');
      setPrompt('');
    } catch (error) {
      console.log('Error occurred:', error);
      setError(error.message || 'Failed to generate image');
    } finally {
      setIsGenerating(false);
    }
  };

  const renderPreview = () => {
    if (previewUrl) {
      return (
        <div className="mt-3 rounded-md overflow-hidden border border-gray-200">
          <img 
            src={previewUrl} 
            alt="Generated preview" 
            className="w-full h-auto object-cover"
          />
        </div>
      );
    }
    return null;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  return (
    <DraggablePanel 
      title="Generate Image" 
      onClose={onClose}
      initialPosition="right"
    >
      <div className="p-4">
        {error && (
          <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
        
        <select
          value={aspectRatio}
          onChange={(e) => setAspectRatio(e.target.value)}
          className="w-full mb-3 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={isGenerating}
        >
          {ASPECT_RATIOS.map(({ label, value }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe the image you want to generate..."
          className="w-full h-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          disabled={isGenerating}
        />

        <button
          onClick={handleGenerate}
          disabled={!prompt.trim() || isGenerating}
          className={`mt-3 w-full px-4 py-2 rounded-md text-white font-medium flex items-center justify-center gap-2 ${
            isGenerating || !prompt.trim()
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
          {isGenerating ? 'Generating...' : 'Generate'}
        </button>

        <div className="mt-4 border-t border-gray-200 pt-4">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            {showAdvanced ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <span className="text-sm font-medium">Advanced Settings</span>
          </button>
          {showAdvanced && (
            <div className="mt-3 space-y-3">
              <div className="space-y-2">
                <label className="block text-sm text-gray-700">Negative Prompt</label>
                <textarea
                  value={advancedSettings.negativePrompt}
                  onChange={(e) => setAdvancedSettings({...advancedSettings, negativePrompt: e.target.value})}
                  className="w-full h-20 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Elements to exclude from the generation..."
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm text-gray-700">Steps ({advancedSettings.steps})</label>
                <input
                  type="range"
                  min="10"
                  max="150"
                  value={advancedSettings.steps}
                  onChange={(e) => setAdvancedSettings({...advancedSettings, steps: parseInt(e.target.value)})}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm text-gray-700">Guidance Scale ({advancedSettings.guidanceScale})</label>
                <input
                  type="range"
                  min="1"
                  max="20"
                  step="0.1"
                  value={advancedSettings.guidanceScale}
                  onChange={(e) => setAdvancedSettings({...advancedSettings, guidanceScale: parseFloat(e.target.value)})}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm text-gray-700">Scheduler</label>
                <select
                  value={advancedSettings.scheduler}
                  onChange={(e) => setAdvancedSettings({...advancedSettings, scheduler: e.target.value})}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    onChange={(e) => setAdvancedSettings({...advancedSettings, seed: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={() => setAdvancedSettings({...advancedSettings, seed: Math.floor(Math.random() * 1000000)})}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    🎲
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {renderPreview()}
      </div>
    </DraggablePanel>
  );
};