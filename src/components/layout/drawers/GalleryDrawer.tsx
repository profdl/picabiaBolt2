// src/components/layout/drawers/GalleryDrawer.tsx
import React, { useEffect, useState } from "react";
import { Drawer } from "../../shared/Drawer";
import ImageGrid from "../../shared/ImageGrid";
import { ImageItem } from "../../shared/ImageGrid";
import { ImageDetailsModal } from "../../layout/modals/ImageDetailsModal";
import { useStore } from "../../../store";
import { SavedImage } from '../../../types';
import { useShapeAdder } from "../../../hooks/useShapeAdder";

interface GalleryDrawerProps {

  onClose: () => void;
  viewingImage: SavedImage | null;
}

export const GalleryDrawer: React.FC<GalleryDrawerProps> = () => {
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  const [viewingImage, setViewingImage] = useState<SavedImage | null>(null);
  const [page, setPage] = useState(1);
  const IMAGES_PER_PAGE = 20;

  const { addNewShape } = useShapeAdder();

  const {
    generatedImages,
    fetchGeneratedImages,
    deleteGeneratedImage,
    isLoading,
    showGallery,
    toggleGallery,
    hasMore
  } = useStore((state) => ({
    generatedImages: state.generatedImages,
    fetchGeneratedImages: state.fetchGeneratedImages,
    deleteGeneratedImage: state.deleteGeneratedImage,
    isLoading: state.isLoading,
    showGallery: state.showGallery,
    toggleGallery: state.toggleGallery,
    hasMore: state.hasMore
  }));

  useEffect(() => {
    if (showGallery) {
      fetchGeneratedImages(page, IMAGES_PER_PAGE);
    }
  }, [showGallery, page, fetchGeneratedImages]);

  const loadMore = () => {
    if (!isLoading && hasMore) {
      setPage((prevPage) => prevPage + 1);
    }
  };

  const handleImageClick = async (image: ImageItem) => {
    // Get image dimensions from aspect ratio if available
    const width = 512; // Default width
    let height = 512;
    if (image.aspect_ratio) {
      const aspectRatio = parseFloat(image.aspect_ratio);
      if (!isNaN(aspectRatio)) {
        height = width / aspectRatio;
      }
    }

    const success = await addNewShape('image', {
      imageUrl: image.url,
      width,
      height,
      aspectRatio: width / height,
    }, {
      defaultWidth: width,
      centerOnShape: true,
      setSelected: true
    });

    if (success) {
      toggleGallery();
    }
  };

  const displayImages: ImageItem[] = generatedImages
    .filter(img => img.generated_01) // Filter out images with no URL
    .map((img) => ({
      id: img.id,
      url: img.generated_01,
      prompt: img.prompt,
      status: img.status,
      created_at: img.created_at,
      aspect_ratio: img.aspect_ratio,
      alt: img.prompt || "Generated image",
      onError: (e: React.SyntheticEvent<HTMLImageElement>) => {
        // Hide the broken image container
        const target = e.currentTarget;
        target.parentElement?.style.setProperty('display', 'none');
      }
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
      setViewingImage(generatedImages[nextIndex] as SavedImage);
    }
  };

  const handlePrevious = () => {
    const prevIndex = currentImageIndex - 1;
    if (prevIndex >= 0) {
      setCurrentImageIndex(prevIndex);
      setViewingImage(generatedImages[prevIndex] as SavedImage);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    // Load more when user scrolls near bottom
    if (scrollHeight - scrollTop <= clientHeight * 1.5) {
      loadMore();
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
        <div className="flex flex-col h-full">
          <div 
            className="flex-1 overflow-y-auto"
            onScroll={handleScroll}
          >
            <div className="p-2">
              <ImageGrid
                images={displayImages}
                loading={isLoading && page === 1}
                emptyMessage="No generated images yet"
                onImageClick={handleImageClick}
                onImageDelete={deleteGeneratedImage}
                onViewDetails={handleImageViewClick}
                showViewButton={true}
                imageUrlKey="url"
              />
              {/* Loading spinner for pagination */}
              {isLoading && page > 1 && (
                <div className="py-4 flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </div>
              )}
              {/* Load more button */}
              {!isLoading && hasMore && (
                <div className="py-4 flex justify-center">
                  <button
                    onClick={loadMore}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200"
                  >
                    Load More
                  </button>
                </div>
              )}
            </div>
          </div>
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