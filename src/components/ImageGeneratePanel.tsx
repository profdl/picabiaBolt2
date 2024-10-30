import React, { useState, useEffect } from 'react';
import { Sparkles, AlertCircle, X } from 'lucide-react';
import { generateImage } from '../lib/replicate';
import { useStore } from '../store';
import { supabase } from '../lib/supabase';

const ASPECT_RATIOS = [
  { label: 'Square (1:1)', value: '1:1' },
  { label: 'Landscape (16:9)', value: '16:9' },
  { label: 'Portrait (9:16)', value: '9:16' },
];

type SavedImage = {
  id: string
  image_url: string
  prompt: string
  created_at: string
}

export function ImageGeneratePanel() {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [savedImages, setSavedImages] = useState<SavedImage[]>([]);
  const { zoom, offset, addShape, setTool } = useStore(state => ({
    zoom: state.zoom,
    offset: state.offset,
    addShape: state.addShape,
    setTool: state.setTool
  }));

  useEffect(() => {
    const fetchSavedImages = async () => {
      const { data } = await supabase
        .from('generated_images')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10); // Limit to recent images
      
      if (data) setSavedImages(data);
    }
    fetchSavedImages();
  }, []);
  

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    
    setIsGenerating(true);
    setError(null);

    try {
      const imageUrl = await generateImage(prompt.trim(), aspectRatio);
      setPreviewUrl(imageUrl);
      
      // Save to Supabase
      const { data: savedImage, error } = await supabase
        .from('generated_images')
        .insert({
          image_url: imageUrl,
          prompt,
          aspect_ratio: aspectRatio,
          user_id: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (error) throw error;
      
      setSavedImages(prev => [savedImage, ...prev]);

      // Calculate dimensions based on aspect ratio
      let width = 512;
      let height = 512;
      
      const [w, h] = aspectRatio.split(':').map(Number);
      if (w > h) {
        height = (512 * h) / w;
      } else if (h > w) {
        width = (512 * w) / h;
      }

      const getViewportCenter = () => {
        const rect = document.querySelector('#root')?.getBoundingClientRect();
        if (!rect) return { x: 0, y: 0 };
        
        return {
          x: (rect.width / 2 - offset.x) / zoom,
          y: (rect.height / 2 - offset.y) / zoom
        };
      };

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
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate image';
      console.error('Image generation failed:', errorMessage);
      setError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const renderImageGallery = () => (
    <div className="mt-4 space-y-4">
      <h4 className="font-medium text-gray-900">Generated Images</h4>
      <div className="grid grid-cols-2 gap-2">
        {savedImages.map((image) => (
          <div 
            key={image.id} 
            className="relative group cursor-pointer rounded-md overflow-hidden"
            onClick={() => {
              setPreviewUrl(image.image_url);
              setPrompt(image.prompt);
            }}
          >
            <img 
              src={image.image_url} 
              alt={image.prompt}
              className="w-full h-24 object-cover"
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200">
              <p className="text-white text-xs p-2 opacity-0 group-hover:opacity-100">
                {image.prompt}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

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

  if (isCollapsed) {
    return (
      <button
        onClick={() => setIsCollapsed(false)}
        className="absolute right-4 top-4 p-3 bg-white rounded-lg shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors"
        title="Open Image Generation"
      >
        <Sparkles className="w-5 h-5 text-gray-600" />
      </button>
    );
  }
  return (
    <div className="absolute right-4 top-4 w-64 bg-white rounded-lg shadow-lg border border-gray-200">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-gray-900">Generate Image</h3>
          <button
            onClick={() => setIsCollapsed(true)}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

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

        {renderPreview()}
        {renderImageGallery()}
      </div>
    </div>
  );
}