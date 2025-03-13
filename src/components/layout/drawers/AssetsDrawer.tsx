// src/components/layout/drawers/AssetsDrawer.tsx
import React, { useEffect, useState } from "react";
import { Upload, Loader2, Search, ExternalLink } from "lucide-react";
import { useStore } from "../../../store";
import { Drawer } from "../../shared/Drawer";
import ImageGrid from "../../shared/ImageGrid";
import { Asset } from "../../../types";
import { useFileUpload } from "../../../hooks/useFileUpload";
import { usePersonalAssets } from "../../../hooks/project/usePersonalAssets";
import { useSourcePlus } from "../../../hooks/project/useSourcePlus";
import { useShapeAdder } from "../../../hooks/shapes/useShapeAdder";
import { getImageDimensions } from "../../../utils/image";
import { useThemeClass } from "../../../styles/useThemeClass";

interface SourcePlusImage {
  id: string;
  url: string;
  thumbnail_url: string;
  description?: string;
}

interface AssetsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const randomSearchTerms = [
  // Art Movements & Styles
  "renaissance", "baroque", "gothic", "impressionism", "art nouveau", "surrealism", 
  "romanticism", "rococo", "modernism", "victorian", "art deco",

  // Artists
  "albrecht dürer", "rembrandt", "da vinci", "van gogh", "monet",
  "william blake", "Gustav Klimt", "hieronymus bosch", "vermeer", "michelangelo",
  "raphael", "botticelli", "goya", "delacroix", "hokusai",

  // Natural World
  "flowers", "nature", "botanical", "birds", "butterflies", "insects",
  "marine life", "mushrooms", "minerals", "shells", "corals",

  // Sciences & Studies
  "astronomy", "geology", "anatomy", "maps", "medical", "mechanical",
  "zoology", "biology", "archaeology", "mathematics", "alchemy",

  // Design & Decorative
  "patterns", "ornaments", "textiles", "tapestry", "jewelry", "furniture",
  "heraldry", "illuminated", "manuscripts", "calligraphy", "typography",

  // Architecture & Places
  "architecture", "cathedrals", "palaces", "ruins", "gardens",
  "castles", "bridges", "cities", "monuments", "temples",

  // Cultural & Historical
  "medieval", "ancient", "mythology", "religious", "folk art",
  "costumes", "fashion", "weapons", "artifacts", "ritual objects",

  // Specific Collections
  "haeckel", "audubon birds", "redoute roses", "basilius besler",
  "maria sibylla merian", "edward curtis", "karl blossfeldt"
];


export const AssetsDrawer: React.FC<AssetsDrawerProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState("my-assets");
  const { assetsRefreshTrigger } = useStore((state) => ({
    assetsRefreshTrigger: state.assetsRefreshTrigger,
  }));

  const styles = {
    searchContainer: useThemeClass(["drawer", "search", "container"]),
    searchInput: useThemeClass(["drawer", "search", "input"]),
    searchIcon: useThemeClass(["drawer", "search", "icon"]),
  };
  const { addNewShape } = useShapeAdder();



  const {
    assets,
    loading,
    hasMore,
    fetchAssets,
    loadMore,
    handleDeleteAsset,
    mapAssetsToImageItems,
  } = usePersonalAssets();

  const { fileInputRef, uploading, handleFileSelect } = useFileUpload(() =>
    fetchAssets(1)
  );

  const {
    sourcePlusLoading,
    sourcePlusQuery,
    sourcePlusImages,
    setSourcePlusQuery,
    handleSourcePlusClick,
  } = useSourcePlus(onClose);

  useEffect(() => {
    if (isOpen) {
      fetchAssets(1);
    }
  }, [isOpen, assetsRefreshTrigger, fetchAssets]);

  const handleAssetClick = async (asset: Asset) => {
    if (!asset) return;

    const fullSizeUrl = asset.url.replace("/thumbnails/", "/images/");

    try {
      const { width: originalWidth, height: originalHeight } =
        await getImageDimensions(fullSizeUrl);
      const aspectRatio = originalWidth / originalHeight;

      const success = await addNewShape(
        "image",
        {
          imageUrl: fullSizeUrl,
          originalWidth,
          originalHeight,
          aspectRatio,
          depthStrength: asset.depthStrength || 0.25,
          edgesStrength: asset.edgesStrength || 0.25,
          poseStrength: asset.poseStrength || 0.25,
          sketchStrength: asset.sketchStrength || 0.25,
          remixStrength: asset.remixStrength || 0.25,
        },
        fullSizeUrl,
        {
          animate: true,
          setSelected: true,
        }
      );

      if (success) {
        onClose();
      }
    } catch (error) {
      console.error("Failed to get image dimensions:", error);
    }
  };



  useEffect(() => {
    if (activeTab === "source-plus") {
      const randomTerm = randomSearchTerms[Math.floor(Math.random() * randomSearchTerms.length)];
      setSourcePlusQuery(randomTerm);
      }
  }, [activeTab, setSourcePlusQuery]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight * 1.5 && !loading && hasMore) {
      loadMore();
    }
  };

  return (
    <Drawer title="Assets" isOpen={isOpen} onClose={onClose} position="left">
      <div className="flex flex-col h-full overflow-hidden">
        <div className="flex-shrink-0 border-b border-gray-200 dark:border-[#404040]">
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
            Public Domain Images
          </button>
        </div>

        {activeTab === "source-plus" && (
          <div className="flex flex-col h-full overflow-hidden">
            <div className="flex-shrink-0 bg-white dark:bg-[#2c2c2c] p-4 border-b border-gray-200 dark:border-[#404040]">
              <div className="flex justify-end mb-2">
                <a
                  href="https://source.plus"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Visit Source.Plus <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className={styles.searchContainer}>
                <input
                  type="text"
                  value={sourcePlusQuery}
                  onChange={(e) => setSourcePlusQuery(e.target.value)}
                  placeholder="Search within collection..."
                  className={`${styles.searchInput} sourceplus-search-input`}
                />
                <Search className={styles.searchIcon} />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <ImageGrid
                images={
                  sourcePlusImages?.map((img: SourcePlusImage) => ({
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
                    (img: SourcePlusImage) => img.id === image.id
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
          </div>
        )}


{activeTab === "my-assets" && (
          <div className="flex flex-col h-full overflow-hidden">
            <div className="flex-shrink-0 bg-white dark:bg-[#2c2c2c] p-4 border-b border-gray-200 dark:border-[#404040]">
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
            </div>

            <div className="flex-1 overflow-y-auto" onScroll={handleScroll}>
              <ImageGrid
                images={mapAssetsToImageItems(assets)}
                loading={loading && assets.length === 0}
                emptyMessage="No uploaded assets yet"
                onImageClick={(image) =>
                  handleAssetClick(assets.find((a) => a.id === image.id)!)
                }
                onImageDelete={handleDeleteAsset}
              />
              {loading && assets.length > 0 && (
                <div className="py-4 flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </div>
              )}
              {!loading && hasMore && (
                <div className="py-4 flex justify-center">
                  <button
                    onClick={() => loadMore()}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200"
                  >
                    Load More
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
};