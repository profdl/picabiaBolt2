import React, { useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { generateImage } from '../lib/replicate';
import { useStore } from '../store';

export function GenerationPanel() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addShape } = useStore();

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    
    setIsGenerating(true);
    setError(null);

    try {
      const imageUrl = await generateImage(prompt.trim());
      
      // Add the generated image to the canvas
      addShape({
        id: Math.random().toString(36).substr(2, 9),
        type: 'image',
        position: {
          x: window.innerWidth / 2 - 150,
          y: window.innerHeight / 2 - 100
        },
        width: 300,
        height: 200,
        color: 'transparent',
        imageUrl,
        rotation: 0,
      });

      setPrompt('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate image. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  return (
    <div className="absolute right-4 top-4 w-60 bg-white rounded-lg shadow-lg p-4 border border-gray-200">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-900">Generate Image</h3>
          {error && (
            <button
              onClick={() => setError(null)}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
            {error}
          </div>
        )}

        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe the image you want to generate..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          rows={3}
          disabled={isGenerating}
        />

        <button
          onClick={handleGenerate}
          disabled={!prompt.trim() || isGenerating}
          className={`w-full px-4 py-2 rounded-md text-white font-medium flex items-center justify-center gap-2 ${
            isGenerating || !prompt.trim()
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
          {isGenerating ? 'Generating...' : 'Generate'}
        </button>
      </div>
    </div>
  );
}