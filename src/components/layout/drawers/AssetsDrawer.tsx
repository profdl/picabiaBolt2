import React, { useEffect } from "react";
import { Upload, Loader2, Search } from "lucide-react";
import { useStore } from "../../../store";
import { Drawer } from "../../shared/Drawer";
import ImageGrid from "../../shared/ImageGrid";
import {
  supabase,
  convertToWebP,
  uploadAssetToSupabase,
} from "../../../lib/supabase";
import { Asset, Shape } from "../../../types";
import { useFileUpload } from "../../../hooks/useFileUpload";

export interface SourcePlusImage {
  id: string;
  url: string;
  thumbnail_url?: string;
  width?: number;
  height?: number;
  description?: string;
  author?: {
    name?: string;
    username?: string;
  };
}

interface AssetsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onAddShape: (shape: Shape) => void;
  getViewportCenter: () => { x: number; y: number };
  sourcePlusImages?: SourcePlusImage[];
}

export const AssetsDrawer: React.FC<AssetsDrawerProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = React.useState("my-assets");
  const [assets, setAssets] = React.useState<Asset[]>([]);
  const [loading, setLoading] = React.useState(false);
  const {
    addImageToCanvas,
    deleteAsset,
    assetsRefreshTrigger,
    sourcePlusLoading,
    sourcePlusQuery,
    sourcePlusImages,
    setSourcePlusQuery,
    triggerAssetsRefresh
  } = useStore((state) => ({
    addImageToCanvas: state.addImageToCanvas,
    deleteAsset: state.deleteAsset,
    assetsRefreshTrigger: state.assetsRefreshTrigger,
    sourcePlusImages: state.sourcePlusImages || [],
    sourcePlusLoading: state.sourcePlusLoading,
    sourcePlusQuery: state.sourcePlusQuery,
    setSourcePlusQuery: state.setSourcePlusQuery,
    triggerAssetsRefresh: state.triggerAssetsRefresh,
  }));

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("assets")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAssets(data || []);
    } catch (err) {
      console.error("Error fetching assets:", err);
    } finally {
      setLoading(false);
    }
  };

  const { fileInputRef, uploading, handleFileSelect } = useFileUpload(fetchAssets);

  useEffect(() => {
    if (isOpen) {
      fetchAssets();
    }
  }, [isOpen, assetsRefreshTrigger]);

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

  const handleSourcePlusClick = async (sourcePlusImage: SourcePlusImage) => {
    try {
        console.log('Fetching image through proxy:', sourcePlusImage.url);
        
        const thumbnailUrl = sourcePlusImage.thumbnail_url || sourcePlusImage.url;
        
        const proxyResponse = await fetch(
            `/.netlify/functions/sourceplus-proxy?url=${encodeURIComponent(thumbnailUrl)}`
        );
        
        if (!proxyResponse.ok) {
            const errorData = await proxyResponse.json();
            throw new Error(errorData.error || 'Failed to fetch image through proxy');
        }

        const { data: base64Data } = await proxyResponse.json();
        if (!base64Data) {
            throw new Error('No image data received from proxy');
        }

        const response = await fetch(base64Data);
        const blob = await response.blob();
        const file = new File([blob], "image.jpg", { type: blob.type });
        const webpBlob = await convertToWebP(file);
        const { publicUrl } = await uploadAssetToSupabase(webpBlob);

        const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                resolve({
                    width: img.naturalWidth,
                    height: img.naturalHeight
                });
            };
            img.onerror = () => reject(new Error('Failed to load image for dimensions'));
            img.src = URL.createObjectURL(webpBlob);
        });

        const success = await addImageToCanvas({
            url: publicUrl,
            width: dimensions.width,
            height: dimensions.height,
            depthStrength: 0.25,
            edgesStrength: 0.25,
            contentStrength: 0.25,
            poseStrength: 0.25,
            sketchStrength: 0.25,
            remixStrength: 0.25,
        });

        if (success) {
            triggerAssetsRefresh();
            onClose();
        }
    } catch (err) {
        console.error("Error processing Source.plus image:", err);
    }
  };

  const handleDeleteAsset = async (assetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const asset = assets.find((a) => a.id === assetId);
    if (asset) {
      await deleteAsset(assetId, asset.url);
      setAssets((prevAssets) => prevAssets.filter((a) => a.id !== assetId));
    }
  };

  const mapAssetsToImageItems = (assets: Asset[]) => {
    return assets.map((asset) => ({
      id: asset.id,
      url: asset.url,
      status: "completed" as const,
    }));
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