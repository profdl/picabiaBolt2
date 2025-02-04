import React from "react";
import { Loader2 } from "lucide-react";

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
  if (loading) {
    return (
      <div className="text-center py-8">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" />
        <p className="mt-2 text-gray-600">{loadingMessage}</p>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 p-4">
      {images.map((image) => (
        <div
          key={image.id}
          className="relative aspect-square bg-gray-50 rounded-lg overflow-hidden"
        >
          {image.status === "generating" ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                <p className="text-sm font-medium text-gray-600">
                  Generating...
                </p>
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 group">
              <img
                src={image[imageUrlKey as keyof ImageItem] as string}
                alt={image.prompt || "Image"}
                className="w-full h-full object-cover"
                draggable="true"
                // In ImageGrid.tsx, when setting drag data:
                onDragStart={(e) => {
                  e.dataTransfer.setData(
                    "application/json",
                    JSON.stringify({
                      type: "drawer-image",
                      source: "asset", // or 'gallery' depending on where it's used
                      image,
                    })
                  );
                }}
              />
              <button
                onClick={() => onImageClick(image)}
                className="absolute inset-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              >
                <span className="bg-black/50 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-black/70 whitespace-nowrap">
                  Add to Board
                </span>
              </button>

              <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                {showViewButton && onViewDetails && (
                  <button
                    onClick={() => onViewDetails(image)}
                    className="p-2 bg-black/50 text-white rounded-full hover:bg-black/70"
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
                  className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600"
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
      ))}{" "}
    </div>
  );
};

export default ImageGrid;
