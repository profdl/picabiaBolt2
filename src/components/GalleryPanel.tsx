import React, { useState, useEffect } from 'react';
import { Drawer } from './Drawer';
import { useStore } from '../store';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

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
}

export const GalleryPanel: React.FC<GalleryPanelProps> = ({
  isOpen
}) => {
  const [images, setImages] = useState<SavedImage[]>([]);
  const addShape = useStore(state => state.addShape);
  const { zoom, offset } = useStore();
  const showGallery = useStore(state => state.showGallery);
  const [hasGeneratingImages, setHasGeneratingImages] = useState(false);
  const toggleGallery = useStore(state => state.toggleGallery);
  const [loading, setLoading] = useState(false);
  const isGenerating = useStore(state => state.isGenerating);

  const displayImages: SavedImage[] = isGenerating ? [
    {
      id: 'generating-placeholder',
      prompt: 'Creating your image...',
      status: 'generating',
      created_at: new Date().toISOString(),
      image_url: '',
      image_url_2: null,
      image_url_3: null,
      image_url_4: null,
      aspect_ratio: '1:1'
    },
    ...images
  ] : images;

  const fetchImages = async () => {
    setLoading(true);
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
      setHasGeneratingImages(imagesWithStatus?.some(img => img.status === 'generating') || false);
    } catch (err) {
      console.error('Error fetching images:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let pollInterval: NodeJS.Timeout;

    // Initial fetch
    fetchImages();

    // Set up real-time subscription
    const channel = supabase
      .channel('generated_images_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'generated_images'
        },
        () => fetchImages()
      )
      .subscribe();

    // Backup polling for generating images
    if (hasGeneratingImages) {
      pollInterval = setInterval(fetchImages, 1000);
    }

    return () => {
      channel.unsubscribe();
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [isOpen, hasGeneratingImages]);

  const galleryRefreshCounter = useStore(state => state.galleryRefreshCounter);

  useEffect(() => {
    if (isOpen) {
      fetchImages();
    }
  }, [isOpen, galleryRefreshCounter]);

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
      isOpen={showGallery}
      onClose={toggleGallery}
      position="right"
    >
      <div className="p-2">
        {loading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading images...</p>
          </div>
        ) : displayImages.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No generated images yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 p-4">
            {displayImages.map(image => {
              const key = `${image.id}-${image.status}`; // Stable key that only changes when needed
              return (
                <div
                  key={key}
                  className="relative aspect-square bg-gray-50 rounded-lg overflow-hidden"
                >
                  {image.status === 'generating' ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                        <p className="text-sm font-medium text-gray-600">Generating...</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {[image.image_url, image.image_url_2, image.image_url_3, image.image_url_4]
                        .filter(url => url !== null)
                        .map((url, index) => (
                          <div key={`${image.id}-${index}`} className="absolute inset-0">
                            <img
                              src={url || ''}
                              alt={image.prompt}
                              className="w-full h-full object-cover"
                              onClick={() => handleImageClick({
                                ...image,
                                image_url: url as string
                              })}
                            />
                            <div className="absolute inset-x-0 bottom-0 bg-white bg-opacity-75 p-2">
                              <p className="text-sm text-gray-600 truncate">{image.prompt}</p>
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
                        ))
                      }
                    </>
                  )}
                </div>
              );
            })}
          </div>

        )}
      </div>
    </Drawer>
  );
};




