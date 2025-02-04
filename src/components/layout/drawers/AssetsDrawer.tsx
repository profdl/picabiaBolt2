import React, { useEffect, useState } from "react";
import { Upload, Loader2, Search } from "lucide-react";
import { useStore } from "../../../store";
import { Drawer } from "../../shared/Drawer";
import ImageGrid from "../../shared/ImageGrid";
import { Asset, Shape } from "../../../types";
import { useFileUpload } from "../../../hooks/useFileUpload";
import { usePersonalAssets } from "../../../hooks/usePersonalAssets";
import { useSourcePlus } from "../../../hooks/useSourcePlus";

interface AssetsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onAddShape: (shape: Shape) => void;
  getViewportCenter: () => { x: number; y: number };
}

export const AssetsDrawer: React.FC<AssetsDrawerProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState("my-assets");
  const { addImageToCanvas, assetsRefreshTrigger } = useStore((state) => ({
    addImageToCanvas: state.addImageToCanvas,
    assetsRefreshTrigger: state.assetsRefreshTrigger,
  }));

  // Custom hooks
  const {
    assets,
    loading,
    fetchAssets,
    handleDeleteAsset,
    mapAssetsToImageItems,
  } = usePersonalAssets();

  const { fileInputRef, uploading, handleFileSelect } = useFileUpload(fetchAssets);

  const {
    sourcePlusLoading,
    sourcePlusQuery,
    sourcePlusImages,
    setSourcePlusQuery,
    handleSourcePlusClick,
  } = useSourcePlus(onClose);

  useEffect(() => {
    if (isOpen) {
      fetchAssets();
    }
  }, [isOpen, assetsRefreshTrigger, fetchAssets]);

  const handleAssetClick = async (asset: Asset) => {
    if (!asset) return;
    
    const fullSizeUrl = asset.url.replace("/thumbnails/", "/images/");
    const success = await addImageToCanvas({
      url: fullSizeUrl,
      width: asset.width,
      height: asset.height,
      depthStrength: 0.25,
      edgesStrength: 0.25,
      contentStrength: 0.25,
      poseStrength: 0.25,
      sketchStrength: 0.25,
      remixStrength: 0.25,
    });
    
    if (success) {
      onClose();
    }
  };

  useEffect(() => {
    if (activeTab === "source-plus") {
      setSourcePlusQuery("flowers");
    }
  }, [activeTab, setSourcePlusQuery]);

  return (
    <Drawer title="Assets" isOpen={isOpen} onClose={onClose} position="left">
      <div className="flex flex-col h-full">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab("my-assets")}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              activeTab === "my-assets"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            My Assets
          </button>
          <button
            onClick={() => setActiveTab("source-plus")}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              activeTab === "source-plus"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Source.Plus
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeTab === "source-plus" && (
            <div className="p-4">
              <div className="relative mb-3">
                <input
                  type="text"
                  value={sourcePlusQuery}
                  onChange={(e) => setSourcePlusQuery(e.target.value)}
                  placeholder="Search within collection..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              </div>

              <ImageGrid
                images={
                  sourcePlusImages?.map((img) => ({
                    id: img.id,
                    url: img.url,
                    thumbnailUrl: img.thumbnail_url,
                    alt: img.description || "Source.plus image",
                    status: "completed" as const,
                  })) || []
                }
                loading={sourcePlusLoading}
                emptyMessage="No images found in collection"
                onImageClick={(image) => {
                  const sourcePlusImage = sourcePlusImages.find(
                    (img) => img.id === image.id
                  );
                  if (sourcePlusImage) {
                    handleSourcePlusClick(sourcePlusImage);
                  }
                }}
                onImageDelete={() => {}}
                showViewButton={false}
                imageUrlKey="thumbnailUrl"
              />
            </div>
          )}

          {activeTab === "my-assets" && (
            <div className="p-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full mb-4 p-2 flex items-center justify-center gap-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Upload className="w-5 h-5" />
                )}
                {uploading ? "Uploading..." : "Upload Image"}
              </button>
              <ImageGrid
                images={mapAssetsToImageItems(assets)}
                loading={loading}
                emptyMessage="No uploaded assets yet"
                onImageClick={(image) =>
                  handleAssetClick(assets.find((a) => a.id === image.id)!)
                }
                onImageDelete={handleDeleteAsset}
              />
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
};