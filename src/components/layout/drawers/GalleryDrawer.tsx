import React, { Dispatch, SetStateAction, useEffect, useState } from "react";
import { Drawer } from "../../shared/Drawer";
import ImageGrid from "../../shared/ImageGrid";
import { ImageItem } from "../../shared/ImageGrid";
import { ImageDetailsModal } from "../../layout/modals/ImageDetailsModal";
import { useStore } from "../../../store";
import { SavedImage } from '../../../store/slices/drawerSlice';

interface GalleryDrawerProps {
  setViewingImage: Dispatch<SetStateAction<SavedImage | null>>;
  isOpen: boolean;
  onClose: () => void;
  viewingImage: SavedImage | null;
}


export const GalleryDrawer: React.FC<GalleryDrawerProps> = () => {
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  const [viewingImage, setViewingImage] = useState<SavedImage | null>(null);

  const {
    generatedImages,
    fetchGeneratedImages,
    deleteGeneratedImage,
    addImageToCanvas,
    isLoading,
    showGallery,
    toggleGallery,
  } = useStore((state) => ({
    generatedImages: state.generatedImages,
    fetchGeneratedImages: state.fetchGeneratedImages,
    deleteGeneratedImage: state.deleteGeneratedImage,
    addImageToCanvas: state.addImageToCanvas,
    isLoading: state.isLoading,
    showGallery: state.showGallery,
    toggleGallery: state.toggleGallery,
  }));

  useEffect(() => {
    if (showGallery) {
      fetchGeneratedImages();
    }
  }, [showGallery, fetchGeneratedImages]);

  const handleImageClick = async (image: ImageItem) => {
    const success = await addImageToCanvas(
      { url: image.url },
      { defaultWidth: 512 }
    );
    if (success) {
      toggleGallery();
    }
  };

  const displayImages: ImageItem[] = generatedImages.map((img) => ({
    id: img.id,
    url: img.generated_01,
    prompt: img.prompt,
    status: img.status,
    created_at: img.created_at,
    aspect_ratio: img.aspect_ratio,
    alt: img.prompt || "Generated image",
  }));

  const handleImageViewClick = (image: ImageItem) => {
      const fullImage = generatedImages.find((img) => img.id === image.id) as SavedImage;
      if (fullImage) {
        const index = generatedImages.indexOf(fullImage);
        setCurrentImageIndex(index);
        setViewingImage(fullImage);
      }
    };

  const handleNext = () => {
    const nextIndex = currentImageIndex + 1;
    if (nextIndex < generatedImages.length) {
      setCurrentImageIndex(nextIndex);
      setViewingImage(generatedImages[nextIndex]);
    }
  };

  const handlePrevious = () => {
    const prevIndex = currentImageIndex - 1;
    if (prevIndex >= 0) {
      setCurrentImageIndex(prevIndex);
      setViewingImage(generatedImages[prevIndex]);
    }
  };

  return (
    <>
      <Drawer
        title="Generated Images"
        isOpen={showGallery}
        onClose={toggleGallery}
        position="right"
      >
        <div className="p-2">
          <ImageGrid
            images={displayImages}
            loading={isLoading}
            emptyMessage="No generated images yet"
            onImageClick={handleImageClick}
            onImageDelete={deleteGeneratedImage}
            onViewDetails={handleImageViewClick}
            showViewButton={true}
            imageUrlKey="url"
          />
        </div>
      </Drawer>
      {viewingImage && (
        <ImageDetailsModal
          image={viewingImage}
          onClose={() => setViewingImage(null)}
          onNext={handleNext}
          onPrevious={handlePrevious}
          hasNext={currentImageIndex < generatedImages.length - 1}
          hasPrevious={currentImageIndex > 0}
        />
      )}
    </>
  );
};
