
// GalleryDrawer.tsx
import React, { useEffect } from 'react';
import { Drawer } from './Drawer';
import { useStore } from '../store';
import ImageGrid from './ui/ImageGrid';

interface SavedImage {
  id: string;
  generated_01: string;
  prompt: string;
  created_at: string;
  status: 'generating' | 'completed' | 'failed';
  aspect_ratio: string;
}

interface GalleryDrawerProps {
  setViewingImage: (image: SavedImage | null) => void;
}

export const GalleryDrawer: React.FC<GalleryDrawerProps> = ({
  setViewingImage
}) => {
  const {
    isGenerating,
    generatedImages,
    fetchGeneratedImages,
    deleteGeneratedImage,
    addImageToCanvas,
    galleryRefreshCounter
  } = useStore(state => ({
    isGenerating: state.isGenerating,
    generatedImages: state.generatedImages,
    fetchGeneratedImages: state.fetchGeneratedImages,
    deleteGeneratedImage: state.deleteGeneratedImage,
    addImageToCanvas: state.addImageToCanvas,
    galleryRefreshCounter: state.galleryRefreshCounter
  }));

  const showGallery = useStore(state => state.showGallery);

  useEffect(() => {
    if (showGallery) {
      fetchGeneratedImages();
    }
  }, [showGallery, galleryRefreshCounter, fetchGeneratedImages]);

  const handleImageClick = async (image: SavedImage) => {
    const success = await addImageToCanvas(
      { url: image.generated_01 },
      { defaultWidth: 512 }
    );
    if (success) {
      useStore.getState().toggleGallery();
    }
  };

  const displayImages = isGenerating
    ? [
      {
        id: 'generating-placeholder',
        url: '',
        prompt: 'Creating your image...',
        status: 'generating',
        created_at: new Date().toISOString(),
        aspect_ratio: '1:1'
      },
      ...generatedImages.map(img => ({ ...img, url: img.generated_01 }))
    ]
    : generatedImages.map(img => ({ ...img, url: img.generated_01 }));

  return (
    <Drawer
      title="Generated Images"
      isOpen={showGallery}
      onClose={() => useStore.getState().toggleGallery()}
      position="right"
    >
      <div className="p-2">
        <ImageGrid
          images={displayImages}
          loading={false}
          emptyMessage="No generated images yet"
          onImageClick={handleImageClick}
          onImageDelete={deleteGeneratedImage}
          onViewDetails={setViewingImage}
          showViewButton={true}
          imageUrlKey="url"
        />
      </div>
    </Drawer>
  );
};