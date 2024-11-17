import React, { useState, useEffect, useCallback } from 'react';
import { Drawer } from './Drawer';
import { useStore } from '../store';
import { createClient } from '@supabase/supabase-js';
import { ImageDetailsModal } from './ImageDetailsModal';
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface SavedImage {
  id: string;
  image_url: string;
  image_url_2: string | null;
  image_url_3: string | null;
  image_url_4: string | null;
  prompt: string;
  created_at: string;
  status: 'generating' | 'completed' | 'failed';
  aspect_ratio: string;
}

interface GalleryPanelProps {
  isOpen: boolean;
  viewingImage: SavedImage | null;
  setViewingImage: (image: SavedImage | null) => void;
}




export const GalleryPanel: React.FC<GalleryPanelProps> = ({
  isOpen, setViewingImage
}) => {
  const [images, setImages] = useState<SavedImage[]>([]);
  const addShape = useStore(state => state.addShape);
  const showGallery = useStore(state => state.showGallery);
  const toggleGallery = useStore(state => state.toggleGallery);
  const isGenerating = useStore(state => state.isGenerating);
  const [loading, setLoading] = useState(false);

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
    } catch (err) {
      console.error('Error fetching images:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleImageClick = useCallback((image: SavedImage) => {
    const currentZoom = useStore.getState().zoom;
    const currentOffset = useStore.getState().offset;

    const center = {
      x: (window.innerWidth / 2 - currentOffset.x) / currentZoom,
      y: (window.innerHeight / 2 - currentOffset.y) / currentZoom
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
      isUploading: false
    });
  }, [addShape]); // Only depends on addShape now


  useEffect(() => {
    fetchImages();

    const channel = supabase
      .channel('generated_images_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'generated_images'
        },
        (payload: { new: SavedImage }) => {
          fetchImages();

          if (payload.new.status === 'completed') {
            // Get current zoom and offset values when needed
            const currentZoom = useStore.getState().zoom;
            const currentOffset = useStore.getState().offset;

            const images = [
              payload.new.image_url,
              payload.new.image_url_2,
              payload.new.image_url_3,
              payload.new.image_url_4
            ].filter(url => url !== null);

            images.forEach((imageUrl, index) => {
              const center = {
                x: (window.innerWidth / 2 - currentOffset.x) / currentZoom + (index * 520),
                y: (window.innerHeight / 2 - currentOffset.y) / currentZoom
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
                imageUrl,
                rotation: 0,
                isUploading: false
              });
            });
          }
        }
      ).subscribe();
    return () => {
      channel.unsubscribe();
    };
  }, [isOpen, addShape, handleImageClick]);


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

  // Rest of your component remains the same

  const galleryRefreshCounter = useStore(state => state.galleryRefreshCounter);

  useEffect(() => {
    if (isOpen) {
      fetchImages();
    }
  }, [isOpen, galleryRefreshCounter]);


  const handleDeleteImage = async (imageId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Directly delete the database record first
      const { error: dbError } = await supabase
        .from('generated_images')
        .delete()
        .eq('id', imageId)
        .eq('user_id', user.id);

      if (dbError) throw dbError;

      // Update local state immediately
      setImages(prevImages => prevImages.filter(img => img.id !== imageId));

      // Clean up storage files using the current image data from state
      const imageToDelete = images.find(img => img.id === imageId);
      if (imageToDelete) {
        const urls = [
          imageToDelete.image_url,
          imageToDelete.image_url_2,
          imageToDelete.image_url_3,
          imageToDelete.image_url_4
        ].filter(Boolean);

        const filenames = urls.map(url => url.split('/').pop()).filter(Boolean);

        if (filenames.length > 0) {
          await supabase.storage
            .from('generated-images')
            .remove(filenames);
        }
      }

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
                          <div
                            key={`${image.id}-${index}`}
                            className="absolute inset-0 group"
                          >
                            <img
                              src={url || ''}
                              alt={image.prompt}
                              className="w-full h-full object-cover"
                            />
                            <button
                              onClick={() => handleImageClick({
                                ...image,
                                image_url: url as string
                              })}
                              className="absolute inset-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                            >
                              <span className="bg-black/50 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-black/70 whitespace-nowrap">
                                Add to Board
                              </span>
                            </button>
                            <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              <button
                                onClick={() => setViewingImage(image)}
                                className="p-2 bg-black/50 text-white rounded-full hover:bg-black/70"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                  <circle cx="12" cy="12" r="3" />
                                </svg>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteImage(image.id);
                                }}
                                className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                                  <path d="M10 11v6M14 11v6" />
                                </svg>
                              </button>
                            </div>
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



