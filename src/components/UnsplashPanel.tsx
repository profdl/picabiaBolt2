import React, { useState, useEffect, useCallback } from 'react';
import { Search, Loader,  Image as ImageIcon } from 'lucide-react';
import { useStore } from '../store';
import debounce from 'lodash/debounce';
import { DraggablePanel } from './DraggablePanel';

const UNSPLASH_ACCESS_KEY = '8Pc0QO3oorclz9uR4RVfaFD5aXcBUnJ-2d9FP-KtI9U';
const UNSPLASH_API_URL = 'https://api.unsplash.com';

interface UnsplashImage {
  id: string;
  urls: {
    regular: string;
    thumb: string;
  };
  alt_description: string;
  user: {
    name: string;
    username: string;
  };
  width: number;
  height: number;
}
interface UnsplashPanelProps {
  onClose: () => void;
}
export const UnsplashPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [query, setQuery] = useState('');
  const [images, setImages] = useState<UnsplashImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draggedImage, setDraggedImage] = useState<UnsplashImage | null>(null);
  
  const addShape = useStore(state => state.addShape);
  const zoom = useStore(state => state.zoom);
  const offset = useStore(state => state.offset);

  const searchImages = useCallback(
    debounce(async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setImages([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `${UNSPLASH_API_URL}/search/photos?query=${encodeURIComponent(
            searchQuery
          )}&per_page=20&orientation=landscape`,
          {
            headers: {
              Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch images');
        }

        const data = await response.json();
        setImages(data.results);
      } catch (err) {
        setError('Failed to load images. Please try again.');
        console.error('Error fetching Unsplash images:', err);
      } finally {
        setLoading(false);
      }
    }, 500),
    []
  );

  useEffect(() => {
    if (query) {
      searchImages(query);
    }
    return () => searchImages.cancel();
  }, [query, searchImages]);

  const getCanvasPoint = (clientX: number, clientY: number) => {
    const canvas = document.querySelector('.canvas-container');
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left - offset.x) / zoom;
    const y = (clientY - rect.top - offset.y) / zoom;

    return { x, y };
  };

  const handleDragStart = (e: React.DragEvent, image: UnsplashImage) => {
    setDraggedImage(image);
    
    // Create a ghost image
    const ghostImage = new Image();
    ghostImage.src = image.urls.thumb;
    ghostImage.style.opacity = '0.5';
    
    e.dataTransfer.setDragImage(ghostImage, 0, 0);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragEnd = () => {
    setDraggedImage(null);
  };

  const handleAddImage = (image: UnsplashImage, clientX?: number, clientY?: number) => {
    const maxWidth = 512;
    const aspectRatio = image.width / image.height;
    const width = Math.min(maxWidth, image.width);
    const height = width / aspectRatio;

    let position;
    if (typeof clientX === 'number' && typeof clientY === 'number') {
      position = getCanvasPoint(clientX, clientY);
      // Center the image on the cursor
      position.x -= width / 2;
      position.y -= height / 2;
    } else {
      // Default to viewport center if no coordinates provided
      const canvas = document.querySelector('.canvas-container');
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      position = getCanvasPoint(
        rect.left + rect.width / 2,
        rect.top + rect.height / 2
      );
      position.x -= width / 2;
      position.y -= height / 2;
    }

    addShape({
      id: Math.random().toString(36).substr(2, 9),
      type: 'image',
      position,
      width,
      height,
      color: 'transparent',
      imageUrl: image.urls.regular,
      rotation: 0,
      aspectRatio,
    });
  };

  useEffect(() => {
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      if (!draggedImage) return;
  
      handleAddImage(draggedImage, e.clientX, e.clientY);
      setDraggedImage(null);
    };
  
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (draggedImage) {
        e.dataTransfer!.dropEffect = 'copy';
      }
    };
  
    const canvas = document.querySelector('.canvas-container');
    if (canvas) {
      canvas.addEventListener('drop', handleDrop as EventListener);
      canvas.addEventListener('dragover', handleDragOver as EventListener);
    }
  
    return () => {
      if (canvas) {
        canvas.removeEventListener('drop', handleDrop as EventListener);
        canvas.removeEventListener('dragover', handleDragOver as EventListener);
      }
    };
  }, [draggedImage]);
  

  return (
    <DraggablePanel 
      title="Unsplash Images" 
      onClose={onClose}
      initialPosition="left"
    >
      <div className="p-4">
        <div className="relative mb-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search images..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
        </div>

        {error && (
          <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="space-y-2 max-h-[calc(100vh-16rem)] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader className="w-6 h-6 text-gray-400 animate-spin" />
            </div>
          ) : images.length > 0 ? (
            images.map((image) => (
              <div
                key={image.id}
                className="group relative cursor-grab rounded-md overflow-hidden hover:ring-2 hover:ring-blue-500"
                onClick={() => handleAddImage(image)}
                draggable
                onDragStart={(e) => handleDragStart(e, image)}
                onDragEnd={handleDragEnd}
              >
                <img
                  src={image.urls.thumb}
                  alt={image.alt_description || 'Unsplash image'}
                  className="w-full h-32 object-cover"
                  draggable={false}
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity flex items-center justify-center">
                  <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-sm font-medium">
                    Drag or click to add
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
                  <p className="text-xs text-white">
                    Photo by {image.user.name}
                  </p>
                </div>
              </div>
            ))
          ) : query ? (
            <p className="text-center text-gray-500 py-4">No images found</p>
          ) : (
            <div className="text-center text-gray-500 py-4">
              <ImageIcon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p>Search for images to add to your canvas</p>
            </div>
          )}
        </div>
      </div>
    </DraggablePanel>
  );
};


