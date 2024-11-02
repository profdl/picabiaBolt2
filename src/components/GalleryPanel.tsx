import React, { useState, useEffect } from 'react';
import { Drawer } from './Drawer';
import { useStore } from '../store';
import { supabase } from '../lib/supabase';

type SavedImage = {
  aspect_ratio: string;
  id: string;
  image_url: string;
  prompt: string;
  created_at: string;
}

interface GalleryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  refreshTrigger?: number;
}

export const GalleryPanel: React.FC<GalleryPanelProps> = ({ 
  isOpen, 
  onClose, 
  refreshTrigger 
}) => {
  const [images, setImages] = useState<SavedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const addShape = useStore(state => state.addShape);
  const { zoom, offset } = useStore();

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const { data, error } = await supabase
          .from('generated_images')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        
        const imagesWithPublicUrls = data?.map(image => ({
          ...image,
          image_url: image.image_url
        }));
        
        setImages(imagesWithPublicUrls || []);
      } catch (err) {
        console.error('Error fetching images:', err);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchImages();
    }
  }, [isOpen, refreshTrigger]);

  const handleImageClick = (image: SavedImage) => {
    const center = {
      x: (window.innerWidth / 2 - offset.x) / zoom,
      y: (window.innerHeight / 2 - offset.y) / zoom
    };

    addShape({
      id: Math.random().toString(36).substr(2, 9),
      type: 'image',
      position: {
        x: center.x - 256,
        y: center.y - 256
      },
      width: 512,
      height: 512,
      color: 'transparent',
      imageUrl: image.image_url,
      rotation: 0,
    });
  };

  return (
    <Drawer 
      title="Generated Images" 
      isOpen={isOpen} 
      onClose={onClose}
      position="right"
    >
      <div className="p-2">
        {loading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading images...</p>
          </div>
        ) : images.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No generated images yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {images.map(image => (
              <div 
                key={image.id}
                onClick={() => handleImageClick(image)}
                className="group cursor-pointer rounded-lg overflow-hidden border border-gray-200 hover:border-blue-500 transition-all bg-white"
              >
                <div className="aspect-square overflow-hidden">
                  <img 
                    src={image.image_url} 
                    alt={image.prompt}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-1.5 text-xs">
                  <p className="text-gray-900 truncate">{new Date(image.created_at).toLocaleDateString()}</p>
                  <p className="text-gray-600 truncate mt-0.5">{image.prompt}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Drawer>
  );
};