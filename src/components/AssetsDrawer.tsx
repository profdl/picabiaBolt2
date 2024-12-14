import React, { useRef, useEffect, useState } from "react";
import { Upload, Loader2, Search } from "lucide-react";
import { useStore } from "../store";
import { Drawer } from "./Drawer";
import ImageGrid from "./ui/ImageGrid";
import {
  supabase,
  convertToWebP,
  uploadAssetToSupabase,
} from "../lib/supabase";
import { Shape, ArenaBlock } from "../types";
import { ArenaGrid, ArenaChannel } from "./ArenaGrid";
import {
  DEFAULT_CONTROL_STRENGTHS,
  DEFAULT_CONTROL_STATES,
} from "../constants/shapeControlSettings";

interface Asset {
  id: string;
  url: string;
  created_at: string;
  user_id: string;
  width?: number;
  height?: number;
  depthStrength?: number;
  edgesStrength?: number;
  poseStrength?: number;
  scribbleStrength?: number;
  remixStrength?: number;
}

interface AssetsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onAddShape: (shape: Shape) => void;
  getViewportCenter: () => { x: number; y: number };
}

interface ArenaResults {
  channels: ArenaChannel[];
  blocks: ArenaBlock[];
}

export const AssetsDrawer: React.FC<AssetsDrawerProps> = ({
  isOpen,
  onClose,
}) => {
  const [fetchDefaultChannel] = useState<() => void>(() => () => {});
  const [onDefaultChannelLoad] = useState<() => void>(() => () => {
    if (!arenaQuery) {
      setArenaQuery("");
    }
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = React.useState("my-assets");
  const [assets, setAssets] = React.useState<Asset[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const searchDebounceRef = useRef<NodeJS.Timeout>();
  const [arenaQuery, setArenaQuery] = React.useState("");
  const [arenaResults, setArenaResults] = React.useState<ArenaResults>({
    channels: [],
    blocks: [],
  });
  const [arenaLoading, setArenaLoading] = React.useState(false);
  const { addShape, updateShape, deleteShape, zoom, offset } = useStore(
    (state) => ({
      addShape: state.addShape,
      updateShape: state.updateShape,
      deleteShape: state.deleteShape,
      zoom: state.zoom,
      offset: state.offset,
    })
  );
  const {
    addImageToCanvas,
    deleteAsset,
    assetsRefreshTrigger,
    unsplashQuery,
    setUnsplashQuery,
  } = useStore((state) => ({
    uploadAsset: state.uploadAsset,
    addImageToCanvas: state.addImageToCanvas,
    deleteAsset: state.deleteAsset,
    assetsRefreshTrigger: state.assetsRefreshTrigger,
    unsplashQuery: state.unsplashQuery,
    setUnsplashQuery: state.setUnsplashQuery,
  }));

  const { unsplashImages, unsplashLoading } = useStore((state) => ({
    unsplashImages: state.unsplashImages || [],
    unsplashLoading: state.unsplashLoading,
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

  useEffect(() => {
    if (isOpen) {
      fetchAssets();
    }
  }, [isOpen, assetsRefreshTrigger]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const webpBlob = await convertToWebP(file);
      const { publicUrl } = await uploadAssetToSupabase(webpBlob);

      // Add to local assets state and refresh
      const newAsset: Asset = {
        id: Math.random().toString(36).substr(2, 9),
        url: publicUrl,
        created_at: new Date().toISOString(),
        user_id: "",
      };

      setAssets((prev) => [newAsset, ...prev]);
      fetchAssets();
    } catch (err) {
      console.error("Error uploading asset:", err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleAssetClick = async (asset: Asset) => {
    const success = await addImageToCanvas({
      url: asset.url,
      width: asset.width,
      height: asset.height,
      depthStrength: 0.25,
      edgesStrength: 0.25,
      contentStrength: 0.25,
      poseStrength: 0.25,
      scribbleStrength: 0.25,
      remixStrength: 0.25,
    });
    if (success) {
      onClose();
    }
  };

  const handleArenaAssetClick = (block: ArenaBlock) => {
    if (block.image?.original?.url) {
      const img = new Image();
      const url = block.image.original.url;

      img.onload = async () => {
        const aspectRatio = img.naturalWidth / img.naturalHeight;

        // Fetch the image as a blob
        const response = await fetch(url);
        const blob = await response.blob();

        // Add placeholder shape immediately
        const tempId = Math.random().toString(36).substr(2, 9);
        let width = 300;
        let height = width / aspectRatio;

        if (height > 300) {
          height = 300;
          width = height * aspectRatio;
        }

        addShape({
          id: tempId,
          type: "image",
          position: getViewportCenter(),
          width,
          height,
          aspectRatio,
          color: "transparent",
          imageUrl: url,
          rotation: 0,
          isUploading: true,
          model: "",
          useSettings: false,
          isEditing: false,
          ...DEFAULT_CONTROL_STRENGTHS,
          ...DEFAULT_CONTROL_STATES,
        });

        try {
          const { publicUrl } = await uploadAssetToSupabase(blob);

          // Update the shape with the final uploaded image URL
          updateShape(tempId, {
            imageUrl: publicUrl,
            isUploading: false,
          });

          fetchAssets();
          onClose();
        } catch (err) {
          console.error("Error processing Arena image:", err);
          deleteShape(tempId);
        }
      };

      img.src = url;
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

  //Arena API
  const getViewportCenter = () => {
    const rect = document.querySelector("#root")?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };

    return {
      x: (rect.width / 2 - offset.x) / zoom,
      y: (rect.height / 2 - offset.y) / zoom,
    };
  };

  useEffect(() => {
    if (!arenaQuery.trim()) {
      setArenaResults({ channels: [], blocks: [] });
      return;
    }

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    searchDebounceRef.current = setTimeout(async () => {
      setArenaLoading(true);
      try {
        console.log("Fetching Arena results for query:", arenaQuery);
        const response = await fetch(
          `/.netlify/functions/arena-search?query=${encodeURIComponent(
            arenaQuery
          )}`
        );
        const data = await response.json();
        console.log("Arena response data:", data); // Debug log

        setArenaResults(data); // Make sure we're setting the full data object
      } catch (error) {
        console.error("Are.na search error:", error);
        setArenaResults({ channels: [], blocks: [] });
      } finally {
        setArenaLoading(false);
      }
    }, 800);

    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [arenaQuery]);

  // Unsplash search
  useEffect(() => {
    if (!unsplashQuery.trim()) {
      useStore.setState({ unsplashImages: [] });
      return;
    }

    // Clear previous timeout
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    // Set new timeout
    searchDebounceRef.current = setTimeout(async () => {
      useStore.setState({ unsplashLoading: true });
      try {
        const response = await fetch(
          `/.netlify/functions/unsplash-search?query=${encodeURIComponent(
            unsplashQuery
          )}`
        );
        const data = await response.json();
        useStore.setState({
          unsplashImages: data.results,
          unsplashLoading: false,
        });
      } catch (error) {
        console.error("Unsplash search error:", error);
        useStore.setState({
          unsplashImages: [],
          unsplashLoading: false,
        });
      }
    }, 800); // Increased debounce time

    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [unsplashQuery]);

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
            onClick={() => {
              setActiveTab("arena");
              if (!arenaQuery) {
                setArenaQuery("");
                onDefaultChannelLoad();
              }
            }}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              activeTab === "arena"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Are.na
          </button>

          <button
            onClick={() => setActiveTab("stock")}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              activeTab === "stock"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Stock Images
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
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
          {activeTab === "arena" && (
            <div className="p-4">
              <div className="relative mb-3">
                <input
                  type="text"
                  value={arenaQuery}
                  onChange={(e) => setArenaQuery(e.target.value)}
                  placeholder="Search Are.na..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              </div>

              <ArenaGrid
                results={arenaResults}
                loading={arenaLoading}
                onSelect={handleArenaAssetClick}
                defaultChannelSlug="daniel-lefcourt/terraform"
              />
            </div>
          )}

          {activeTab === "stock" && (
            <div className="p-4">
              <div className="relative mb-3">
                <input
                  type="text"
                  value={unsplashQuery}
                  onChange={(e) => setUnsplashQuery(e.target.value)}
                  placeholder="Search images..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              </div>
              <ImageGrid
                images={
                  unsplashImages?.map((img) => ({
                    id: img.id,
                    url: img.urls.regular,
                    thumbnailUrl: img.urls.thumb,
                    alt: img.alt_description || "Unsplash image",
                    status: "completed" as const,
                  })) || []
                }
                loading={unsplashLoading}
                emptyMessage="Search for images to get started"
                onImageClick={(image) => {
                  const unsplashImage = unsplashImages.find(
                    (img) => img.id === image.id
                  );
                  if (unsplashImage) {
                    handleAssetClick({
                      id: unsplashImage.id,
                      url: unsplashImage.urls.regular,
                      created_at: new Date().toISOString(),
                      user_id: "",
                      width: unsplashImage.width,
                      height: unsplashImage.height,
                    });
                  }
                }}
                onImageDelete={() => {}}
                showViewButton={false}
                imageUrlKey="thumbnailUrl"
              />
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
};
