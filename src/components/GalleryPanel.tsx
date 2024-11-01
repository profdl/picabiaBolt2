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
        
        console.log('Raw data from DB:', data);
        
        const imagesWithPublicUrls = data?.map(image => {
          const publicUrl = supabase.storage
            .from('generated-images')
            .getPublicUrl(image.image_url.split('/').pop() || '')
            .data.publicUrl;
            
          console.log('Original URL:', image.image_url);
          console.log('Public URL:', publicUrl);
          
          return {
            ...image,
            image_url: publicUrl
          };
        });
        
        setImages(imagesWithPublicUrls || []);
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
    <DraggablePanel 
      title="Generated Images" 
      onClose={onClose}
      initialPosition="right"
    >
      <div className="grid grid-cols-2 gap-4 p-4">
        {loading ? (
          <div className="col-span-2 text-center">Loading images...</div>
        ) : (
          images.map(image => (
            <div 
              key={image.id}
              onClick={() => handleImageClick(image)}
              className="group relative cursor-pointer rounded-lg overflow-hidden border border-gray-200 hover:border-blue-500 transition-all"
            >
              <img 
                src={image.image_url} 
                alt={image.prompt}
                className="w-full h-32 object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2 text-sm">
                <p className="truncate">{image.prompt}</p>
                <p className="text-xs text-gray-300">
                  {new Date(image.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </DraggablePanel>
  );
};