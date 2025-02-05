import React from "react";
import { Loader2 } from "lucide-react";
import { useThemeClass } from '../../styles/useThemeClass';

export interface ImageItem {
  id: string;
  url: string;
  prompt?: string;
  status?: "generating" | "completed" | "failed";
  alt?: string;
  thumbnailUrl?: string;
  generated_01?: string;
  created_at?: string;
  aspect_ratio?: string;
}
interface ImageGridProps {
  images: ImageItem[];
  loading?: boolean;
  emptyMessage?: string;
  loadingMessage?: string;
  onImageClick: (image: ImageItem) => void;
  onImageDelete: (imageId: string, e: React.MouseEvent) => void;
  onViewDetails?: (image: ImageItem) => void;
  showViewButton?: boolean;
  imageUrlKey?: "url" | "thumbnailUrl";
}



const ImageGrid = ({
  images,
  loading = false,
  emptyMessage = "No images found",
  loadingMessage = "Loading images...",
  onImageClick,
  onImageDelete,
  onViewDetails,
  showViewButton = false,
  imageUrlKey = "url",
}: ImageGridProps) => {
  const styles = {
    loader: {
      container: useThemeClass(['imageGrid', 'loader', 'container']),
      spinner: useThemeClass(['imageGrid', 'loader', 'spinner']),
      text: useThemeClass(['imageGrid', 'loader', 'text'])
    },
    empty: useThemeClass(['imageGrid', 'empty']),
    grid: useThemeClass(['imageGrid', 'grid']),
    imageContainer: useThemeClass(['imageGrid', 'imageContainer']),
    generatingContainer: useThemeClass(['imageGrid', 'generating', 'container']),
    generatingText: useThemeClass(['imageGrid', 'generating', 'text']),
    imageGroup: useThemeClass(['imageGrid', 'image', 'group']),
    addButtonSpan: useThemeClass(['imageGrid', 'button', 'addText']), 
    addButton: useThemeClass(['imageGrid', 'button', 'add']),
    buttonGroup: useThemeClass(['imageGrid', 'button', 'group']),
    viewButton: useThemeClass(['imageGrid', 'button', 'view']),
    deleteButton: useThemeClass(['imageGrid', 'button', 'delete'])
  };

  if (loading) {
    return (
      <div className={styles.loader.container}>
        <Loader2 className={styles.loader.spinner} />
        <p className={styles.loader.text}>{loadingMessage}</p>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className={styles.empty}>
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={styles.grid}>
      {images.map((image) => (
        <div
          key={image.id}
          className={styles.imageContainer}
        >
          {image.status === "generating" ? (
            <div className={styles.generatingContainer}>
              <div className="flex flex-col items-center gap-2">
                <Loader2 className={styles.loader.spinner} />
                <p className={styles.generatingText}>
                  Generating...
                </p>
              </div>
            </div>
          ) : (
            <div className={styles.imageGroup}>
              <img
                src={image[imageUrlKey as keyof ImageItem] as string}
                alt={image.prompt || "Image"}
                className="w-full h-full object-cover"
                draggable="true"
                onDragStart={(e) => {
                  e.dataTransfer.setData(
                    "application/json",
                    JSON.stringify({
                      type: "drawer-image",
                      source: "asset",
                      image,
                    })
                  );
                }}
              />
 <button
                onClick={() => onImageClick(image)}
                className={styles.addButton}
              >
                <span className={styles.addButtonSpan}>
                  Add to Board
                </span>
              </button>
              <div className={styles.buttonGroup}>
                {showViewButton && onViewDetails && (
                  <button
                    onClick={() => onViewDetails(image)}
                    className={styles.viewButton}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={(e) => onImageDelete(image.id, e)}
                  className={styles.deleteButton}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    <path d="M10 11v6M14 11v6" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ImageGrid;