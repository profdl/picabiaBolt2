// src/components/layout/drawers/GalleryDrawer.tsx
import React, { useEffect, useState } from "react";
import { Drawer } from "../../shared/Drawer";
import ImageGrid from "../../shared/ImageGrid";
import { ImageItem } from "../../shared/ImageGrid";
import { ImageDetailsModal, SavedImage as ModalSavedImage } from "../../layout/modals/ImageDetailsModal";
import { useStore } from "../../../store";
import { SavedImage } from '../../../types';
import { useShapeAdder } from "../../../hooks/shapes/useShapeAdder";
import { getImageDimensions } from "../../../utils/image";

// Use the SavedImage type from ImageDetailsModal to ensure compatibility
type StoreGeneratedImage = ModalSavedImage;

// Define a partial store state for what we need at runtime
interface PartialStoreState {
  generatedImages?: StoreGeneratedImage[];
  hasMore?: boolean;
}

interface GalleryDrawerProps {
  onClose: () => void;
  viewingImage: SavedImage | null;
}

export const GalleryDrawer: React.FC<GalleryDrawerProps> = () => {
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  const [viewingImage, setViewingImage] = useState<StoreGeneratedImage | null>(null);
  const [page, setPage] = useState(1);
  const [generatedImages, setGeneratedImages] = useState<StoreGeneratedImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const IMAGES_PER_PAGE = 20;

  const { addNewShape } = useShapeAdder();

  // Get UI store properties
  const showGallery = useStore(state => state.showGallery);
  const toggleGallery = useStore(state => state.toggleGallery);
  
  // Get action functions
  const fetchGeneratedImages = useStore(state => state.fetchGeneratedImages);
  const deleteGeneratedImage = useStore(state => state.deleteGeneratedImage);

  // Reset state when gallery is opened
  useEffect(() => {
    if (showGallery) {
      setPage(1);
      setGeneratedImages([]);
    }
  }, [showGallery]);

  // Custom handler for image deletion that updates local state
  const handleDeleteImage = async (imageId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      // Delete from server first
      const success = await deleteGeneratedImage(imageId);
      if (success) {
        // Then update local state if successful
        setGeneratedImages(prevImages => {
          return prevImages.filter(img => img.id !== imageId);
        });
        
        // Reset viewingImage if it was deleted
        if (viewingImage && viewingImage.id === imageId) {
          setViewingImage(null);
        }
      }
    } catch (error) {
      console.error("Failed to delete image:", error);
    }
  };

  // Load images when drawer is opened or page changes
  useEffect(() => {
    if (!showGallery) return;
    
    const loadImages = async () => {
      setIsLoading(true);
      try {
        // Call the global fetchGeneratedImages function
        await fetchGeneratedImages(page, IMAGES_PER_PAGE);
        
        // We can't directly use the result due to TS errors, so let's retrieve it via selector
        const state = useStore.getState() as PartialStoreState;
        
        // Get values with proper type assertion
        const newImages = state.generatedImages || [];
        const hasMoreImages = state.hasMore || false;
        
        // Update our local state to avoid direct store access in render
        // Ensure we don't add duplicates by checking IDs
        setGeneratedImages(prev => {
          if (page === 1) return newImages;
          
          // Create a map of existing image IDs for quick lookup
          const existingIds = new Set(prev.map(img => img.id));
          
          // Filter out any images that already exist in our state
          const uniqueNewImages = newImages.filter(img => !existingIds.has(img.id));
          
          return [...prev, ...uniqueNewImages];
        });
        
        setHasMore(hasMoreImages);
      } catch (error) {
        console.error("Failed to fetch images:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadImages();
  }, [showGallery, page, fetchGeneratedImages]);

  const loadMore = () => {
    if (!isLoading && hasMore) {
      setPage(prevPage => prevPage + 1);
    }
  };

  const handleImageClick = async (image: ImageItem) => {
    try {
      const { width: originalWidth, height: originalHeight } = await getImageDimensions(image.url);
      const aspectRatio = originalWidth / originalHeight;
  
      const success = await addNewShape(
        'image',
        {
          imageUrl: image.url,
          originalWidth,
          originalHeight,
          aspectRatio,
        },
        image.url,
        {
          centerOnShape: true,
          setSelected: true
        }
      );
  
      if (success) {
        toggleGallery();
      }
    } catch (error) {
      console.error("Failed to get image dimensions:", error);
    }
  };

  const displayImages: ImageItem[] = (generatedImages || [])
    .filter((img: StoreGeneratedImage) => img?.generated_01) // Filter out images with no URL
    .map((img: StoreGeneratedImage) => ({
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
    const fullImage = generatedImages.find((img: StoreGeneratedImage) => img.id === image.id);
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

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight * 1.5 && !isLoading && hasMore) {
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
        <div className="p-2 h-full overflow-y-auto" onScroll={handleScroll}>
          <ImageGrid
            images={displayImages}
            loading={isLoading && page === 1}
            emptyMessage="No generated images yet"
            onImageClick={handleImageClick}
            onImageDelete={handleDeleteImage}
            onViewDetails={handleImageViewClick}
            showViewButton={true}
            imageUrlKey="url"
          />
          {isLoading && page > 1 && (
            <div className="py-4 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          )}
          {/* Remove the "Load More" button since we're using infinite scroll */}
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