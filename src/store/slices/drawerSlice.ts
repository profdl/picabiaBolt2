import { StateCreator } from "zustand";
import { getImageDimensions } from "../../utils/image";
import { supabase } from "../../lib/supabase/client";
import { Shape } from "../../types";
interface Position {
  x: number;
  y: number;
}
export interface SavedImage {
  id: string;
  generated_01: string;
  prompt: string;
  created_at: string;
  status: "generating" | "completed" | "failed";
  aspect_ratio: string;
}

interface CanvasState {
  shapes: Shape[];
  setOffset: (offset: Position) => void;
  addShape: (shape: Shape) => void;
  centerOnShape: (shapeId: string) => void; // Add this
}
interface UnsplashImage {
  id: string;
  urls: {
    regular: string;
    thumb: string;
  };
  alt_description: string;
  user: {
    name: string;
    username: string;
  };
  width: number;
  height: number;
}
export interface DrawerState {
  // Drawer visibility states
  activeDrawer: "none" | "assets" | "gallery" | "imageGenerate" | "unsplash";

  // Gallery states
  galleryRefreshCounter: number;
  selectedGalleryImage: SavedImage | null;
  generatedImages: SavedImage[];
  isGenerating: boolean;

  // Asset states
  assetsRefreshTrigger: number;
  uploadingAssets: string[];

  // Unsplash states
  unsplashQuery: string;
  unsplashImages: UnsplashImage[];
  unsplashLoading: boolean;

  zoom: number;
  offset: Position;
  isLoading: boolean;
  shapes: Shape[];
}
export interface DrawerSlice {
  activeDrawer: "none" | "assets" | "gallery" | "imageGenerate" | "unsplash";
  galleryRefreshCounter: number;
  selectedGalleryImage: SavedImage | null;
  generatedImages: SavedImage[];
  isGenerating: boolean;
  assetsRefreshTrigger: number;
  uploadingAssets: string[];
  unsplashQuery: string;
  unsplashImages: UnsplashImage[];
  unsplashLoading: boolean;
  isLoading: boolean;
  // Actions - Drawer visibility
  openDrawer: (drawer: DrawerState["activeDrawer"]) => void;
  closeDrawer: () => void;

  // Actions - Gallery
  refreshGallery: () => void;
  setSelectedGalleryImage: (image: SavedImage | null) => void;
  fetchGeneratedImages: () => Promise<void>;
  deleteGeneratedImage: (imageId: string) => Promise<boolean>;
  setIsGenerating: (isGenerating: boolean) => void;

  // Actions - Assets
  triggerAssetsRefresh: () => void;
  addUploadingAsset: (id: string) => void;
  removeUploadingAsset: (id: string) => void;
  uploadAsset: (file: File) => Promise<boolean>;
  deleteAsset: (assetId: string, url: string) => Promise<boolean>;

  // Actions - Unsplash
  setUnsplashQuery: (query: string) => void;
  searchUnsplashImages: (query: string) => Promise<void>;

  addImageToCanvas: (
    imageSource: {
      url: string;
      width?: number;
      height?: number;
      depthStrength?: number;
      edgesStrength?: number;
      contentStrength?: number;
      poseStrength?: number;
      scribbleStrength?: number;
      remixStrength?: number;
    },
    options?: { defaultWidth?: number; position?: Position }
  ) => Promise<boolean>;
}
const findRightmostBoundary = (shapes: Shape[]): number => {
  if (shapes.length === 0) return 0;
  return Math.max(...shapes.map((shape) => shape.position.x + shape.width));
};
const findOpenSpace = (
  shapes: Shape[],
  width: number,
  height: number,
  center: Position
): Position => {
  const PADDING = 20;
  const rightBoundary = findRightmostBoundary(shapes);

  return {
    x: rightBoundary + PADDING,
    y: center.y - height / 2,
  };
};

export const drawerSlice: StateCreator<
  DrawerState & DrawerSlice & CanvasState,
  [],
  [],
  DrawerSlice & Partial<CanvasState>
> = (set, get: () => DrawerState & DrawerSlice & CanvasState) => ({
  // Initial states
  activeDrawer: "none",
  galleryRefreshCounter: 0,
  selectedGalleryImage: null,
  generatedImages: [],
  isGenerating: false,
  assetsRefreshTrigger: 0,
  uploadingAssets: [],
  unsplashQuery: "",
  unsplashImages: [],
  unsplashLoading: false,
  isLoading: false,

  // Drawer visibility actions
  openDrawer: (drawer) => set({ activeDrawer: drawer }),
  closeDrawer: () => set({ activeDrawer: "none" }),

  // Gallery actions
  refreshGallery: () =>
    set((state) => ({
      galleryRefreshCounter: state.galleryRefreshCounter + 1,
    })),

  setSelectedGalleryImage: (image) => set({ selectedGalleryImage: image }),

  fetchGeneratedImages: async () => {
    try {
      set({ isLoading: true }); // Set loading true before fetch
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("generated_images")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      set({ generatedImages: data || [] });
    } catch (err) {
      console.error("Error fetching generated images:", err);
    } finally {
      set({ isLoading: false }); // Set loading false after fetch
    }
  },

  deleteGeneratedImage: async (imageId: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return false;

      const imageToDelete = get().generatedImages.find(
        (img) => img.id === imageId
      );
      if (!imageToDelete) return false;

      const filename = imageToDelete.generated_01.split("/").pop();
      if (filename) {
        await supabase.storage.from("generated-images").remove([filename]);
      }

      const { error } = await supabase
        .from("generated_images")
        .delete()
        .eq("id", imageId)
        .eq("user_id", user.id);

      if (error) throw error;

      set((state) => ({
        generatedImages: state.generatedImages.filter(
          (img) => img.id !== imageId
        ),
      }));

      return true;
    } catch (err) {
      console.error("Error deleting generated image:", err);
      return false;
    }
  },

  setIsGenerating: (isGenerating) => set({ isGenerating }),

  refreshGalleryOnWebhook: () => {
    const { fetchGeneratedImages } = get();
    fetchGeneratedImages();
  },

  // Asset actions
  triggerAssetsRefresh: () =>
    set((state) => ({
      assetsRefreshTrigger: state.assetsRefreshTrigger + 1,
    })),

  addUploadingAsset: (id) =>
    set((state) => ({
      uploadingAssets: [...state.uploadingAssets, id],
    })),

  removeUploadingAsset: (id) =>
    set((state) => ({
      uploadingAssets: state.uploadingAssets.filter(
        (assetId) => assetId !== id
      ),
    })),

  uploadAsset: async (file: File) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return false;

      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;

      const arrayBuffer = await file.arrayBuffer();
      const fileData = new Uint8Array(arrayBuffer);

      const { error: uploadError } = await supabase.storage
        .from("assets")
        .upload(fileName, fileData, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("assets").getPublicUrl(fileName);

      const { error: dbError } = await supabase.from("assets").insert([
        {
          url: publicUrl,
          user_id: user.id,
        },
      ]);

      if (dbError) throw dbError;

      get().triggerAssetsRefresh();
      return true;
    } catch (err) {
      console.error("Error uploading asset:", err);
      return false;
    }
  },

  deleteAsset: async (assetId: string, url: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return false;

      const fileName = url.split("/").pop();
      if (fileName) {
        await supabase.storage.from("assets").remove([fileName]);
      }

      const { error } = await supabase
        .from("assets")
        .delete()
        .eq("id", assetId)
        .eq("user_id", user.id);

      if (error) throw error;

      get().triggerAssetsRefresh();
      return true;
    } catch (err) {
      console.error("Error deleting asset:", err);
      return false;
    }
  },

  setUnsplashQuery: (query: string) => {
    set({ unsplashQuery: query });
    if (query) {
      get().searchUnsplashImages(query);
    }
  },

  searchUnsplashImages: async (query: string) => {
    set({ unsplashLoading: true });
    try {
      const response = await fetch(
        `/.netlify/functions/unsplash-search?query = ${encodeURIComponent(
          query
        )}`
      );
      const data = await response.json();
      set({ unsplashImages: data.results });
    } catch (error) {
      console.error("Unsplash search error:", error);
      set({ unsplashImages: [] });
    } finally {
      set({ unsplashLoading: false });
    }
  },

  addImageToCanvas: async (imageSource, options = {}) => {
    const { zoom, offset, addShape, shapes } = get();
    const defaultWidth = options.defaultWidth || 300;

    try {
      let dimensions;
      if (imageSource.width && imageSource.height) {
        dimensions = {
          width: imageSource.width,
          height: imageSource.height,
        };
      } else {
        dimensions = await getImageDimensions(imageSource.url);
      }

      const aspectRatio = dimensions.width / dimensions.height;
      const width = defaultWidth;
      const height = width / aspectRatio;

      const position =
        options.position ||
        findOpenSpace(shapes, width, height, {
          x: (window.innerWidth / 2 - offset.x) / zoom,
          y: (window.innerHeight / 2 - offset.y) / zoom,
        });

      const shapeId = Math.random().toString(36).substr(2, 9);
      addShape({
        id: shapeId,
        type: "image",
        position,
        width,
        height,
        color: "transparent",
        imageUrl: imageSource.url,
        originalWidth: dimensions.width,
        originalHeight: dimensions.height,
        aspectRatio,
        rotation: 0,
        isUploading: false,
        model: "",
        useSettings: false,
        isEditing: false,
        depthStrength: 0.75,
        edgesStrength: 0.75,
        contentStrength: 0.5,
        poseStrength: 0.75,
        scribbleStrength: 0.5,
        remixStrength: 0.5,
      });

      if (get().centerOnShape) {
        get().centerOnShape(shapeId);
      }
      return true;
    } catch (err) {
      console.error("Error adding image:", err);
      return false;
    }
  },
});
