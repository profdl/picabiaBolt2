
// GalleryDrawer.tsx
import React, { useEffect } from 'react';
import { Drawer } from './Drawer';
import { useStore } from '../store';
import ImageGrid from './ui/ImageGrid';
import { ImageItem } from './ui/ImageGrid';
interface SavedImage {
  id: string;
  generated_01: string;
  prompt?: string;
  created_at: string;
  status: 'generating' | 'completed' | 'failed';
  aspect_ratio: string;
}
interface GalleryDrawerProps {
  setViewingImage: (image: ImageItem | null) => void;
  isOpen: boolean;
  onClose: () => void;
  viewingImage: SavedImage | null;
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

  } = useStore(state => ({
    isGenerating: state.isGenerating,
    generatedImages: state.generatedImages,
    fetchGeneratedImages: state.fetchGeneratedImages,
    deleteGeneratedImage: state.deleteGeneratedImage,
    addImageToCanvas: state.addImageToCanvas,
    galleryRefreshCounter: state.galleryRefreshCounter,
    refreshGallery: state.refreshGallery
  }));

  const showGallery = useStore(state => state.showGallery);

  useEffect(() => {
    let pollInterval: NodeJS.Timeout;

    if (isGenerating) {
      pollInterval = setInterval(() => {
        fetchGeneratedImages();
      }, 2000); // Poll every 2 seconds
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [isGenerating, fetchGeneratedImages]);

  const handleImageClick = async (image: ImageItem) => {
    const savedImage: SavedImage = {
      id: image.id,
      generated_01: image.generated_01 || '',
      prompt: image.prompt,
      created_at: image.created_at || new Date().toISOString(),
      status: image.status || 'completed',
      aspect_ratio: image.aspect_ratio || '1:1'
    };

    const success = await addImageToCanvas(
      { url: savedImage.generated_01 },
      { defaultWidth: 512 }
    );
    if (success) {
      useStore.getState().toggleGallery();
    }
  };

  const displayImages: ImageItem[] = generatedImages.map(img => ({
    id: img.id,
    url: img.generated_01,
    prompt: img.prompt,
    status: img.status || 'completed',
    created_at: img.created_at,
    aspect_ratio: img.aspect_ratio,
    generated_01: img.generated_01
  }));



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
