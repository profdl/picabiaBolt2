import React, { useState, useEffect } from 'react';
import { Drawer } from './Drawer';
import { useStore } from '../store';
import { supabase } from '../lib/supabase';

type SavedImage = {
  aspect_ratio: string;
  id: string;
  image_url: string;
  image_url_2: string | null;
  image_url_3: string | null;
  image_url_4: string | null;
  prompt: string;
  created_at: string;
  status: 'generating' | 'completed' | 'failed';
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
    const channel = supabase
      .channel('public:generated_images')
      .on('INSERT', payload => {
        setImages(prev => [{
          ...payload.new,
          status: 'generating'
        }, ...prev]);
      })
      .on('UPDATE', payload => {
        setImages(prev => prev.map(img =>
          img.id === payload.new.id ? { ...payload.new, status: 'completed' } : img
        ));

        // Add completed image to whiteboard
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
          imageUrl: payload.new.image_url,
          rotation: 0,
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [addShape, zoom, offset]);
  useEffect(() => {
    const fetchImages = async () => {
      try {
        const { data, error } = await supabase
          .from('generated_images')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        const imagesWithStatus = data?.map(image => ({
          ...image,
          image_url: image.image_url,
          status: image.status || 'completed'
        }));

        setImages(imagesWithStatus || []);
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

  const handleDeleteImage = async (imageId: string) => {
    try {
      const { error } = await supabase
        .from('generated_images')
        .delete()
        .match({ id: imageId });

      if (error) throw error;

      // Remove the deleted image from the local state
      setImages(images.filter(img => img.id !== imageId));
    } catch (err) {
      console.error('Error deleting image:', err);
    }
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
            {images.map(image => {
              const allUrls = [
                image.image_url,
                image.image_url_2,
                image.image_url_3,
                image.image_url_4
              ].filter(url => url !== null);
              return allUrls.map((url, index) => (
                <div
                  key={`${image.id}-${index}`}
                  className="group relative cursor-pointer rounded-lg overflow-hidden border border-gray-200 hover:border-blue-500 transition-all bg-white"
                >
                  <div className="aspect-square overflow-hidden">
                    {image.status === 'generating' ? (
                      <div className="w-full h-full flex items-center justify-center bg-gray-50">
                        <div className="flex flex-col items-center gap-2">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                          <p className="text-sm text-gray-500">Generating...</p>
                        </div>
                      </div>
                    ) : (
                      <img
                        src={url || ''}
                        alt={image.prompt}
                        className="w-full h-full object-cover"
                        onClick={() => handleImageClick({
                          ...image,
                          image_url: url as string
                        })}
                      />
                    )}
                  </div>
                  <div className="p-2 text-sm">
                    <p className="text-gray-600 truncate">{image.prompt}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteImage(image.id);
                    }}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ));
            })}
          </div>

        )}
      </div>
    </Drawer>
  );
};


