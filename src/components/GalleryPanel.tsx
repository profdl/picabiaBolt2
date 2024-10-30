import React, { useState, useEffect } from 'react';
import { DraggablePanel } from './DraggablePanel';
import { useStore } from '../store';
import { supabase } from '../lib/supabase';

type SavedImage = {
  aspect_ratio: string;
  id: string;
  image_url: string;
  prompt: string;
  created_at: string;
}

export const GalleryPanel: React.FC<{ onClose: () => void; refreshTrigger?: number }> = ({ onClose, refreshTrigger }) => {
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
        setImages(data || []);
      } catch (err) {
        console.error('Error fetching images:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, [refreshTrigger]);
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
      rotation: 0
    });
  };

  return (
    <DraggablePanel title="Gallery" onClose={onClose}>
      <div className="grid grid-cols-2 gap-2 p-2">
        {loading ? (
          <div>Loading...</div>
        ) : (
          images.map(image => (
            <div 
              key={image.id}
              onClick={() => handleImageClick(image)}
              className="cursor-pointer hover:opacity-80 transition-opacity"
            >
              <img 
                src={image.image_url} 
                alt={image.prompt}
                className="w-full h-32 object-cover rounded"
              />
            </div>
          ))
        )}
      </div>
    </DraggablePanel>
  );
};